import mongoose from "mongoose";

const StaffTaskSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  targetVoiceMs: { type: Number, default: 36000000 },
  currentVoiceMs: { type: Number, default: 0 },
  targetMessages: { type: Number, default: 500 },
  currentMessages: { type: Number, default: 0 },
  targetRegisters: { type: Number, default: 5 },
  currentRegisters: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  status: { type: String, enum: ["IN_PROGRESS", "COMPLETED", "FAILED"], default: "IN_PROGRESS" },
  weekNumber: { type: Number, required: true },
  year: { type: Number, required: true }
}, { timestamps: true });

StaffTaskSchema.index({ guildId: 1, userId: 1, weekNumber: 1, year: 1 }, { unique: true });

export const StaffTask = mongoose.model("StaffTask", StaffTaskSchema);
