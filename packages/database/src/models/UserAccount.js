import mongoose from "mongoose";

const UserAccountSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  name: { type: String, default: "" },
  age: { type: Number, default: 0 },
  gender: { type: String, enum: ["MAN", "WOMAN", "MEMBER", "UNREGISTERED"], default: "UNREGISTERED" },
  registeredBy: { type: String, default: null },
  registeredAt: { type: Date, default: null },
  namesHistory: [{
    name: { type: String, required: true },
    age: { type: Number, default: 0 },
    roleAssigned: { type: String, default: "" },
    staffId: { type: String, default: "" },
    date: { type: Date, default: Date.now }
  }],
  isSuspicious: { type: Boolean, default: false },
  birthday: {
    day: { type: Number, default: null },
    month: { type: Number, default: null }
  }
}, { timestamps: true });

UserAccountSchema.index({ guildId: 1, userId: 1 }, { unique: true });

export const UserAccount = mongoose.model("UserAccount", UserAccountSchema);
