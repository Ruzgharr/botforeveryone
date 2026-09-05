import mongoose from "mongoose";

const EconomySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  wallet: { type: Number, default: 100 },
  bank: { type: Number, default: 0 },
  inventory: [{
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, default: "ROLE" },
    roleId: { type: String, default: "" },
    purchasedAt: { type: Date, default: Date.now }
  }],
  lastDaily: { type: Date, default: null },
  lastBalik: { type: Date, default: null },
  lastMaden: { type: Date, default: null },
  lastPiyango: { type: Date, default: null },
  lastKazikazan: { type: Date, default: null },
  fishCount: { type: Number, default: 0 },
  mineCount: { type: Number, default: 0 },
  deposit: {
    amount: { type: Number, default: 0 },
    startedAt: { type: Date, default: null },
    matureAt: { type: Date, default: null }
  },
  company: {
    name: { type: String, default: null },
    level: { type: Number, default: 1 },
    lastIncome: { type: Date, default: null }
  },
  properties: { type: [String], default: [] },
  propertyLastIncome: { type: Date, default: null }
}, { timestamps: true });

EconomySchema.index({ guildId: 1, userId: 1 }, { unique: true });
EconomySchema.index({ guildId: 1, wallet: -1 });

export const Economy = mongoose.model("Economy", EconomySchema);
