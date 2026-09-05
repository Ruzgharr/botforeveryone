import mongoose from "mongoose";

const VoiceBotSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  name: { type: String, default: "Ses Karsilama Botu" },
  guildId: { type: String, default: "" },
  channelId: { type: String, default: "" },
  status: { type: String, enum: ["ACTIVE", "DISABLED", "CONNECTING", "CONNECTED", "ERROR"], default: "DISABLED" },
  autoReconnect: { type: Boolean, default: true },
  welcomeMessage: { type: String, default: "Sunucumuza hos geldiniz. Kayit olmak icin lutfen yetkililerimizi bekleyiniz." }
}, { timestamps: true });

export const VoiceBot = mongoose.model("VoiceBot", VoiceBotSchema);
