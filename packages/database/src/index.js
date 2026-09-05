import mongoose from "mongoose";

export * from "./models/GuildConfig.js";
export * from "./models/Penalty.js";
export * from "./models/UserAccount.js";
export * from "./models/Stat.js";
export * from "./models/StaffTask.js";
export * from "./models/Economy.js";
export * from "./models/Backup.js";
export * from "./models/VoiceBot.js";
export * from "./models/Ticket.js";
export * from "./models/BotCredential.js";
export * from "./models/StaffKpi.js";
export * from "./models/MarketItem.js";
export * from "./models/ShopItem.js";
export * from "./models/ForceBan.js";
export * from "./models/InviteRecord.js";

export async function connectDatabase(uri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
