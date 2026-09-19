import mongoose from "mongoose";

const BattlePassSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  season: { type: Number, default: 1 },
  seasonName: { type: String, default: "1. Sezon: Kiraz Çiçeği Festivali" },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
  active: { type: Boolean, default: true },
  tiers: [{
    level: { type: Number, required: true },
    requiredXp: { type: Number, required: true },
    freeReward: {
      type: { type: String, default: "COIN" },
      name: { type: String, default: "1.000 Coin" },
      amount: { type: Number, default: 1000 },
      itemId: { type: String, default: "" }
    },
    vipReward: {
      type: { type: String, default: "COIN" },
      name: { type: String, default: "2.500 Coin" },
      amount: { type: Number, default: 2500 },
      itemId: { type: String, default: "" }
    }
  }],
  dailyQuestsConfig: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    targetType: { type: String, required: true },
    targetCount: { type: Number, default: 1 },
    xpReward: { type: Number, default: 100 },
    coinReward: { type: Number, default: 250 }
  }],
  weeklyQuestsConfig: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    targetType: { type: String, required: true },
    targetCount: { type: Number, default: 5 },
    xpReward: { type: Number, default: 350 },
    coinReward: { type: Number, default: 1000 }
  }]
}, { timestamps: true });

BattlePassSchema.index({ guildId: 1, season: 1 }, { unique: true });

export const BattlePass = mongoose.model("BattlePass", BattlePassSchema);
