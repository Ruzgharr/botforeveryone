import mongoose from "mongoose";

const BotCredentialSchema = new mongoose.Schema({
  serviceKey: { 
    type: String, 
    required: true, 
    unique: true,
    enum: [
      "MODERATION", 
      "REGISTER", 
      "STATS", 
      "GUARD_MAIN", 
      "GUARD_DISTRIBUTOR", 
      "VOICE_WELCOME", 
      "ECONOMY", 
      "UTILITY"
    ] 
  },
  name: { type: String, required: true },
  clientId: { type: String, default: "" },
  token: { type: String, default: "" },
  enabled: { type: Boolean, default: true },
  activityType: { type: String, enum: ["PLAYING", "WATCHING", "LISTENING", "STREAMING", "CUSTOM"], default: "PLAYING" },
  activityText: { type: String, default: "Public Bot Ecosystem" },
  status: { type: String, enum: ["ONLINE", "IDLE", "DND", "OFFLINE"], default: "ONLINE" }
}, { timestamps: true });

export const BotCredential = mongoose.model("BotCredential", BotCredentialSchema);
