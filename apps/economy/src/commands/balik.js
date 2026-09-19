import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { PetService } from "../services/PetService.js";

const BALIK_COOLDOWN = 30 * 60 * 1000;

const CATCHES = [
  { name: "Uskumru", value: 40, chance: 0.30 },
  { name: "Levrek", value: 70, chance: 0.25 },
  { name: "Çipura", value: 100, chance: 0.20 },
  { name: "Ton Balığı", value: 200, chance: 0.12 },
  { name: "Kılıç Balığı", value: 400, chance: 0.07 },
  { name: "Nadide Balık", value: 1000, chance: 0.04 },
  { name: "Eski Bot", value: 5, chance: 0.02 },
];

export default {
  name: "balik",
  aliases: ["fisherman", "fishing", "avla"],
  async execute({ message, config }) {
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const now = Date.now();
    const lastBalik = eco.lastBalik ? new Date(eco.lastBalik).getTime() : 0;
    if (now - lastBalik < BALIK_COOLDOWN) {
      const remaining = Math.ceil((BALIK_COOLDOWN - (now - lastBalik)) / 60000);
      return message.reply(MessageFormatter.warn(
        "Bekleme Süresi",
        `Bir sonraki avlanma için **${remaining} dakika** beklemeniz gerekiyor.`
      ));
    }

    const hasOlta = (eco.inventory || []).some((i) => i.itemId === "item_olta");
    const activeCatches = hasOlta ? [
      { name: "Efsanevi Kraken", value: 3500, chance: 0.10 },
      { name: "Nadide Balık", value: 2000, chance: 0.20 },
      { name: "Kılıç Balığı", value: 900, chance: 0.25 },
      { name: "Ton Balığı", value: 500, chance: 0.25 },
      { name: "Çipura", value: 250, chance: 0.15 },
      { name: "Levrek", value: 150, chance: 0.05 }
    ] : CATCHES;

    const roll = Math.random();
    let cumulative = 0;
    let catch_ = activeCatches[activeCatches.length - 1];
    for (const c of activeCatches) {
      cumulative += c.chance;
      if (roll < cumulative) { catch_ = c; break; }
    }

    const petBonus = await PetService.calculateBonus(message.guild.id, message.author.id, "gathering");
    let totalValue = catch_.value;
    let petBonusText = "";
    if (petBonus.active) {
      totalValue = Math.round(totalValue * (petBonus.multiplier || 2));
      petBonusText += `\n▫️ ${petBonus.meta.emoji} **${petBonus.pet.name}:** Balık kazancını x${petBonus.multiplier.toFixed(1)} katına çıkardı!`;
    }

    eco.wallet += totalValue;
    eco.lastBalik = new Date();
    if (!eco.fishCount) eco.fishCount = 0;
    eco.fishCount += 1;
    await eco.save();

    const emojis = { "Efsanevi Kraken": "🦑", "Eski Bot": "🤖", "Nadide Balık": "✨", "Kılıç Balığı": "⚔️", "Ton Balığı": "🐟", "Çipura": "🐠", "Levrek": "🎣", "Uskumru": "🐡" };
    const emoji = emojis[catch_.name] || "🎣";
    const bonusText = (hasOlta ? "\n▫️ 🎣 **Titanyum Olta:** Aktif (+%200 Değer ve Efsanevi Av Bonusu)" : "") + petBonusText;

    return message.reply(MessageFormatter.render("fishSuccess", {
      fish: `${emoji} ${catch_.name}`,
      amount: totalValue.toLocaleString("tr-TR"),
      reward: totalValue.toLocaleString("tr-TR"),
      count: eco.fishCount,
      balance: (eco.wallet || 0).toLocaleString("tr-TR"),
      defaultText: `### 🎣 Balık Avı Başarılı\n▫️ 🐟 **Yakalanan:** {fish}\n▫️ 💰 **Satış Değeri:** \`+{amount}\` Coin\n▫️ 💳 **Güncel Cüzdan:** \`{balance}\` Coin${bonusText}\n-# 🌊 Deniz Avı : Balık pazarında satış gerçekleştirildi`
    }, config, message.guild));
  }
};

