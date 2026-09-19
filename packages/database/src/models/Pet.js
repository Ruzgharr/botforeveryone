import mongoose from "mongoose";

const PetSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  petType: { type: String, required: true },
  name: { type: String, required: true },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  energy: { type: Number, default: 100 },
  lastFed: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: false }
}, { timestamps: true });

PetSchema.index({ guildId: 1, userId: 1 });
PetSchema.index({ guildId: 1, userId: 1, isActive: 1 });

export const Pet = mongoose.model("Pet", PetSchema);
