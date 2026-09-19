import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "yazitura",
  aliases: ["yt", "cf", "coinflip"],
  async execute({ client, message, args, config }) {
    const bet = parseInt(args[0], 10);
    const choice = (args[1] || "").toLowerCase();

    if (!bet || bet <= 0 || !["yazi", "yazı", "tura"].includes(choice)) {
      return message.reply(MessageFormatter.warn(
        "Hatalı Kullanım",
        `Lütfen bahis miktarını ve tahmininizi belirtin.\n\n▫️ Örnek: \`${config.prefix || "."}yazitura 100 yazı\` veya \`${config.prefix || "."}yt 50 tura\``
      ));
    }

    const userEco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!userEco || (userEco.wallet || 0) < bet) {
      return message.reply(MessageFormatter.error(
        "Yetersiz Bakiye",
        `Cüzdanınızda yeterli bakiye bulunmuyor.\n\n▫️ Mevcut Cüzdan: **${(userEco?.wallet || 0).toLocaleString("tr-TR")} Coin**`
      ));
    }

    const coinSide = Math.random() < 0.5 ? "yazi" : "tura";
    const userGuess = (choice === "yazı" || choice === "yazi") ? "yazi" : "tura";
    const sideLabel = coinSide === "yazi" ? "YAZI" : "TURA";

    if (userGuess === coinSide) {
      await Economy.updateOne({ _id: userEco._id }, { $inc: { wallet: bet } });
      const newBalance = (userEco.wallet || 0) + bet;

      return message.reply(MessageFormatter.success(
        "Kazandınız!",
        `🪙 Madeni para havaya atıldı ve **${sideLabel}** geldi!\n\n▫️ Tebrikler, bahsi kazanarak **+${bet.toLocaleString("tr-TR")} Coin** kazandınız.\n▫️ Yeni Cüzdan: **${newBalance.toLocaleString("tr-TR")} Coin**`
      ));
    } else {
      await Economy.updateOne({ _id: userEco._id }, { $inc: { wallet: -bet } });
      const newBalance = (userEco.wallet || 0) - bet;

      return message.reply(MessageFormatter.error(
        "Kaybettiniz!",
        `🪙 Madeni para havaya atıldı ve **${sideLabel}** geldi.\n\n▫️ Maalesef tahmininiz tutmadı ve **${bet.toLocaleString("tr-TR")} Coin** kaybettiniz.\n▫️ Yeni Cüzdan: **${newBalance.toLocaleString("tr-TR")} Coin**`
      ));
    }
  }
};

