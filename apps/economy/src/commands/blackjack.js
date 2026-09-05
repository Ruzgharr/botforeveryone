import { Economy } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

function calculateHand(cards) {
  let sum = 0;
  let aces = 0;
  for (const card of cards) {
    if (card === "A") {
      aces++;
      sum += 11;
    } else if (["K", "Q", "J", "10"].includes(card)) {
      sum += 10;
    } else {
      sum += parseInt(card, 10);
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  return sum;
}

function getRandomCard() {
  const deck = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  return deck[Math.floor(Math.random() * deck.length)];
}

export default {
  name: "blackjack",
  aliases: ["bj", "21"],
  async execute({ client, message, args, config }) {
    const bet = parseInt(args[0], 10);
    if (isNaN(bet) || bet <= 0) {
      return message.reply({ embeds: [Embeds.warn("Geçersiz Miktar", "Lütfen oynamak istediğiniz geçerli bir bahis miktarı girin.", message.guild)] });
    }

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!profile || profile.wallet < bet) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Cüzdanınızda yeterli bakiye bulunmuyor. (Mevcut: ${profile?.wallet || 0} Coin)`, message.guild)] });
    }

    profile.wallet -= bet;
    await profile.save();

    const playerCards = [getRandomCard(), getRandomCard()];
    const dealerCards = [getRandomCard(), getRandomCard()];

    let playerTotal = calculateHand(playerCards);
    let dealerTotal = calculateHand([dealerCards[0]]);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`bj_hit_${message.author.id}_${bet}`).setLabel("Kart Çek").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`bj_stand_${message.author.id}_${bet}`).setLabel("Kal").setStyle(ButtonStyle.Secondary)
    );

    const payload = MessageFormatter.render("blackjackTable", {
      bet,
      cards: playerCards.join(" - "),
      total: playerTotal,
      dealer: dealerCards[0],
      title: "Blackjack Oyunu",
      components: [row]
    }, config, message.guild);

    const gameMessage = await message.reply(payload);

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
