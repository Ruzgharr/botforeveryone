import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

const CARD_COST = 50;
const KAZI_COOLDOWN = 6 * 60 * 60 * 1000;

const PRIZES = [
  { label: "JACKPOT", mult: 20, chance: 0.01 },
  { label: "3x Odül", mult: 3, chance: 0.08 },
  { label: "2x Odül", mult: 2, chance: 0.15 },
  { label: "Bedava Kart", mult: 1, chance: 0.20 },
  { label: "Kayip", mult: 0, chance: 0.56 },
];

export default {
  name: "kazikazan",
  aliases: ["kazi", "scratch"],
  async execute({ message }) {
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const now = Date.now();
    const lastKazi = eco.lastKazikazan ? new Date(eco.lastKazikazan).getTime() : 0;
    if (now - lastKazi < KAZI_COOLDOWN) {
      const remaining = Math.ceil((KAZI_COOLDOWN - (now - lastKazi)) / 60000);
      return message.reply({ embeds: [Embeds.warn("Bekleme Suresi", `Bir sonraki kazi kart icin **${remaining} dakika** beklemeniz gerekiyor.`, message.guild)] });
    }

    if (eco.wallet < CARD_COST) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Kazi kart icin **${CARD_COST} Coin** gerekiyor.`, message.guild)] });
    }

    eco.wallet -= CARD_COST;
    eco.lastKazikazan = new Date();

    const roll = Math.random();
    let cumulative = 0;
    let result = PRIZES[PRIZES.length - 1];
    for (const prize of PRIZES) {
      cumulative += prize.chance;
      if (roll < cumulative) { result = prize; break; }
    }

    const payout = result.mult === 1 ? CARD_COST : CARD_COST * result.mult;
    eco.wallet += payout;
    await eco.save();

    const won = result.mult > 0 ? `**${payout} Coin** kazandiniz!` : "Kazanamadiniz.";
    const embed = result.mult > 1 || result.mult === 0
      ? (result.mult > 1 ? Embeds.success(`Kazi Kart - ${result.label}`, won, message.guild) : Embeds.warn(`Kazi Kart - ${result.label}`, won, message.guild))
      : Embeds.info(`Kazi Kart - ${result.label}`, `Bedava kart! ${CARD_COST} Coin geri alindi.`, message.guild);

    return message.reply({ embeds: [embed] });
  }
};
