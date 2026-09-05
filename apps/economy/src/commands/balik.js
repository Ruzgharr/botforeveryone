import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

const BALIK_COOLDOWN = 30 * 60 * 1000;

const CATCHES = [
  { name: "Uskumru", value: 40, chance: 0.30 },
  { name: "Levrek", value: 70, chance: 0.25 },
  { name: "Cipura", value: 100, chance: 0.20 },
  { name: "Ton Baligi", value: 200, chance: 0.12 },
  { name: "Kilic Baligi", value: 400, chance: 0.07 },
  { name: "Nadide Balik", value: 1000, chance: 0.04 },
  { name: "Eski Bot", value: 5, chance: 0.02 },
];

export default {
  name: "balik",
  aliases: ["fisherman", "fishing", "avla"],
  async execute({ message }) {
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const now = Date.now();
    const lastBalik = eco.lastBalik ? new Date(eco.lastBalik).getTime() : 0;
    if (now - lastBalik < BALIK_COOLDOWN) {
      const remaining = Math.ceil((BALIK_COOLDOWN - (now - lastBalik)) / 60000);
      return message.reply({ embeds: [Embeds.warn("Bekleme Suresi", `Bir sonraki avlanma icin **${remaining} dakika** beklemeniz gerekiyor.`, message.guild)] });
    }

    const roll = Math.random();
    let cumulative = 0;
    let catch_ = CATCHES[CATCHES.length - 1];
    for (const c of CATCHES) {
      cumulative += c.chance;
      if (roll < cumulative) { catch_ = c; break; }
    }

    eco.wallet += catch_.value;
    eco.lastBalik = new Date();
    if (!eco.fishCount) eco.fishCount = 0;
    eco.fishCount += 1;
    await eco.save();

    const emojis = { "Eski Bot": "🤖", "Nadide Balik": "✨", "Kilic Baligi": "⚔️", "Ton Baligi": "🐟", "Cipura": "🐠", "Levrek": "🎣", "Uskumru": "🐡" };
    const emoji = emojis[catch_.name] || "🎣";

    return message.reply({
      embeds: [Embeds.success(`${emoji} Avlandı: ${catch_.name}`, `**${catch_.value} Coin** kazandiniz! Toplam avlanma: **${eco.fishCount}** kez.`, message.guild)]
    });
  }
};
