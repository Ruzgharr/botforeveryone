import { Embeds } from "@bot/core";

export default {
  name: "slowmode",
  aliases: ["yavasmod", "yavaşmod"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply({ embeds: [Embeds.warn("Hatalı Süre", "Lütfen 0 ile 21600 arasında geçerli bir saniye belirtin. Örnek: `.slowmode 5` (Kapatmak için 0)", message.guild)] });
    }

    await message.channel.setRateLimitPerUser(seconds).catch(() => null);

    if (seconds === 0) {
      message.reply({ embeds: [Embeds.success("Yavaş Mod Kapatıldı", "Bu kanal için yavaş mod süresi kaldırıldı.", message.guild)] });
    } else {
      message.reply({ embeds: [Embeds.success("Yavaş Mod Ayarlandı", `Bu kanal için kullanıcı başına bekleme süresi **${seconds} saniye** olarak ayarlandı.`, message.guild)] });
    }
  }
};
