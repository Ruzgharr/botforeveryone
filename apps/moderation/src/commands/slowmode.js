import { MessageFormatter } from "@bot/core";
import { ModerationUI } from "../services/ModerationUI.js";

export default {
  name: "slowmode",
  aliases: ["yavasmod", "yavaşmod"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const currentRate = message.channel.rateLimitPerUser || 0;

    if (!args[0]) {
      const payload = MessageFormatter.info("Yavaş Mod Kontrolü", `Mevcut yavaş mod: **${currentRate} saniye**\nAşağıdaki butonları kullanarak yavaş modu hızlıca değiştirebilirsiniz.`);
      payload.components = [ModerationUI.buildSlowmodeActionRow(currentRate)];
      return message.reply(payload);
    }

    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.reply(MessageFormatter.warn("Hatalı Süre", "Lütfen 0 ile 21600 arasında geçerli bir saniye belirtin. Örnek: `.slowmode 5` (Kapatmak için 0)"));
    }

    await message.channel.setRateLimitPerUser(seconds).catch(() => null);

    const payload = seconds === 0
      ? MessageFormatter.success("Yavaş Mod Kapatıldı", "Bu kanal için yavaş mod süresi kaldırıldı.")
      : MessageFormatter.success("Yavaş Mod Ayarlandı", `Bu kanal için kullanıcı başına bekleme süresi **${seconds} saniye** olarak ayarlandı.`);

    payload.components = [ModerationUI.buildSlowmodeActionRow(seconds)];
    message.reply(payload);
  }
};
