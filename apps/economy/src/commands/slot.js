import { Economy } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

const symbols = ["🍒", "🍋", "🍇", "💎", "7️⃣"];

export default {
  name: "slot",
  aliases: ["slots", "s"],
  async execute({ message, args, config }) {
    const bet = parseInt(args[0], 10);
    if (isNaN(bet) || bet <= 0) {
      return message.reply({ embeds: [Embeds.warn("Geçersiz Miktar", "Lütfen oynayacağınız bahis miktarını belirtin.", message.guild)] });
    }

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!profile || profile.wallet < bet) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Cüzdanınızda yeterli bakiye yok. (Mevcut: ${profile?.wallet || 0} Coin)`, message.guild)] });
    }

    const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
    const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

    let won = false;
    let multiplier = 0;

    if (reel1 === reel2 && reel2 === reel3) {
      won = true;
      multiplier = reel1 === "7️⃣" ? 10 : reel1 === "💎" ? 5 : 3;
    } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
      won = true;
      multiplier = 1.5;
    }

    if (won) {
      const winnings = Math.round(bet * multiplier);
      profile.wallet += winnings - bet;
      await profile.save();

      const payload = MessageFormatter.render("slotWin", {
        reel1,
        reel2,
        reel3,
        multiplier,
        amount: winnings,
        balance: profile.wallet,
        title: "Slot - Kazandınız!"
      }, config, message.guild);

      return message.reply(payload);
    } else {
      profile.wallet -= bet;
      await profile.save();

      const payload = MessageFormatter.render("slotLose", {
        reel1,
        reel2,
        reel3,
        amount: bet,
        balance: profile.wallet,
        title: "Slot - Kaybettiniz"
      }, config, message.guild);

      return message.reply(payload);
    }
  }
};
