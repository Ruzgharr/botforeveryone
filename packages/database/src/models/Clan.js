import mongoose from "mongoose";

const ClanSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  name: { type: String, required: true },
  tag: { type: String, required: true },
  description: { type: String, default: "Kudretli bir sunucu klanı." },
  leaderId: { type: String, required: true },
  deputies: { type: [String], default: [] },
  members: { type: [String], default: [] },
  level: { type: Number, default: 1 },
  xp: { type: Number, default: 0 },
  vault: { type: Number, default: 0 },
  badge: { type: String, default: "⚔️" },
  maxMembers: { type: Number, default: 15 },
  bannerUrl: { type: String, default: "" },
  upgrades: [{
    id: { type: String, required: true },
    level: { type: Number, default: 1 }
  }],
  approved: { type: Boolean, default: true },
  isFrozen: { type: Boolean, default: false }
}, { timestamps: true });

ClanSchema.index({ guildId: 1, name: 1 }, { unique: true });
ClanSchema.index({ guildId: 1, tag: 1 }, { unique: true });
ClanSchema.index({ guildId: 1, vault: -1 });
ClanSchema.index({ guildId: 1, level: -1, xp: -1 });

export const Clan = mongoose.model("Clan", ClanSchema);
