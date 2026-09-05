import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

const MADEN_COOLDOWN = 45 * 60 * 1000;

const ORES = [
  { name: "Komur", value: 30, chance: 0.35 },
  { name: "Demir", value: 60, chance: 0.25 },
  { name: "Bakir", value: 90, chance: 0.18 },
  { name: "Altin", value: 200, chance: 0.12 },
  { name: "Zumrut", value: 450, chance: 0.06 },
  { name: "Elmas", value: 1200, chance: 0.03 },
  { name: "Tas", value: 5, chance: 0.01 },
];

export default {
  name: "maden",
  aliases: ["mine", "kaz"],
  async execute({ message }) {
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const now = Date.now();
    const lastMaden = eco.lastMaden ? new Date(eco.lastMaden).getTime() : 0;
    if (now - lastMaden < MADEN_COOLDOWN) {
      const remaining = Math.ceil((MADEN_COOLDOWN - (now - lastMaden)) / 60000);
      return message.reply({ embeds: [Embeds.warn("Bekleme Suresi", `Bir sonraki maden kazma icin **${remaining} dakika** beklemeniz gerekiyor.`, message.guild)] });
    }

    const roll = Math.random();
    let cumulative = 0;
    let ore = ORES[ORES.length - 1];
    for (const o of ORES) {
      cumulative += o.chance;
      if (roll < cumulative) { ore = o; break; }
    }

    eco.wallet += ore.value;
    eco.lastMaden = new Date();
    if (!eco.mineCount) eco.mineCount = 0;
    eco.mineCount += 1;
    await eco.save();

    const emojis = { "Komur": "🪨", "Demir": "⚙️", "Bakir": "🟫", "Altin": "🥇", "Zumrut": "💚", "Elmas": "💎", "Tas": "🗿" };
    const emoji = emojis[ore.name] || "⛏️";

    return message.reply({
      embeds: [Embeds.success(`${emoji} Kazilan: ${ore.name}`, `**${ore.value} Coin** degerinde cevher bulundu! Toplam kazma: **${eco.mineCount}** kez.`, message.guild)]
    });
  }
};
