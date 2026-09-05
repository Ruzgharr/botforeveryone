import dotenv from "dotenv";
dotenv.config();

export { defaultGuildConfig } from "./defaults.js";

export const environment = {
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/public-bot-ecosystem",
  dashboardPort: Number(process.env.DASHBOARD_PORT) || 3000,
  dashboardSecret: process.env.DASHBOARD_SECRET || "public-ecosystem-secret-key",
  tokens: {
    moderation: process.env.TOKEN_MODERATION || "",
    register: process.env.TOKEN_REGISTER || "",
    stats: process.env.TOKEN_STATS || "",
    guardMain: process.env.TOKEN_GUARD_MAIN || "",
    distributor: (process.env.TOKENS_DISTRIBUTOR || "").split(",").filter(Boolean),
    voiceWelcome: (process.env.TOKENS_VOICE_WELCOME || "").split(",").filter(Boolean),
    economy: process.env.TOKEN_ECONOMY || "",
    utility: process.env.TOKEN_UTILITY || ""
  }
};
