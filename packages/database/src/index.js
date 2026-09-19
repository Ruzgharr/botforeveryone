import "./models/GuildConfig.js";
import "./models/Penalty.js";
import "./models/UserAccount.js";
import "./models/Stat.js";
import "./models/StaffTask.js";
import "./models/Economy.js";
import "./models/Backup.js";
import "./models/VoiceBot.js";
import "./models/Ticket.js";
import "./models/BotCredential.js";
import "./models/StaffKpi.js";
import "./models/MarketItem.js";
import "./models/ShopItem.js";
import "./models/ForceBan.js";
import "./models/InviteRecord.js";
import "./models/ChatMessage.js";
import "./models/BattlePass.js";
import "./models/UserBattlePass.js";
import "./models/Clan.js";
import "./models/Pet.js";
import "./models/DashboardAdmin.js";
import "./models/SecurityAuditLog.js";

import { DatabaseManager } from "./DatabaseManager.js";
import { DatabaseMigrator } from "./DatabaseMigrator.js";
import { PostgresDriver } from "./PostgresDriver.js";
import { SqliteDriver } from "./SqliteDriver.js";
import { encryptToken, decryptToken, isEncrypted } from "./CryptoHelper.js";

export { DatabaseManager, DatabaseMigrator, PostgresDriver, SqliteDriver, encryptToken, decryptToken, isEncrypted };

export const GuildConfig = DatabaseManager.getModel("GuildConfig");
export const Penalty = DatabaseManager.getModel("Penalty");
export const UserAccount = DatabaseManager.getModel("UserAccount");
export const Stat = DatabaseManager.getModel("Stat");
export const StaffTask = DatabaseManager.getModel("StaffTask");
export const Economy = DatabaseManager.getModel("Economy");
export const Backup = DatabaseManager.getModel("Backup");
export const VoiceBot = DatabaseManager.getModel("VoiceBot");
export const Ticket = DatabaseManager.getModel("Ticket");
export const BotCredential = DatabaseManager.getModel("BotCredential");
export const StaffKpi = DatabaseManager.getModel("StaffKpi");
export const MarketItem = DatabaseManager.getModel("MarketItem");
export const ShopItem = DatabaseManager.getModel("ShopItem");
export const ForceBan = DatabaseManager.getModel("ForceBan");
export const InviteRecord = DatabaseManager.getModel("InviteRecord");
export const ChatMessage = DatabaseManager.getModel("ChatMessage");
export const BattlePass = DatabaseManager.getModel("BattlePass");
export const UserBattlePass = DatabaseManager.getModel("UserBattlePass");
export const Clan = DatabaseManager.getModel("Clan");
export const Pet = DatabaseManager.getModel("Pet");
export const DashboardAdmin = DatabaseManager.getModel("DashboardAdmin");
export const SecurityAuditLog = DatabaseManager.getModel("SecurityAuditLog");

export async function connectDatabase(uri, options = {}) {
  return await DatabaseManager.connect(uri, options);
}

export async function disconnectDatabase() {
  return await DatabaseManager.disconnect();
}
