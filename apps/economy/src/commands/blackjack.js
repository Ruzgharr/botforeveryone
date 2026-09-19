import { Economy } from "@bot/database";
import { MessageFormatter, VisualCard } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from "discord.js";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function calculateHand(cards) {
  let sum = 0;
  let aces = 0;
  for (const card of cards) {
    const rawVal = card.replace(/[♠♥♦♣]/g, "");
    if (rawVal === "A") {
      aces++;
      sum += 11;
    } else if (["K", "Q", "J", "10"].includes(rawVal)) {
      sum += 10;
    } else {
      sum += parseInt(rawVal, 10);
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

function getRandomCard() {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const val = VALUES[Math.floor(Math.random() * VALUES.length)];
  return `${val}${suit}`;
}

export default {
  name: "blackjack",
  aliases: ["bj", "21"],
  async execute({ client, message, args, config }) {
    const bet = parseInt(args[0], 10);
    if (isNaN(bet) || bet <= 0) {
      return message.reply(MessageFormatter.warn("Geçersiz Miktar", "Lütfen oynamak istediğiniz geçerli bir bahis miktarı girin."));
    }

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!profile || profile.wallet < bet) {
      return message.reply(MessageFormatter.error("Yetersiz Bakiye", `Cüzdanınızda yeterli bakiye bulunmuyor. (Mevcut: ${profile?.wallet || 0} Coin)`));
    }

    profile.wallet -= bet;
    await profile.save();

    const playerCards = [getRandomCard(), getRandomCard()];
    const dealerCards = [getRandomCard(), getRandomCard()];

    let playerTotal = calculateHand(playerCards);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${message.author.id}_${bet}`).setLabel("Kart Çek").setEmoji("🃏").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${message.author.id}_${bet}`).setLabel("Kal").setEmoji("🛑").setStyle(ButtonStyle.Secondary)
    );

    const cardBuffer = await VisualCard.renderBlackjackTable({
      playerHand: playerCards,
      dealerHand: dealerCards,
      playerTotal,
      dealerTotal: calculateHand([dealerCards[0]]),
      bet,
      status: "playing",
      balance: profile.wallet
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: "blackjack.png" });

    const gameMessage = await message.reply({
      content: `🃏 **Blackjack (21) Masası** | Oyuncu: <@${message.author.id}> | Bahis: \`${bet.toLocaleString("tr-TR")} Coin\``,
      files: [attachment],
      components: [row]
    });

    if (!client.activeBlackjack) client.activeBlackjack = new Map();
    client.activeBlackjack.set(message.author.id, {
      bet,
      playerCards,
      dealerCards,
      messageId: gameMessage.id,
      channelId: message.channel.id
    });
  }
};
