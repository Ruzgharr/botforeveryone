import { BaseBot, MessageFormatter } from "@bot/core";
import { environment } from "@bot/config";
import { Economy, GuildConfig } from "@bot/database";

import coinCmd from "./commands/coin.js";
import gunlukCmd from "./commands/gunluk.js";
import blackjackCmd from "./commands/blackjack.js";
import slotCmd from "./commands/slot.js";
import ruletCmd from "./commands/rulet.js";
import gonderCmd from "./commands/gonder.js";
import borsaCmd from "./commands/borsa.js";
import alCmd from "./commands/al.js";
import satCmd from "./commands/sat.js";
import soygunCmd from "./commands/soygun.js";
import yazituraCmd from "./commands/yazitura.js";
import topcoinCmd from "./commands/topcoin.js";
import bankaCmd from "./commands/banka.js";
import calisCmd from "./commands/calis.js";
import marketCmd from "./commands/market.js";
import satinalCmd from "./commands/satinal.js";
import envanterCmd from "./commands/envanter.js";
import mevduatCmd from "./commands/mevduat.js";
import sirketCmd from "./commands/sirket.js";
import emlakCmd from "./commands/emlak.js";
import piyangoCmd from "./commands/piyango.js";
import kazikazanCmd from "./commands/kazikazan.js";
import balikCmd from "./commands/balik.js";
import madenCmd from "./commands/maden.js";

const client = new BaseBot({
  serviceName: "ECONOMY",
  token: environment.tokens.economy
});

client.activeBlackjack = new Map();

client.registerCommand(coinCmd);
client.registerCommand(gunlukCmd);
client.registerCommand(blackjackCmd);
client.registerCommand(slotCmd);
client.registerCommand(ruletCmd);
client.registerCommand(gonderCmd);
client.registerCommand(borsaCmd);
client.registerCommand(alCmd);
client.registerCommand(satCmd);
client.registerCommand(soygunCmd);
client.registerCommand(yazituraCmd);
client.registerCommand(topcoinCmd);
client.registerCommand(bankaCmd);
client.registerCommand(calisCmd);
client.registerCommand(marketCmd);
client.registerCommand(satinalCmd);
client.registerCommand(envanterCmd);
client.registerCommand(mevduatCmd);
client.registerCommand(sirketCmd);
client.registerCommand(emlakCmd);
client.registerCommand(piyangoCmd);
client.registerCommand(kazikazanCmd);
client.registerCommand(balikCmd);
client.registerCommand(madenCmd);

client.on("ready", () => {
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      const config = await client.getGuildConfig(guild.id);
      const goldDelta = Math.floor((Math.random() - 0.48) * 150);
      const btcDelta = Math.floor((Math.random() - 0.48) * 2500);

      const currentGold = config.economyMarket?.goldPrice || 2500;
      const currentBtc = config.economyMarket?.btcPrice || 65000;

      const newGold = Math.max(1000, currentGold + goldDelta);
      const newBtc = Math.max(20000, currentBtc + btcDelta);

      await GuildConfig.updateOne(
        { guildId: guild.id },
        {
          $set: {
            "economyMarket.goldPrice": newGold,
            "economyMarket.btcPrice": newBtc,
            "economyMarket.lastUpdate": new Date()
          }
        }
      );
      client.configs.delete(guild.id);
    }
  }, 1000 * 60 * 10);
});

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

client.registerInteraction("bj_", async ({ client, interaction, config }) => {
  const parts = interaction.customId.split("_");
  const action = parts[1];
  const ownerId = parts[2];
  const bet = parseInt(parts[3], 10);

  if (interaction.user.id !== ownerId) {
    return interaction.reply({ content: "Bu oyunun oyuncusu siz değilsiniz.", ephemeral: true });
  }

  const game = client.activeBlackjack?.get(ownerId);
  if (!game) {
    return interaction.reply({ content: "Oyun süresi doldu veya oyun bulunamadı.", ephemeral: true });
  }

  if (action === "hit") {
    game.playerCards.push(getRandomCard());
    const playerTotal = calculateHand(game.playerCards);

    if (playerTotal > 21) {
      client.activeBlackjack.delete(ownerId);
      const profile = await Economy.findOne({ guildId: interaction.guild.id, userId: ownerId });
      const losePayload = MessageFormatter.render("blackjackLose", {
        amount: bet,
        balance: profile?.wallet || 0,
        title: "Blackjack - Kaybettiniz (Bust)"
      }, config, interaction.guild);

      return interaction.update({
        ...losePayload,
        components: []
      });
    }

    const tablePayload = MessageFormatter.render("blackjackTable", {
      bet,
      cards: game.playerCards.join(" - "),
      total: playerTotal,
      dealer: game.dealerCards[0],
      title: "Blackjack Oyunu",
      components: interaction.message.components
    }, config, interaction.guild);

    return interaction.update(tablePayload);
  } else if (action === "stand") {
    let playerTotal = calculateHand(game.playerCards);
    let dealerTotal = calculateHand(game.dealerCards);

    while (dealerTotal < 17) {
      game.dealerCards.push(getRandomCard());
      dealerTotal = calculateHand(game.dealerCards);
    }

    client.activeBlackjack.delete(ownerId);

    const profile = await Economy.findOne({ guildId: interaction.guild.id, userId: ownerId });

    if (dealerTotal > 21 || playerTotal > dealerTotal) {
      const winAmount = bet * 2;
      if (profile) {
        profile.wallet += winAmount;
        await profile.save();
      }

      const winPayload = MessageFormatter.render("blackjackWin", {
        amount: winAmount,
        balance: profile?.wallet || 0,
        title: "Blackjack - Kazandınız!"
      }, config, interaction.guild);

      return interaction.update({
        ...winPayload,
        components: []
      });
    } else if (playerTotal === dealerTotal) {
      if (profile) {
        profile.wallet += bet;
        await profile.save();
      }

      const pushPayload = MessageFormatter.render("blackjackPush", {
        amount: bet,
        balance: profile?.wallet || 0,
        title: "Blackjack - Berabere (Push)"
      }, config, interaction.guild);

      return interaction.update({
        ...pushPayload,
        components: []
      });
    } else {
      const losePayload = MessageFormatter.render("blackjackLose", {
        amount: bet,
        balance: profile?.wallet || 0,
        title: "Blackjack - Krupiye Kazandı"
      }, config, interaction.guild);

      return interaction.update({
        ...losePayload,
        components: []
      });
    }
  }
});

export default client;

if (process.argv[1]?.endsWith("apps/economy/src/index.js") || process.argv[1]?.endsWith("apps\\economy\\src\\index.js")) {
  client.start();
}
