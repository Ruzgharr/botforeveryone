import mongoose from "mongoose";

const InviteRecordSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  regular: { type: Number, default: 0 },
  fake: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  leaves: { type: Number, default: 0 },
  invitedUsers: [{
    userId: { type: String, required: true },
    isFake: { type: Boolean, default: false },
    joinedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

InviteRecordSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const InviteRecord = mongoose.model("InviteRecord", InviteRecordSchema);
