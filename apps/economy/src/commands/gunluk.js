import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { EconomyUI } from "../services/EconomyUI.js";

export default {
  name: "günlük",
  aliases: ["gunluk", "daily"],
  async execute({ message }) {
    let profile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!profile) {
      profile = await Economy.create({ guildId: message.guild.id, userId: message.author.id });
    }

    const cooldownMs = 24 * 60 * 60 * 1000;
    if (profile.lastDaily && Date.now() - profile.lastDaily.getTime() < cooldownMs) {
      const remainingMs = cooldownMs - (Date.now() - profile.lastDaily.getTime());
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return message.reply(MessageFormatter.warn("Bekleme Süresi", `Günlük ödülünüzü zaten aldınız. Tekrar almak için **${remainingHours} saat** beklemelisiniz.`));
    }

    const reward = 250;
    profile.wallet += reward;
    profile.lastDaily = new Date();
    await profile.save();

    const payload = EconomyUI.formatDailySuccessPayload({
      targetUser: message.author,
      reward,
      balance: profile.wallet
    });

    return message.reply(payload);
  }
};
