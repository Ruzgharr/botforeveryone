import mongoose from "mongoose";

const MarketItemSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  itemKey: { type: String, required: true },
  itemName: { type: String, required: true },
  amount: { type: Number, default: 0 },
  buyPrice: { type: Number, default: 0 }
}, { timestamps: true });

MarketItemSchema.index({ userId: 1, guildId: 1, itemKey: 1 });

export const MarketItem = mongoose.model("MarketItem", MarketItemSchema);
