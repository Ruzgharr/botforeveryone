import mongoose from "mongoose";

const ShopItemSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  itemKey: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: "" },
  price: { type: Number, required: true },
  type: { type: String, enum: ["ROLE", "COSMETIC", "BADGE"], default: "ROLE" },
  roleId: { type: String, default: "" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

ShopItemSchema.index({ guildId: 1, itemKey: 1 }, { unique: true });

export const ShopItem = mongoose.model("ShopItem", ShopItemSchema);
