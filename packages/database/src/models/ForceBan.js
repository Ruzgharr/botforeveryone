import mongoose from "mongoose";

const ForceBanSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  staffId: { type: String, required: true },
  reason: { type: String, default: "Kalıcı karaliste yasaklaması" },
  active: { type: Boolean, default: true }
}, { timestamps: true });

ForceBanSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const ForceBan = mongoose.model("ForceBan", ForceBanSchema);
