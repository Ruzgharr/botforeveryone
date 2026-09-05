import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

const TICKET_COST = 100;
const JACKPOT_CHANCE = 0.02;
const JACKPOT_MULT = 50;
const WIN_CHANCE = 0.15;
const WIN_MULT = 5;
const PIYANGO_COOLDOWN = 24 * 60 * 60 * 1000;

export default {
  name: "piyango",
  aliases: ["lottery"],
  async execute({ message, config }) {
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const now = Date.now();
    const lastPiyango = eco.lastPiyango ? new Date(eco.lastPiyango).getTime() : 0;
    if (now - lastPiyango < PIYANGO_COOLDOWN) {
      const remaining = Math.ceil((PIYANGO_COOLDOWN - (now - lastPiyango)) / 3600000);
      return message.reply({ embeds: [Embeds.warn("Bekleme Suresi", `Bir sonraki piyango bileti icin **${remaining} saat** beklemeniz gerekiyor.`, message.guild)] });
    }

    if (eco.wallet < TICKET_COST) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Piyango bileti icin **${TICKET_COST} Coin** gerekiyor.`, message.guild)] });
    }

    eco.wallet -= TICKET_COST;
    eco.lastPiyango = new Date();

    const roll = Math.random();
    let title, desc, success;

    if (roll < JACKPOT_CHANCE) {
      const prize = TICKET_COST * JACKPOT_MULT;
      eco.wallet += prize;
      title = "JACKPOT!";
      desc = `Buyuk ikrаmiyi kazandiniz! **${prize} Coin** cuzdaniniza eklendi.`;
      success = true;
    } else if (roll < JACKPOT_CHANCE + WIN_CHANCE) {
      const prize = TICKET_COST * WIN_MULT;
      eco.wallet += prize;
      title = "Kazandiniz!";
      desc = `Kucuk ikramiye! **${prize} Coin** kazandiniz.`;
      success = true;
    } else {
      title = "Kaybettiniz";
      desc = `Bilediniz tutmadi. ${TICKET_COST} Coin harcandi.`;
      success = false;
    }

    await eco.save();
    return message.reply({ embeds: [success ? Embeds.success(title, desc, message.guild) : Embeds.warn(title, desc, message.guild)] });
  }
};
