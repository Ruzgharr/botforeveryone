import mongoose from "mongoose";

const BackupSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  type: { type: String, enum: ["MANUAL", "AUTO", "EMERGENCY"], default: "AUTO" },
  roles: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: Number, default: 0 },
    hoist: { type: Boolean, default: false },
    position: { type: Number, default: 1 },
    permissions: { type: String, default: "0" },
    mentionable: { type: Boolean, default: false },
    members: { type: [String], default: [] }
  }],
  channels: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: Number, required: true },
    parentId: { type: String, default: null },
    position: { type: Number, default: 0 },
    permissionOverwrites: [{
      id: { type: String, required: true },
      type: { type: Number, default: 0 },
      allow: { type: String, default: "0" },
      deny: { type: String, default: "0" }
    }]
  }]
}, { timestamps: true });

BackupSchema.index({ guildId: 1, createdAt: -1 });

export const Backup = mongoose.model("Backup", BackupSchema);
