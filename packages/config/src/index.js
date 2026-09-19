import dotenv from "dotenv";
dotenv.config();

export { defaultGuildConfig } from "./defaults.js";

export const environment = {
  databaseProvider: (process.env.DATABASE_PROVIDER || "POSTGRESQL").toUpperCase(),
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/public-bot-ecosystem",
  postgresUri: process.env.POSTGRES_URI || process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/public_bot_ecosystem",
  sqlitePath: process.env.SQLITE_PATH || "./data/bot_ecosystem.sqlite",
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

export function getActiveDatabaseUri() {
  const provider = (process.env.DATABASE_PROVIDER || environment.databaseProvider || "POSTGRESQL").toUpperCase();
  if (provider === "POSTGRESQL") return environment.postgresUri;
  if (provider === "SQLITE" || provider === "BETTER-SQLITE3") return environment.sqlitePath;
  return environment.mongoUri;
}
