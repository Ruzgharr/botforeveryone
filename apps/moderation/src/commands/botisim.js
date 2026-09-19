import { PermissionFlagsBits } from "discord.js";
import { MessageFormatter, BotNameManager } from "@bot/core";

export default {
  name: "botisim",
  aliases: ["botnick", "botadi", "setbotname", "botname"],
  async execute({ client, message, args, config }) {
    const isOwner = message.guild.ownerId === message.author.id;
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu yalnızca sunucu sahibi ve yöneticiler kullanabilir."));
    }

    if (!args[0]) {
      return message.reply(MessageFormatter.warn(
        "Hatalı Kullanım",
        "Kullanım:\n▫️ `.botisim <yeni-isim>` : Bu botun ismini değiştirir.\n▫️ `.botisim <servis> <yeni-isim>` : Belirtilen botun ismini değiştirir.\n\nServisler: `moderasyon`, `kayit`, `stat`, `koruma`, `ekonomi`, `yardim`, `ses`"
      ));
    }

    const serviceAliases = {
      moderasyon: "MODERATION",
      moderation: "MODERATION",
      kayit: "REGISTER",
      register: "REGISTER",
      stat: "STATS",
      stats: "STATS",
      koruma: "GUARD_MAIN",
      guard: "GUARD_MAIN",
      dagitici: "GUARD_DISTRIBUTOR",
      distributor: "GUARD_DISTRIBUTOR",
      ekonomi: "ECONOMY",
      economy: "ECONOMY",
      yardim: "UTILITY",
      utility: "UTILITY",
      ses: "VOICE_WELCOME",
      welcome: "VOICE_WELCOME"
    };

    let targetService = client.serviceName || "MODERATION";
    let newName = "";

    const firstArgLower = args[0].toLowerCase();
    if (serviceAliases[firstArgLower]) {
      targetService = serviceAliases[firstArgLower];
      newName = args.slice(1).join(" ").trim();
    } else {
      newName = args.join(" ").trim();
    }

    if (!newName) {
      return message.reply(MessageFormatter.error("Eksik Parametre", "Lütfen bot için yeni bir isim belirtin. (2 - 32 karakter)"));
    }

    if (newName.length < 2 || newName.length > 32) {
      return message.reply(MessageFormatter.error("Geçersiz İsim", "Bot ismi 2 ile 32 karakter arasında olmalıdır."));
    }

    const waitMsg = await message.reply("⏳ Bot ismi güncelleniyor, lütfen bekleyin...");

    const result = await BotNameManager.updateBotName({
      serviceKey: targetService,
      newName,
      guildId: message.guild.id
    });

    if (!result.success) {
      return waitMsg.edit(MessageFormatter.error("İşlem Başarısız", result.error || "İsim güncellenirken bir hata oluştu."));
    }

    const globalStatusText = result.globalUpdated
      ? "✅ Discord kullanıcı adı başarıyla güncellendi."
      : `⚠️ ${result.globalError || "Discord saatlik limitine takıldı (Sunucu takma adı güncellendi)."}`;

    const nickStatusText = result.nicknameUpdated
      ? "✅ Sunucu içi takma ad güncellendi."
      : "ℹ️ Sunucu takma adı korundu.";

    const payload = MessageFormatter.v2(
      `🤖 **Bot İsmi Başarıyla Güncellendi**\n\n▫️ **Hedef Servis:** \`${targetService}\`\n▫️ **Yeni İsim:** **${newName}**\n▫️ **Global Discord:** ${globalStatusText}\n▫️ **Sunucu Görünümü:** ${nickStatusText}\n▫️ **Panel Senkronizasyonu:** ✅ Veritabanına işlendi`
    );

    await waitMsg.edit(payload);
  }
};
