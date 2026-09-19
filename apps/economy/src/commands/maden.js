import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { PetService } from "../services/PetService.js";

const MADEN_COOLDOWN = 45 * 60 * 1000;

const ORES = [
  { name: "Kömür", value: 30, chance: 0.35 },
  { name: "Demir", value: 60, chance: 0.25 },
  { name: "Bakır", value: 90, chance: 0.18 },
  { name: "Altın", value: 200, chance: 0.12 },
  { name: "Zümrüt", value: 450, chance: 0.06 },
  { name: "Elmas", value: 1200, chance: 0.03 },
  { name: "Taş", value: 5, chance: 0.01 },
];

export default {
  name: "maden",
  aliases: ["mine", "kaz"],
  async execute({ message, config }) {
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const now = Date.now();
    const lastMaden = eco.lastMaden ? new Date(eco.lastMaden).getTime() : 0;
    if (now - lastMaden < MADEN_COOLDOWN) {
      const remaining = Math.ceil((MADEN_COOLDOWN - (now - lastMaden)) / 60000);
      return message.reply(MessageFormatter.warn(
        "Bekleme Süresi",
        `Bir sonraki maden kazısı için **${remaining} dakika** beklemeniz gerekiyor.`
      ));
    }

    const hasKazma = (eco.inventory || []).some((i) => i.itemId === "item_kazma");
    const activeOres = hasKazma ? [
      { name: "Saf Yakut", value: 3800, chance: 0.12 },
      { name: "Elmas", value: 2500, chance: 0.20 },
      { name: "Zümrüt", value: 1200, chance: 0.28 },
      { name: "Altın", value: 600, chance: 0.25 },
      { name: "Bakır", value: 250, chance: 0.15 }
    ] : ORES;

    const roll = Math.random();
    let cumulative = 0;
    let ore = activeOres[activeOres.length - 1];
    for (const o of activeOres) {
      cumulative += o.chance;
      if (roll < cumulative) { ore = o; break; }
    }

    const petBonus = await PetService.calculateBonus(message.guild.id, message.author.id, "gathering");
    const passivePet = await PetService.calculateBonus(message.guild.id, message.author.id, "passive");
    let totalValue = ore.value;
    let petBonusText = "";
    if (petBonus.active) {
      totalValue = Math.round(totalValue * (petBonus.multiplier || 2));
      petBonusText += `\n▫️ ${petBonus.meta.emoji} **${petBonus.pet.name}:** Maden kazancını x${petBonus.multiplier.toFixed(1)} katına çıkardı!`;
    }
    if (passivePet.active) {
      totalValue += passivePet.bonusCoin || 250;
      petBonusText += `\n▫️ ${passivePet.meta.emoji} **${passivePet.pet.name}:** +${passivePet.bonusCoin || 250} Coin ekledi!`;
    }

    eco.wallet += totalValue;
    eco.lastMaden = new Date();
    if (!eco.mineCount) eco.mineCount = 0;
    eco.mineCount += 1;
    await eco.save();

    const emojis = { "Saf Yakut": "🔴", "Kömür": "🪨", "Demir": "⚙️", "Bakır": "🟫", "Altın": "🥇", "Zümrüt": "💚", "Elmas": "💎", "Taş": "🗿" };
    const emoji = emojis[ore.name] || "⛏️";
    const bonusText = (hasKazma ? "\n▫️ ⛏️ **Elmas Kazma:** Aktif (Nadir Cevher Bonusu)" : "") + petBonusText;

    return message.reply(MessageFormatter.render("mineSuccess", {
      mineral: `${emoji} ${ore.name}`,
      ore: `${emoji} ${ore.name}`,
      amount: totalValue.toLocaleString("tr-TR"),
      reward: totalValue.toLocaleString("tr-TR"),
      count: eco.mineCount,
      balance: (eco.wallet || 0).toLocaleString("tr-TR"),
      defaultText: `### ⛏️ Maden Kazısı Başarılı\n▫️ 💎 **Cevher:** {mineral}\n▫️ 💰 **Kazanılan Değer:** \`+{amount}\` Coin\n▫️ 💳 **Güncel Cüzdan:** \`{balance}\` Coin${bonusText}\n-# 🗺️ Kazı Başarılı : Maden cevheri paraya dönüştürüldü`
    }, config, message.guild));
  }
};

