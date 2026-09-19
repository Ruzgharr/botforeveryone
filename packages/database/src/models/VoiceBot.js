import mongoose from "mongoose";

const VoiceBotSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  name: { type: String, default: "Ses Karşılama Botu" },
  guildId: { type: String, default: "" },
  channelId: { type: String, default: "" },
  status: { type: String, enum: ["ACTIVE", "DISABLED", "CONNECTING", "CONNECTED", "ERROR"], default: "DISABLED" },
  autoReconnect: { type: Boolean, default: true },
  welcomeMessage: { type: String, default: "Sunucumuza hoş geldiniz. Kayıt olmak için lütfen yetkililerimizi bekleyiniz." },
  welcomeDelay: { type: Number, default: 2.5 },
  voiceSpeaker: { type: String, default: "tr-TR-AhmetNeural" }
}, { timestamps: true });

export const VoiceBot = mongoose.model("VoiceBot", VoiceBotSchema);
