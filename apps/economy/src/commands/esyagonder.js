import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { getItemByKey } from "../services/ItemMarketCatalog.js";

export default {
  name: "esyagonder",
  aliases: ["esya-ver", "eşya-ver", "esyaver", "eşyaver", "hediye", "gift", "esyayolla"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] && /^\d+$/.test(args[0]) ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser || targetUser.bot || targetUser.id === message.author.id) {
      return message.reply(MessageFormatter.warn(
        "Geçersiz Kullanıcı",
        "Lütfen eşya göndermek istediğiniz geçerli bir kullanıcıyı etiketleyin.\n\n▫️ Örnek: `.esya-ver @kullanici item_olta` veya `.hediye @kullanici enerji`"
      ));
    }

    const rawKey = (args[1] || args[0] || "").toLowerCase().trim();
    const cleanKey = rawKey.startsWith("<@") ? (args[1] || "").toLowerCase().trim() : rawKey;
    if (!cleanKey) {
      return message.reply(MessageFormatter.warn(
        "Eksik Eşya Kodu",
        "Lütfen hediye etmek istediğiniz eşyanın kodunu belirtin.\n\n▫️ Örnek: `.esya-ver @kullanici item_kalkan`"
      ));
    }

    const itemKey = cleanKey.startsWith("item_") ? cleanKey : `item_${cleanKey}`;
    const marketItem = getItemByKey(itemKey, config);
    if (!marketItem) {
      return message.reply(MessageFormatter.error("Geçersiz Eşya", "Belirtilen kodda transfer edilebilir bir pazar eşyası bulunamadı."));
    }

    let senderEco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!senderEco || !Array.isArray(senderEco.inventory) || senderEco.inventory.length === 0) {
      return message.reply(MessageFormatter.warn("Boş Envanter", "Envanterinizde transfer edilebilecek eşya bulunmuyor."));
    }

    const itemIndex = senderEco.inventory.findIndex((i) => i.itemId === itemKey);
    if (itemIndex === -1) {
      return message.reply(MessageFormatter.warn(
        "Eşya Sizde Yok",
        `Envanterinizde hediye etmek için **${marketItem.name}** bulunmuyor.`
      ));
    }

    let targetEco = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!targetEco) {
      targetEco = await Economy.create({ guildId: message.guild.id, userId: targetUser.id, wallet: 100, bank: 0 });
    }

    const targetInventory = targetEco.inventory || [];
    const isTargetAlreadyOwned = targetInventory.some((i) => i.itemId === itemKey);
    if (isTargetAlreadyOwned && marketItem.type !== "CONSUMABLE" && marketItem.type !== "TICKET") {
      return message.reply(MessageFormatter.warn(
        "Hedef Zaten Sahip",
        `<@${targetUser.id}> zaten **${marketItem.name}** eşyasına sahip. İkinci bir kopya verilemez.`
      ));
    }

    const transferredItem = senderEco.inventory.splice(itemIndex, 1)[0];
    senderEco.markModified("inventory");
    await senderEco.save();

    if (!Array.isArray(targetEco.inventory)) targetEco.inventory = [];
    targetEco.inventory.push({
      itemId: marketItem.itemKey,
      name: marketItem.name,
      type: marketItem.type,
      purchasedAt: new Date()
    });
    targetEco.markModified("inventory");
    await targetEco.save();

    return message.reply(MessageFormatter.v2(
      `🎁 **Eşya Hediyesi Gönderildi!**\n\n▫️ **Gönderen:** <@${message.author.id}>\n▫️ **Alıcı:** <@${targetUser.id}>\n▫️ **Hediye Eşya:** ${marketItem.emoji} **${marketItem.name}**\n▫️ **Eşya Açıklaması:** *${marketItem.description}*\n-# 🎀 Güvenli Hediye Transferi : Eşya başarıyla yeni sahibine teslim edildi`
    ));
  }
};
