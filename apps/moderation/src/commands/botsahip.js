import { PermissionFlagsBits } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { GuildConfig } from "@bot/database";

export default {
  name: "botsahip",
  aliases: ["sahip", "owner", "botowner"],
  async execute({ client, message, args, config }) {
    const isGuildOwner = message.guild.ownerId === message.author.id;
    const isCurrentBotOwner = client.isBotOwner(message.author.id, config);
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    const ownersList = Array.isArray(config.botOwners) ? config.botOwners : [];

    if (!isGuildOwner && !isCurrentBotOwner && (!isAdmin || ownersList.length > 0)) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu yalnızca Sunucu Sahibi veya mevcut bir Bot Sahibi kullanabilir."));
    }

    const action = (args[0] || "liste").toLowerCase();

    if (action === "liste") {
      if (ownersList.length === 0) {
        return message.reply(MessageFormatter.v2(
          "👑 **Bot Sahipleri Listesi**\n\nHenüz tanımlanmış bir bot sahibi bulunmuyor.\n▫️ Sahip eklemek için: `.botsahip ekle @kullanici` veya `.botsahip ben`"
        ));
      }

      const rows = ownersList.map((id, index) => `${index + 1}. <@${id}> \`(${id})\``).join("\n");
      return message.reply(MessageFormatter.v2(
        `👑 **Yetkili Bot Sahipleri (${ownersList.length})**\n\n${rows}\n\n▫️ Eklemek için: \`.botsahip ekle @kullanici\`\n▫️ Çıkarmak için: \`.botsahip cikar @kullanici\``
      ));
    }

    if (action === "ben") {
      if (ownersList.includes(message.author.id)) {
        return message.reply(MessageFormatter.warn("Zaten Sahipsiniz", "Zaten yetkili bot sahibi listesinde yer alıyorsunuz."));
      }

      const updatedList = [...ownersList, message.author.id];
      await GuildConfig.findOneAndUpdate(
        { guildId: message.guild.id },
        { $set: { botOwners: updatedList } },
        { upsert: true }
      );
      config.botOwners = updatedList;

      return message.reply(MessageFormatter.v2(
        `👑 **Tebrikler!** <@${message.author.id}> başarıyla **Bot Sahibi** olarak atandı.\n▫️ Tüm bot komutları ve sistem yetkileri tam erişiminize açıldı.`
      ));
    }

    if (action === "ekle") {
      const targetUser = message.mentions.users.first() || (args[1] ? await client.users.fetch(args[1]).catch(() => null) : null);
      if (!targetUser) {
        return message.reply(MessageFormatter.error("Eksik Parametre", "Lütfen sahip olarak eklenecek kullanıcıyı etiketleyin veya ID'sini girin.\nÖrnek: `.botsahip ekle @kullanici`"));
      }

      if (ownersList.includes(targetUser.id)) {
        return message.reply(MessageFormatter.warn("Zaten Ekli", `<@${targetUser.id}> zaten bot sahibi listesinde mevcut.`));
      }

      const updatedList = [...ownersList, targetUser.id];
      await GuildConfig.findOneAndUpdate(
        { guildId: message.guild.id },
        { $set: { botOwners: updatedList } },
        { upsert: true }
      );
      config.botOwners = updatedList;

      return message.reply(MessageFormatter.v2(
        `👑 **Yeni Bot Sahibi Eklendi**\n\n▫️ **Kullanıcı:** <@${targetUser.id}> \`(${targetUser.id})\`\n▫️ **İşlemi Yapan:** <@${message.author.id}>\n▫️ Bot üzerindeki tüm komut kısıtlamaları ve yetki kontrolleri bu kullanıcı için kaldırıldı.`
      ));
    }

    if (action === "cikar" || action === "sil") {
      const targetUser = message.mentions.users.first() || (args[1] ? await client.users.fetch(args[1]).catch(() => null) : null);
      if (!targetUser) {
        return message.reply(MessageFormatter.error("Eksik Parametre", "Lütfen çıkarılacak kullanıcıyı etiketleyin veya ID'sini girin.\nÖrnek: `.botsahip cikar @kullanici`"));
      }

      if (!ownersList.includes(targetUser.id)) {
        return message.reply(MessageFormatter.warn("Listede Yok", `<@${targetUser.id}> bot sahibi listesinde bulunmuyor.`));
      }

      const updatedList = ownersList.filter((id) => id !== targetUser.id);
      await GuildConfig.findOneAndUpdate(
        { guildId: message.guild.id },
        { $set: { botOwners: updatedList } },
        { upsert: true }
      );
      config.botOwners = updatedList;

      return message.reply(MessageFormatter.v2(
        `🗑️ **Bot Sahibi Çıkarıldı**\n\n▫️ **Kullanıcı:** <@${targetUser.id}> \`(${targetUser.id})\`\n▫️ **Kalan Sahip Sayısı:** ${updatedList.length}`
      ));
    }

    return message.reply(MessageFormatter.warn(
      "Hatalı Kullanım",
      "Kullanım Biçimleri:\n▫️ `.botsahip liste` : Mevcut sahipleri gösterir\n▫️ `.botsahip ben` : Kendinizi sahip olarak atar\n▫️ `.botsahip ekle @kullanici` : Yeni sahip ekler\n▫️ `.botsahip cikar @kullanici` : Sahibi listeden çıkarır"
    ));
  }
};
