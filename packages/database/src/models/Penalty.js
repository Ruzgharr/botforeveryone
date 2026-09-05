import mongoose from "mongoose";

const PenaltySchema = new mongoose.Schema({
  caseId: { type: Number, required: true, unique: true },
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  executorId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["JAIL", "BAN", "MUTE", "VMUTE", "WARN", "QUARANTINE", "KICK"], 
    required: true 
  },
  reason: { type: String, default: "Belirtilmedi" },
  points: { type: Number, default: 0 },
  durationMs: { type: Number, default: 0 },
  expiresAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
  liftedAt: { type: Date, default: null },
  liftedBy: { type: String, default: null }
}, { timestamps: true });

PenaltySchema.index({ guildId: 1, userId: 1 });

export const Penalty = mongoose.model("Penalty", PenaltySchema);
