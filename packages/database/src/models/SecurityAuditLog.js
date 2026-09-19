import mongoose from "mongoose";

const SecurityAuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  ip: { type: String, default: "127.0.0.1" },
  username: { type: String, default: "SYSTEM" },
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ["SUCCESS", "FAILURE", "BLOCKED"], default: "SUCCESS" },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export const SecurityAuditLog = mongoose.model("SecurityAuditLog", SecurityAuditLogSchema);
