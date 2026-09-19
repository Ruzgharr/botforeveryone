import { Economy } from "@bot/database";
import { MessageFormatter, VisualCard } from "@bot/core";
import { AttachmentBuilder } from "discord.js";

const symbols = ["🍒", "🍋", "🍇", "💎", "7️⃣"];

export default {
  name: "slot",
  aliases: ["slots", "s"],
  async execute({ message, args, config }) {
    const bet = parseInt(args[0], 10);
    if (isNaN(bet) || bet <= 0) {
      return message.reply(MessageFormatter.warn("Geçersiz Miktar", "Lütfen oynayacağınız bahis miktarını belirtin."));
    }

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!profile || profile.wallet < bet) {
      return message.reply(MessageFormatter.error("Yetersiz Bakiye", `Cüzdanınızda yeterli bakiye yok. (Mevcut: ${profile?.wallet || 0} Coin)`));
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

    const hasSans = (profile.inventory || []).some((i) => i.itemId === "item_sans");
    let sansSaved = false;
    if (!won && hasSans && Math.random() < 0.30) {
      won = true;
      multiplier = 1.5;
      sansSaved = true;
    }

    let winnings = 0;
    if (won) {
      winnings = Math.round(bet * multiplier);
      profile.wallet += winnings - bet;
    } else {
      profile.wallet -= bet;
    }
    await profile.save();

    const cardBuffer = VisualCard.renderSlotMachine({
      reel1,
      reel2,
      reel3,
      won,
      multiplier,
      amount: winnings,
      balance: profile.wallet,
      bet
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: "slot.png" });

    const statusText = won
      ? (sansSaved
          ? `🍀 **Şanslı Yonca Devrede!** Kaybedilen tur kazanca dönüştürüldü! (+${winnings.toLocaleString("tr-TR")} Coin)`
          : `🎉 **Tebrikler!** ${multiplier}x kazandınız (+${winnings.toLocaleString("tr-TR")} Coin)`)
      : `💥 **Kaybettiniz!** (-${bet.toLocaleString("tr-TR")} Coin)`;

    return message.reply({
      content: `🎰 **Slot Makinesi** | Oyuncu: <@${message.author.id}> | ${statusText}`,
      files: [attachment]
    });
  }
};
