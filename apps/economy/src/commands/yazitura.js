import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "yazitura",
  aliases: ["yt", "cf", "coinflip"],
  async execute({ client, message, args, config }) {
    const bet = parseInt(args[0], 10);
    const choice = (args[1] || "").toLowerCase();

    if (!bet || bet <= 0 || !["yazi", "yazı", "tura"].includes(choice)) {
      return message.reply({ embeds: [Embeds.warn("Hatalı Kullanım", "Lütfen bahis miktarını ve tahmininizi belirtin. Örnek: `.yazitura 100 yazı` veya `.yt 50 tura`", message.guild)] });
    }

    const userEco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!userEco || (userEco.wallet || 0) < bet) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Cüzdanınızda yeterli bakiye bulunmuyor. Mevcut cüzdanınız: **${userEco?.wallet || 0} Coin**`, message.guild)] });
    }

    const coinSide = Math.random() < 0.5 ? "yazi" : "tura";
    const userGuess = (choice === "yazı" || choice === "yazi") ? "yazi" : "tura";
    const sideLabel = coinSide === "yazi" ? "YAZI" : "TURA";

    if (userGuess === coinSide) {
      await Economy.updateOne({ _id: userEco._id }, { $inc: { wallet: bet } });
      const newBalance = (userEco.wallet || 0) + bet;

      message.reply({
        embeds: [
          Embeds.success(
            "Kazandınız!",
            `🪙 Madeni para havaya atıldı ve **${sideLabel}** geldi!\nTebrikler, bahsi kazanarak **+${bet} Coin** kazandınız.\nYeni Cüzdan Bakiyesi: **${newBalance} Coin**`,
            message.guild
          )
        ]
      });
    } else {
      await Economy.updateOne({ _id: userEco._id }, { $inc: { wallet: -bet } });
      const newBalance = (userEco.wallet || 0) - bet;

      message.reply({
        embeds: [
          Embeds.error(
            "Kaybettiniz!",
            `🪙 Madeni para havaya atıldı ve **${sideLabel}** geldi.\nMaalesef tahmininiz tutmadı ve **${bet} Coin** kaybettiniz.\nYeni Cüzdan Bakiyesi: **${newBalance} Coin**`,
            message.guild
          )
        ]
      });
    }
  }
};
