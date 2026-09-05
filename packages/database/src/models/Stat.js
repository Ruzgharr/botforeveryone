import mongoose from "mongoose";

const StatSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  totalVoiceMs: { type: Number, default: 0 },
  totalMessages: { type: Number, default: 0 },
  categoryVoiceMs: { type: Map, of: Number, default: {} },
  channelVoiceMs: { type: Map, of: Number, default: {} },
  channelMessages: { type: Map, of: Number, default: {} },
  dailyVoiceMs: { type: Number, default: 0 },
  weeklyVoiceMs: { type: Number, default: 0 },
  monthlyVoiceMs: { type: Number, default: 0 },
  dailyMessages: { type: Number, default: 0 },
  weeklyMessages: { type: Number, default: 0 },
  monthlyMessages: { type: Number, default: 0 },
  lastVoiceJoin: { type: Date, default: null },
  lastVoiceChannelId: { type: String, default: null },
  lastMessageDate: { type: Date, default: null },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
}, { timestamps: true });

StatSchema.index({ guildId: 1, userId: 1 }, { unique: true });
StatSchema.index({ guildId: 1, totalVoiceMs: -1 });
StatSchema.index({ guildId: 1, totalMessages: -1 });

export const Stat = mongoose.model("Stat", StatSchema);
