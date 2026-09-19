import mongoose from "mongoose";

const DashboardAdminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  salt: { type: String, required: true },
  role: { type: String, default: "SUPERADMIN" },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null }
}, { timestamps: true });

export const DashboardAdmin = mongoose.model("DashboardAdmin", DashboardAdminSchema);
