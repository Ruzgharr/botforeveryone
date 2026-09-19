import mongoose from "mongoose";

const UserBattlePassSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  season: { type: Number, default: 1 },
  passXp: { type: Number, default: 0 },
  passLevel: { type: Number, default: 1 },
  hasVipPass: { type: Boolean, default: false },
  claimedFreeTiers: { type: [Number], default: [] },
  claimedVipTiers: { type: [Number], default: [] },
  dailyQuests: [{
    questId: { type: String, required: true },
    current: { type: Number, default: 0 },
    target: { type: Number, default: 1 },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    date: { type: String, default: () => new Date().toISOString().slice(0, 10) }
  }],
  weeklyQuests: [{
    questId: { type: String, required: true },
    current: { type: Number, default: 0 },
    target: { type: Number, default: 5 },
    completed: { type: Boolean, default: false },
    claimed: { type: Boolean, default: false },
    week: { type: String, default: "" }
  }]
}, { timestamps: true });

UserBattlePassSchema.index({ guildId: 1, userId: 1, season: 1 }, { unique: true });

export const UserBattlePass = mongoose.model("UserBattlePass", UserBattlePassSchema);
