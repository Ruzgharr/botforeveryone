import mongoose from "mongoose";

const StaffKpiSchema = new mongoose.Schema({
  staffId: { type: String, required: true },
  guildId: { type: String, required: true },
  bans: { type: Number, default: 0 },
  jails: { type: Number, default: 0 },
  mutes: { type: Number, default: 0 },
  vmutes: { type: Number, default: 0 },
  registers: { type: Number, default: 0 },
  voiceMinutes: { type: Number, default: 0 },
  chatMessages: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  period: { type: String, default: "WEEKLY" }
}, { timestamps: true });

StaffKpiSchema.index({ staffId: 1, guildId: 1, period: 1 });

export const StaffKpi = mongoose.model("StaffKpi", StaffKpiSchema);
