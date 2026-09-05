import { Economy } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "rulet",
  aliases: ["roulette"],
  async execute({ message, args, config }) {
    const color = args[0]?.toLowerCase();
    const bet = parseInt(args[1], 10);

    const validColors = ["kırmızı", "kirmizi", "siyah", "yeşil", "yesil", "red", "black", "green"];
    if (!validColors.includes(color) || isNaN(bet) || bet <= 0) {
      return message.reply({
        embeds: [
          Embeds.warn(
            "Format Hatası",
            `Formatı kullanın: \`.rulet [kırmızı/siyah/yeşil] [miktar]\`\nÖrnek: \`.rulet kırmızı 50\``,
            message.guild
          )
        ]
      });
    }

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!profile || profile.wallet < bet) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Cüzdanınızda yeterli para yok. (Mevcut: ${profile?.wallet || 0} Coin)`, message.guild)] });
    }

    const random = Math.floor(Math.random() * 37);
    let resultColor = "";
    if (random === 0) {
      resultColor = "yeşil";
    } else if (random % 2 === 0) {
      resultColor = "siyah";
    } else {
      resultColor = "kırmızı";
    }

    const normalizedChoice = (color === "red" || color === "kirmizi" || color === "kırmızı") ? "kırmızı" : (color === "black" || color === "siyah") ? "siyah" : "yeşil";

    if (normalizedChoice === resultColor) {
      const multiplier = resultColor === "yeşil" ? 14 : 2;
      const winAmount = bet * multiplier;
      profile.wallet += winAmount - bet;
      await profile.save();

      const payload = MessageFormatter.render("ruletWin", {
        color: resultColor.toUpperCase(),
        number: random,
        amount: winAmount,
        balance: profile.wallet,
        title: "Rulet - Kazandınız!"
      }, config, message.guild);

      message.reply(payload);
    } else {
      profile.wallet -= bet;
      await profile.save();

      const payload = MessageFormatter.render("ruletLose", {
        color: resultColor.toUpperCase(),
        number: random,
        amount: bet,
        balance: profile.wallet,
        title: "Rulet - Kaybettiniz"
      }, config, message.guild);

      message.reply(payload);
    }
  }
};
