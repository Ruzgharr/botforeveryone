import { Economy } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "günlük",
  aliases: ["gunluk", "daily"],
  async execute({ message, config }) {
    let profile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!profile) {
      profile = await Economy.create({ guildId: message.guild.id, userId: message.author.id });
    }

    const cooldownMs = 24 * 60 * 60 * 1000;
    if (profile.lastDaily && Date.now() - profile.lastDaily.getTime() < cooldownMs) {
      const remainingMs = cooldownMs - (Date.now() - profile.lastDaily.getTime());
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return message.reply({
        embeds: [Embeds.warn("Bekleme Süresi", `Günlük ödülünüzü zaten aldınız. Tekrar almak için **${remainingHours} saat** beklemelisiniz.`, message.guild)]
      });
    }

    const reward = 250;
    profile.wallet += reward;
    profile.lastDaily = new Date();
    await profile.save();

    const payload = MessageFormatter.render("dailyReward", {
      user: message.author,
      amount: reward,
      title: "Günlük Ödül"
    }, config, message.guild);

    message.reply(payload);
  }
};
