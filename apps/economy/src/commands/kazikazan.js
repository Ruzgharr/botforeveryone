import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

const CARD_COST = 50;
const KAZI_COOLDOWN = 6 * 60 * 60 * 1000;

const PRIZES = [
  { label: "JACKPOT", mult: 20, chance: 0.01 },
  { label: "3x Ödül", mult: 3, chance: 0.08 },
  { label: "2x Ödül", mult: 2, chance: 0.15 },
  { label: "Bedava Kart", mult: 1, chance: 0.20 },
  { label: "Kayıp", mult: 0, chance: 0.56 },
];

export default {
  name: "kazikazan",
  aliases: ["kazi", "scratch"],
  async execute({ message, config }) {
    const cardCost = config?.casinoSettings?.kazikazanCost || CARD_COST;
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const now = Date.now();
    const lastKazi = eco.lastKazikazan ? new Date(eco.lastKazikazan).getTime() : 0;
    if (now - lastKazi < KAZI_COOLDOWN) {
      const remaining = Math.ceil((KAZI_COOLDOWN - (now - lastKazi)) / 60000);
      return message.reply(MessageFormatter.warn(
        "Bekleme Süresi",
        `Bir sonraki kazı kartı için **${remaining} dakika** beklemeniz gerekiyor.`
      ));
    }

    if (eco.wallet < cardCost) {
      return message.reply(MessageFormatter.error(
        "Yetersiz Bakiye",
        `Kazı kazan kartı için **${cardCost} Coin** gerekiyor.`
      ));
    }

    eco.wallet -= cardCost;
    eco.lastKazikazan = new Date();

    const roll = Math.random();
    let cumulative = 0;
    let result = PRIZES[PRIZES.length - 1];
    for (const prize of PRIZES) {
      cumulative += prize.chance;
      if (roll < cumulative) { result = prize; break; }
    }

    const payout = result.mult === 1 ? cardCost : cardCost * result.mult;
    eco.wallet += payout;
    await eco.save();

    if (result.mult > 1) {
      return message.reply(MessageFormatter.success(
        `🎟️ Kazı Kazan - ${result.label}`,
        `▫️ Tebrikler, kartı kazıyarak **${payout.toLocaleString("tr-TR")} Coin** kazandınız!\n▫️ Güncel Cüzdan: **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin**`
      ));
    } else if (result.mult === 1) {
      return message.reply(MessageFormatter.info(
        `🎟️ Kazı Kazan - Bedava Kart`,
        `▫️ Bedava kart kazandınız! **${CARD_COST} Coin** kart bedeli iade edildi.\n▫️ Güncel Cüzdan: **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin**`
      ));
    } else {
      return message.reply(MessageFormatter.warn(
        `🎟️ Kazı Kazan - Sonuçsuz`,
        `▫️ Maalesef bu karttan ödül çıkmadı.\n▫️ Güncel Cüzdan: **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin**`
      ));
    }
  }
};

