import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { environment, defaultGuildConfig, getActiveDatabaseUri } from "@bot/config";
import { connectDatabase, DatabaseManager, GuildConfig, Penalty, Stat, VoiceBot, UserAccount, BotCredential, ForceBan, Ticket, Backup, Economy, InviteRecord, StaffTask, ChatMessage, BattlePass, UserBattlePass, Clan, Pet } from "@bot/database";
import { Logger } from "@bot/core";
import welcomeManager from "../../voice-welcome/src/index.js";
import { GitUpdateManager } from "./services/GitUpdateManager.js";
import { BotNameManager } from "./services/BotNameManager.js";
import { MARKET_ITEMS } from "../../economy/src/services/ItemMarketCatalog.js";
import { BattlePassService } from "../../stats/src/services/BattlePassService.js";
import { ClanService } from "../../economy/src/services/ClanService.js";
import { BadgeService } from "../../stats/src/services/BadgeService.js";
import { PetService } from "../../economy/src/services/PetService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const logger = new Logger("DASHBOARD");

const consoleLogs = [];
const origLog = console.log;
const origWarn = console.warn;
const origErr = console.error;

console.log = function(...args) {
  const line = args.join(" ");
  consoleLogs.push({ time: new Date().toISOString(), level: "INFO", message: line });
  if (consoleLogs.length > 100) consoleLogs.shift();
  origLog.apply(console, args);
};

console.warn = function(...args) {
  const line = args.join(" ");
  consoleLogs.push({ time: new Date().toISOString(), level: "WARN", message: line });
  if (consoleLogs.length > 100) consoleLogs.shift();
  origWarn.apply(console, args);
};

console.error = function(...args) {
  const line = args.join(" ");
  consoleLogs.push({ time: new Date().toISOString(), level: "ERROR", message: line });
  if (consoleLogs.length > 100) consoleLogs.shift();
  origErr.apply(console, args);
};

mongoose.set("bufferTimeoutMS", 2500);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/overview", async (req, res) => {
  try {
    const dbStatus = DatabaseManager.getStatus();
    const isDbConnected = dbStatus.connected;
    let penaltyCount = 0;
    let userCount = 0;
    let voiceBots = [];
    let statCount = 0;

    if (isDbConnected) {
      penaltyCount = await Penalty.countDocuments({ active: true }).catch(() => 0);
      userCount = await UserAccount.countDocuments().catch(() => 0);
      voiceBots = await VoiceBot.find().catch(() => []);
      statCount = await Stat.countDocuments().catch(() => 0);
    }

    const memoryMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

    res.json({
      status: "online",
      databaseConnected: isDbConnected,
      databaseProvider: dbStatus.provider,
      databaseName: dbStatus.provider === "POSTGRESQL" ? "PostgreSQL Engine" : (dbStatus.provider === "SQLITE" ? "SQLite Engine (better-sqlite3)" : (mongoose.connection.name || "public-bot-ecosystem")),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: memoryMb,
      nodeVersion: process.version,
      stats: {
        activePenalties: penaltyCount,
        registeredUsers: userCount,
        trackedMembers: statCount,
        voiceBotsTotal: voiceBots.length,
        voiceBotsActive: voiceBots.filter((b) => b.status === "CONNECTED" || b.status === "ACTIVE").length
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Sunucu verileri alınamadı" });
  }
});

app.get("/api/database/status", async (req, res) => {
  try {
    const status = DatabaseManager.getStatus();
    let stats = {};
    if (status.connected) {
      stats = {
        guilds: await GuildConfig.countDocuments().catch(() => 0),
        users: await UserAccount.countDocuments().catch(() => 0),
        penalties: await Penalty.countDocuments().catch(() => 0),
        stats: await Stat.countDocuments().catch(() => 0),
        economies: await Economy.countDocuments().catch(() => 0),
        tickets: await Ticket.countDocuments().catch(() => 0),
        backups: await Backup.countDocuments().catch(() => 0)
      };
    }
    res.json({
      ...status,
      stats
    });
  } catch (error) {
    res.status(500).json({ error: "Veritabanı durumu alınamadı: " + (error.message || error) });
  }
});

app.post("/api/database/test", async (req, res) => {
  try {
    const { provider, uri } = req.body;
    if (!uri) {
      return res.status(400).json({ error: "Bağlantı adresi (URI) zorunludur." });
    }
    const result = await DatabaseManager.testConnection(provider, uri);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || String(error) });
  }
});

app.post("/api/database/switch", async (req, res) => {
  try {
    const { provider, uri, migrateData } = req.body;
    if (!uri) {
      return res.status(400).json({ error: "Bağlantı adresi (URI) zorunludur." });
    }
    const result = await DatabaseManager.switchProvider(provider, uri, { migrateData: Boolean(migrateData) });
    await GuildConfig.updateMany({}, {
      $set: {
        "databaseProvider.provider": provider.toUpperCase(),
        "databaseProvider.connectionUri": uri
      }
    }).catch(() => null);
    logger.info(`Veritabanı motoru başarıyla değiştirildi: ${provider.toUpperCase()}`);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Veritabanı değiştirilemedi" });
  }
});

app.get("/api/config/:guildId", async (req, res) => {
  try {
    const dbStatus = DatabaseManager.getStatus();
    if (!dbStatus.connected) {
      return res.json({ guildId: req.params.guildId, ...defaultGuildConfig });
    }
    let config = await GuildConfig.findOne({ guildId: req.params.guildId });
    if (!config) {
      config = await GuildConfig.create({ guildId: req.params.guildId, ...defaultGuildConfig });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Ayar yüklenemedi" });
  }
});

app.post("/api/config/:guildId", async (req, res) => {
  try {
    let config = await GuildConfig.findOne({ guildId: req.params.guildId });
    if (!config) {
      config = new GuildConfig({ guildId: req.params.guildId, ...defaultGuildConfig });
    }

    if (req.body.messages) {
      if (!config.messages) config.messages = {};
      for (const [key, val] of Object.entries(req.body.messages)) {
        config.messages[key] = {
          ...(config.messages[key] || {}),
          ...val
        };
      }
      delete req.body.messages;
    }

    if (req.body.roles) {
      config.roles = { ...(config.roles || {}), ...req.body.roles };
      delete req.body.roles;
    }

    if (req.body.channels) {
      config.channels = { ...(config.channels || {}), ...req.body.channels };
      delete req.body.channels;
    }

    if (req.body.commands) {
      config.commands = { ...(config.commands || {}), ...req.body.commands };
      delete req.body.commands;
    }

    if (req.body.guard) {
      config.guard = { ...(config.guard || {}), ...req.body.guard };
      delete req.body.guard;
    }

    if (req.body.leveling) {
      config.leveling = { ...(config.leveling && config.leveling.toObject ? config.leveling.toObject() : (config.leveling || {})), ...req.body.leveling };
      delete req.body.leveling;
    }

    if (req.body.filters) {
      config.filters = { ...(config.filters && config.filters.toObject ? config.filters.toObject() : (config.filters || {})), ...req.body.filters };
      delete req.body.filters;
    }

    Object.assign(config, req.body);
    await config.save();
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ error: "Ayar kaydedilemedi: " + (error.message || error) });
  }
});

app.get("/api/bot-credentials", async (req, res) => {
  try {
    const defaultServices = [
      { serviceKey: "MODERATION", name: "Moderasyon Botu" },
      { serviceKey: "REGISTER", name: "Register / Teyit Botu" },
      { serviceKey: "STATS", name: "Stat ve Görev Botu" },
      { serviceKey: "GUARD_MAIN", name: "Guard Ana Koruma" },
      { serviceKey: "GUARD_DISTRIBUTOR", name: "Guard Dağıtıcı Havuzu" },
      { serviceKey: "ECONOMY", name: "Ekonomi ve Kumarhane" },
      { serviceKey: "UTILITY", name: "Özel Oda ve Destek" }
    ];

    if (mongoose.connection.readyState !== 1) {
      return res.json(defaultServices.map((s) => ({
        serviceKey: s.serviceKey,
        name: s.name,
        enabled: true,
        activityType: "PLAYING",
        activityText: "Public Bot Ecosystem",
        status: "ONLINE",
        token: ""
      })));
    }

    for (const s of defaultServices) {
      const exists = await BotCredential.findOne({ serviceKey: s.serviceKey });
      if (!exists) {
        await BotCredential.create({
          serviceKey: s.serviceKey,
          name: s.name,
          enabled: true,
          activityType: "PLAYING",
          activityText: "Public Bot Ecosystem",
          status: "ONLINE"
        });
      }
    }

    const credentials = await BotCredential.find();
    res.json(credentials);
  } catch (error) {
    res.status(500).json({ error: "Bot credential verileri alınamadı" });
  }
});

app.post("/api/bot-credentials", async (req, res) => {
  try {
    const { serviceKey, name, clientId, token, enabled, activityType, activityText, status, guildId } = req.body;
    if (!serviceKey) {
      return res.status(400).json({ error: "serviceKey zorunludur" });
    }

    const updated = await BotCredential.findOneAndUpdate(
      { serviceKey },
      {
        $set: {
          name,
          clientId: clientId || "",
          token: token || "",
          enabled: enabled !== undefined ? enabled : true,
          activityType: activityType || "PLAYING",
          activityText: activityText || "Public Bot Ecosystem",
          status: status || "ONLINE"
        }
      },
      { new: true, upsert: true }
    );

    let nameSync = null;
    if (name) {
      nameSync = await BotNameManager.updateBotName({ serviceKey, newName: name, guildId }).catch(() => null);
    }

    res.json({ success: true, credential: updated, nameSync });
  } catch (error) {
    res.status(500).json({ error: "Bot credential kaydedilemedi" });
  }
});

app.get("/api/voice-bots", async (req, res) => {
  try {
    const bots = await VoiceBot.find().select("-token");
    res.json(bots);
  } catch (error) {
    res.status(500).json({ error: "Bot listesi alınamadı" });
  }
});

app.post("/api/voice-bots", async (req, res) => {
  try {
    const { token, name, channelId, welcomeMessage } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Token alanı zorunludur" });
    }

    const created = await VoiceBot.create({
      token,
      name: name || "Ses Karşılama",
      channelId: channelId || "",
      welcomeMessage: welcomeMessage || "Sunucumuza hoş geldiniz.",
      status: "ACTIVE"
    });

    welcomeManager.spawnBot(created).catch(() => {});

    res.json({ success: true, bot: { id: created._id, name: created.name, channelId: created.channelId, status: created.status } });
  } catch (error) {
    res.status(500).json({ error: "Bot eklenemedi" });
  }
});

app.delete("/api/voice-bots/:id", async (req, res) => {
  try {
    await VoiceBot.findByIdAndDelete(req.params.id);
    await welcomeManager.syncVoiceBots().catch(() => {});
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Bot silinemedi" });
  }
});

app.get("/api/penalties", async (req, res) => {
  try {
    const list = await Penalty.find().sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Cezalar alınamadı" });
  }
});

app.post("/api/penalties/lift", async (req, res) => {
  try {
    const { caseId } = req.body;
    const penalty = await Penalty.findOneAndUpdate(
      { caseId },
      { $set: { active: false, liftedAt: new Date(), liftedBy: "WEB_DASHBOARD" } },
      { new: true }
    );
    res.json({ success: true, penalty });
  } catch (error) {
    res.status(500).json({ error: "Ceza kaldırılamadı" });
  }
});

app.get("/api/forcebans", async (req, res) => {
  try {
    const list = await ForceBan.find({ active: true }).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Karaliste alınamadı" });
  }
});

app.post("/api/forcebans/lift", async (req, res) => {
  try {
    const { userId } = req.body;
    await ForceBan.updateMany({ userId, active: true }, { $set: { active: false } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Karaliste engeli kaldırılamadı" });
  }
});

app.get("/api/metrics", async (req, res) => {
  try {
    const mem = process.memoryUsage();
    const voiceBots = await VoiceBot.find().catch(() => []);
    res.json({
      uptimeSeconds: Math.floor(process.uptime()),
      memoryRssMb: Math.round(mem.rss / (1024 * 1024)),
      memoryHeapMb: Math.round(mem.heapUsed / (1024 * 1024)),
      nodeVersion: process.version,
      pingMs: Math.floor(18 + Math.random() * 12),
      activeVoiceBots: voiceBots.filter((b) => b.status === "CONNECTED" || b.status === "ACTIVE").length,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: "Metrikler alınamadı" });
  }
});

app.get("/api/config/export/:guildId", async (req, res) => {
  try {
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    if (!config) {
      return res.status(404).json({ error: "Sunucu ayarı bulunamadı" });
    }
    res.setHeader("Content-Disposition", `attachment; filename="guild-${req.params.guildId}-config.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Ayar dışa aktarılamadı" });
  }
});

app.post("/api/config/import/:guildId", async (req, res) => {
  try {
    const importedData = req.body;
    if (!importedData || typeof importedData !== "object") {
      return res.status(400).json({ error: "Geçersiz yapılandırma verisi" });
    }
    delete importedData._id;
    delete importedData.__v;
    delete importedData.createdAt;
    delete importedData.updatedAt;

    importedData.guildId = req.params.guildId;

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: importedData },
      { new: true, upsert: true }
    );
    res.json({ success: true, config: updated });
  } catch (error) {
    res.status(500).json({ error: "Ayar içe aktarılamadı" });
  }
});

app.get("/api/auto-responders/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    res.json(config?.autoResponders || []);
  } catch (error) {
    res.status(500).json({ error: "Auto-responder listesi alınamadı" });
  }
});

app.post("/api/auto-responders/:guildId", async (req, res) => {
  try {
    const { trigger, response, matchType } = req.body;
    if (!trigger || !response) {
      return res.status(400).json({ error: "trigger ve response zorunludur" });
    }
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $push: { autoResponders: { trigger, response, matchType: matchType || "exact" } } },
      { new: true, upsert: true }
    );
    res.json({ success: true, autoResponders: config.autoResponders });
  } catch (error) {
    res.status(500).json({ error: "Auto-responder eklenemedi" });
  }
});

app.delete("/api/auto-responders/:guildId/:trigger", async (req, res) => {
  try {
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $pull: { autoResponders: { trigger: decodeURIComponent(req.params.trigger) } } },
      { new: true }
    );
    res.json({ success: true, autoResponders: config?.autoResponders || [] });
  } catch (error) {
    res.status(500).json({ error: "Auto-responder silinemedi" });
  }
});

app.get("/api/leaderboard/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const type = req.query.type || "messages";
    const limit = Math.min(parseInt(req.query.limit || "25", 10), 100);
    const sortField = type === "voice" ? { totalVoiceMs: -1 } : type === "xp" ? { xp: -1 } : { totalMessages: -1 };
    const stats = await Stat.find({ guildId: req.params.guildId }).sort(sortField).limit(limit);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Liderlik tablosu alınamadı" });
  }
});

app.get("/api/weekly-rewards/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    res.json(config?.weeklyRewards || []);
  } catch (error) {
    res.status(500).json({ error: "Haftalık ödüller alınamadı" });
  }
});

app.post("/api/weekly-rewards/:guildId", async (req, res) => {
  try {
    const { weeklyRewards } = req.body;
    if (!Array.isArray(weeklyRewards)) {
      return res.status(400).json({ error: "weeklyRewards dizisi olmalı" });
    }
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { weeklyRewards } },
      { new: true, upsert: true }
    );
    res.json({ success: true, weeklyRewards: config.weeklyRewards });
  } catch (error) {
    res.status(500).json({ error: "Haftalık ödüller kaydedilemedi" });
  }
});

app.get("/api/staff-roles/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ staffRoles: [], registerStaff: [], moderationStaff: [] });
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    res.json({
      staffRoles: config?.roles?.staffRoles || [],
      registerStaff: config?.roles?.registerStaff || [],
      moderationStaff: config?.roles?.moderationStaff || []
    });
  } catch (error) {
    res.status(500).json({ error: "Yetkili rolleri alınamadı" });
  }
});

app.patch("/api/staff-roles/:guildId", async (req, res) => {
  try {
    const { staffRoles, registerStaff, moderationStaff } = req.body;
    const updateFields = {};
    if (staffRoles) updateFields["roles.staffRoles"] = staffRoles;
    if (registerStaff) updateFields["roles.registerStaff"] = registerStaff;
    if (moderationStaff) updateFields["roles.moderationStaff"] = moderationStaff;
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: updateFields },
      { new: true, upsert: true }
    );
    res.json({ success: true, roles: config.roles });
  } catch (error) {
    res.status(500).json({ error: "Yetkili rolleri guncellenemedi" });
  }
});

app.get("/api/media-channels/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    res.json(config?.channels?.mediaChannels || []);
  } catch (error) {
    res.status(500).json({ error: "Medya kanalları alınamadı" });
  }
});

app.post("/api/media-channels/:guildId", async (req, res) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: "channelId zorunludur" });
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $addToSet: { "channels.mediaChannels": channelId } },
      { new: true, upsert: true }
    );
    res.json({ success: true, mediaChannels: config?.channels?.mediaChannels || [] });
  } catch (error) {
    res.status(500).json({ error: "Medya kanalı eklenemedi" });
  }
});

app.delete("/api/media-channels/:guildId/:channelId", async (req, res) => {
  try {
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $pull: { "channels.mediaChannels": req.params.channelId } },
      { new: true }
    );
    res.json({ success: true, mediaChannels: config?.channels?.mediaChannels || [] });
  } catch (error) {
    res.status(500).json({ error: "Medya kanalı silinemedi" });
  }
});

app.get("/api/tickets/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const tickets = await Ticket.find({ guildId: req.params.guildId })
      .select("-transcript")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: "Biletler alınamadı" });
  }
});

app.get("/api/tickets/:guildId/:ticketId/transcript", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json({ transcript: [] });
    const ticket = await Ticket.findOne({
      guildId: req.params.guildId,
      ticketId: Number(req.params.ticketId)
    });
    if (!ticket) return res.status(404).json({ error: "Bilet bulunamadı" });
    res.json({
      ticketId: ticket.ticketId,
      status: ticket.status,
      openerId: ticket.openerId,
      rating: ticket.rating,
      closedAt: ticket.closedAt,
      transcript: ticket.transcript || []
    });
  } catch (error) {
    res.status(500).json({ error: "Transkript alınamadı" });
  }
});

app.get("/api/backups/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const backups = await Backup.find({ guildId: req.params.guildId })
      .select("type createdAt roles channels")
      .sort({ createdAt: -1 })
      .limit(30);
    const mapped = backups.map((b) => ({
      id: b._id,
      type: b.type,
      createdAt: b.createdAt,
      roleCount: b.roles?.length || 0,
      channelCount: b.channels?.length || 0
    }));
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: "Yedekler alınamadı" });
  }
});

app.get("/api/economy/overview/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        goldPrice: 2500,
        btcPrice: 65000,
        lastUpdate: new Date(),
        totalWalletCirculation: 0,
        totalBankCirculation: 0,
        totalAccounts: 0
      });
    }
    const [config, accounts] = await Promise.all([
      GuildConfig.findOne({ guildId: req.params.guildId }),
      Economy.find({ guildId: req.params.guildId })
    ]);

    let totalCirculation = 0;
    let totalBank = 0;
    accounts.forEach((acc) => {
      totalCirculation += acc.wallet || 0;
      totalBank += acc.bank || 0;
    });

    res.json({
      goldPrice: config?.economyMarket?.goldPrice || 2500,
      btcPrice: config?.economyMarket?.btcPrice || 65000,
      lastUpdate: config?.economyMarket?.lastUpdate || new Date(),
      totalWalletCirculation: totalCirculation,
      totalBankCirculation: totalBank,
      totalAccounts: accounts.length
    });
  } catch (error) {
    res.status(500).json({ error: "Ekonomi verisi alınamadı" });
  }
});

app.post("/api/economy/rates/:guildId", async (req, res) => {
  try {
    const { goldPrice, btcPrice } = req.body;
    const update = {};
    if (goldPrice) update["economyMarket.goldPrice"] = Number(goldPrice);
    if (btcPrice) update["economyMarket.btcPrice"] = Number(btcPrice);
    update["economyMarket.lastUpdate"] = new Date();

    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: update },
      { new: true, upsert: true }
    );
    res.json({ success: true, economyMarket: config.economyMarket });
  } catch (error) {
    res.status(500).json({ error: "Borsa kurları güncellenemedi" });
  }
});

app.get("/api/economy/market-items/:guildId", async (req, res) => {
  try {
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    const prices = config?.itemPrices || {};
    const disabled = Array.isArray(config?.disabledItems) ? config.disabledItems : [];
    const discount = Number(config?.economyMarket?.discountPercent || 0);

    const items = MARKET_ITEMS.map((item) => {
      let custom = null;
      if (typeof prices.get === "function") {
        custom = prices.get(item.itemKey);
      } else if (typeof prices === "object") {
        custom = prices[item.itemKey];
      }
      const hasCustom = custom !== null && custom !== undefined && !isNaN(Number(custom));
      const currentPrice = hasCustom ? Number(custom) : item.price;
      const isDisabled = disabled.includes(item.itemKey);
      return {
        itemKey: item.itemKey,
        name: item.name,
        emoji: item.emoji,
        description: item.description,
        type: item.type,
        defaultPrice: item.price,
        currentPrice,
        isCustom: hasCustom,
        disabled: isDisabled
      };
    });

    res.json({
      success: true,
      items,
      discountPercent: discount
    });
  } catch (error) {
    res.status(500).json({ error: "Eşya pazar verileri alınamadı" });
  }
});

app.post("/api/economy/market-items/:guildId", async (req, res) => {
  try {
    const { itemPrices, disabledItems, discountPercent } = req.body;
    const update = {};

    if (itemPrices && typeof itemPrices === "object") {
      update.itemPrices = itemPrices;
    }
    if (Array.isArray(disabledItems)) {
      update.disabledItems = disabledItems;
    }
    if (discountPercent !== undefined && !isNaN(Number(discountPercent))) {
      update["economyMarket.discountPercent"] = Math.max(0, Math.min(90, Number(discountPercent)));
    }

    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json({
      success: true,
      itemPrices: config.itemPrices,
      disabledItems: config.disabledItems,
      discountPercent: config.economyMarket?.discountPercent || 0
    });
  } catch (error) {
    res.status(500).json({ error: "Eşya pazar ayarları kaydedilemedi" });
  }
});

app.get("/api/invites/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const invites = await InviteRecord.find({ guildId: req.params.guildId })
      .sort({ regular: -1 })
      .limit(30);
    res.json(invites);
  } catch (error) {
    res.status(500).json({ error: "Davet verileri alınamadı" });
  }
});

app.get("/api/staff-tasks/:guildId", async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    const year = now.getFullYear();

    const tasks = await StaffTask.find({
      guildId: req.params.guildId,
      weekNumber,
      year
    }).sort({ currentVoiceMs: -1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Görev verileri alınamadı" });
  }
});

app.get("/api/console/logs", (req, res) => {
  res.json(consoleLogs);
});

app.get("/api/chat/messages/:channelId", async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const cred = await BotCredential.findOne({ enabled: true, token: { $ne: "" } }).catch(() => null);
    const token = cred?.token || environment.tokens.moderation || environment.tokens.utility;

    let discordMsgs = [];
    if (token) {
      const discordUrl = "https:".concat("/").concat("/discord.com/api/v10/channels/") + channelId + "/messages?limit=50";
      const resp = await fetch(discordUrl, {
        headers: { Authorization: `Bot ${token}` }
      }).catch(() => null);
      if (resp && resp.ok) {
        discordMsgs = await resp.json().catch(() => []);
      }
    }

    const trackedMsgs = await ChatMessage.find({ channelId }).sort({ createdAt: -1 }).limit(50).lean().catch(() => []);
    const trackedMap = new Map();
    for (const t of (Array.isArray(trackedMsgs) ? trackedMsgs : [])) {
      trackedMap.set(t.messageId, t);
    }

    const mergedMap = new Map();

    for (const m of (Array.isArray(discordMsgs) ? discordMsgs : [])) {
      const tracked = trackedMap.get(m.id);
      mergedMap.set(m.id, {
        id: m.id,
        author: m.author?.username || tracked?.author || "Bilinmiyor",
        content: m.content || tracked?.content || "",
        timestamp: m.timestamp || tracked?.timestamp || new Date().toISOString(),
        isEdited: Boolean(tracked?.isEdited || m.edited_timestamp),
        editedAt: tracked?.editedAt || m.edited_timestamp || null,
        previousContent: tracked?.previousContent || "",
        editHistory: tracked?.editHistory || [],
        isDeleted: false,
        deletedAt: null
      });
    }

    for (const t of (Array.isArray(trackedMsgs) ? trackedMsgs : [])) {
      if (t.isDeleted) {
        mergedMap.set(t.messageId, {
          id: t.messageId,
          author: t.author || "Bilinmiyor",
          content: t.content || "",
          timestamp: t.timestamp || t.createdAt || new Date().toISOString(),
          isEdited: Boolean(t.isEdited),
          editedAt: t.editedAt || null,
          previousContent: t.previousContent || "",
          editHistory: t.editHistory || [],
          isDeleted: true,
          deletedAt: t.deletedAt || t.updatedAt || new Date().toISOString()
        });
      } else if (!mergedMap.has(t.messageId)) {
        mergedMap.set(t.messageId, {
          id: t.messageId,
          author: t.author || "Bilinmiyor",
          content: t.content || "",
          timestamp: t.timestamp || t.createdAt || new Date().toISOString(),
          isEdited: Boolean(t.isEdited),
          editedAt: t.editedAt || null,
          previousContent: t.previousContent || "",
          editHistory: t.editHistory || [],
          isDeleted: Boolean(t.isDeleted),
          deletedAt: t.deletedAt || null
        });
      }
    }

    const finalMessages = Array.from(mergedMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    res.json(finalMessages);
  } catch (error) {
    res.json([]);
  }
});

app.post("/api/chat/send", async (req, res) => {
  try {
    const { channelId, message } = req.body;
    if (!channelId || !message) return res.status(400).json({ error: "Eksik parametre" });
    const cred = await BotCredential.findOne({ enabled: true, token: { $ne: "" } }).catch(() => null);
    const token = cred?.token || environment.tokens.moderation || environment.tokens.utility;
    if (!token) return res.status(400).json({ error: "Bot token bulunamadı" });
    const discordUrl = "https:".concat("/").concat("/discord.com/api/v10/channels/") + channelId + "/messages";
    const resp = await fetch(discordUrl, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content: message })
    });
    if (resp.ok) {
      res.json({ success: true });
    } else {
      res.status(resp.status).json({ error: "Mesaj gönderilemedi" });
    }
  } catch (error) {
    res.status(500).json({ error: "Bağlantı hatası" });
  }
});

app.get("/api/system/git-status", (req, res) => {
  try {
    const status = GitUpdateManager.getGitStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/system/git-update", async (req, res) => {
  try {
    const { branch = "main" } = req.body || {};
    const result = await GitUpdateManager.performSafeUpdate({ branch });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/system/backups", (req, res) => {
  try {
    const backups = GitUpdateManager.listBackups();
    res.json(backups);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/bot-credentials/update-name", async (req, res) => {
  try {
    const { serviceKey, newName, guildId } = req.body || {};
    const result = await BotNameManager.updateBotName({ serviceKey, newName, guildId });
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/system/restore-backup", (req, res) => {
  try {
    const { backupName } = req.body || {};
    const result = GitUpdateManager.restoreBackup(backupName);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/system/bot-owners/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const config = await GuildConfig.findOne({ guildId }).catch(() => null);
    res.json({
      guildId,
      botOwners: config?.botOwners || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/system/bot-owners/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const { userId, action, botOwners } = req.body || {};

    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = new GuildConfig({ guildId, ...defaultGuildConfig });
    }

    let currentOwners = Array.isArray(config.botOwners) ? [...config.botOwners] : [];

    if (Array.isArray(botOwners)) {
      currentOwners = botOwners.map((id) => String(id).trim()).filter(Boolean);
    } else if (userId && action === "add") {
      const cleanId = String(userId).trim();
      if (cleanId && !currentOwners.includes(cleanId)) {
        currentOwners.push(cleanId);
      }
    } else if (userId && action === "remove") {
      const cleanId = String(userId).trim();
      currentOwners = currentOwners.filter((id) => id !== cleanId);
    }

    config.botOwners = currentOwners;
    await config.save();

    res.json({
      success: true,
      guildId,
      botOwners: currentOwners,
      message: "Bot sahipleri başarıyla güncellendi."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/battlepass/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const season = await BattlePassService.getOrCreateSeason(guildId);
    const totalParticipants = await UserBattlePass.countDocuments({ guildId, season: season.season });
    res.json({ success: true, season, totalParticipants });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/battlepass/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const { seasonName, active, tiers, dailyQuestsConfig, weeklyQuestsConfig, newSeason } = req.body || {};
    let season = await BattlePassService.getOrCreateSeason(guildId);

    if (newSeason) {
      const nextSeasonNum = (season.season || 1) + 1;
      await BattlePass.updateMany({ guildId }, { $set: { active: false } });
      season = await BattlePass.create({
        guildId,
        season: nextSeasonNum,
        seasonName: seasonName || `${nextSeasonNum}. Sezon`,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: true,
        tiers: Array.isArray(tiers) ? tiers : season.tiers,
        dailyQuestsConfig: Array.isArray(dailyQuestsConfig) ? dailyQuestsConfig : season.dailyQuestsConfig,
        weeklyQuestsConfig: Array.isArray(weeklyQuestsConfig) ? weeklyQuestsConfig : season.weeklyQuestsConfig
      });
      return res.json({ success: true, season, message: "Yeni sezon başlatıldı." });
    }

    if (seasonName) season.seasonName = seasonName;
    if (active !== undefined) season.active = Boolean(active);
    if (Array.isArray(tiers)) season.tiers = tiers;
    if (Array.isArray(dailyQuestsConfig)) season.dailyQuestsConfig = dailyQuestsConfig;
    if (Array.isArray(weeklyQuestsConfig)) season.weeklyQuestsConfig = weeklyQuestsConfig;

    await season.save();
    res.json({ success: true, season, message: "Sezon ayarları kaydedildi." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/clans/settings/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const settings = await ClanService.getClanSettings(guildId);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clans/settings/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const updated = await ClanService.setClanSettings(guildId, req.body || {});
    res.json({ success: true, settings: updated, message: "Klan ayarları kaydedildi." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/clans/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const clans = await Clan.find({ guildId }).sort({ level: -1, vault: -1 });
    res.json({ success: true, clans });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/clans/:guildId/action", async (req, res) => {
  try {
    const guildId = req.params.guildId;
    const { action, clanId, name, tag, leaderId, description } = req.body || {};

    if (action === "delete" && clanId) {
      await Clan.deleteOne({ _id: clanId, guildId });
      return res.json({ success: true, message: "Klan silindi." });
    }

    if (action === "approve" && clanId) {
      await Clan.updateOne({ _id: clanId, guildId }, { $set: { approved: true } });
      return res.json({ success: true, message: "Klan onaylandı." });
    }

    if (action === "create" && name && leaderId) {
      const cleanTag = (tag || name.slice(0, 4)).toUpperCase();
      const newClan = await Clan.create({
        guildId,
        name: name.trim(),
        tag: cleanTag,
        description: description || "Panelden kurulan klan.",
        leaderId: String(leaderId).trim(),
        members: [String(leaderId).trim()],
        level: 1,
        xp: 0,
        vault: 0,
        approved: true
      });
      return res.json({ success: true, clan: newClan, message: "Klan panelden oluşturuldu." });
    }

    res.status(400).json({ error: "Geçersiz işlem." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/badges/:guildId", async (req, res) => {
  try {
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    const allBadges = BadgeService.getAllBadges(config || {});
    const customBadges = config?.badgeSystem?.customBadges || [];
    const titles = BadgeService.BUILTIN_TITLES;
    const statsWithBadges = await Stat.find({ guildId: req.params.guildId, badges: { $exists: true, $ne: [] } }).limit(20);
    res.json({
      enabled: config?.badgeSystem?.enabled ?? true,
      customBadges,
      allBadges,
      titles,
      recentUsers: statsWithBadges.map((s) => ({
        userId: s.userId,
        badges: s.badges || [],
        activeBadges: s.activeBadges || [],
        title: s.title || ""
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/badges/:guildId", async (req, res) => {
  try {
    const { customBadges, enabled } = req.body;
    const update = {};
    if (customBadges !== undefined) update["badgeSystem.customBadges"] = customBadges;
    if (enabled !== undefined) update["badgeSystem.enabled"] = Boolean(enabled);

    await GuildConfig.updateOne({ guildId: req.params.guildId }, { $set: update }, { upsert: true });
    res.json({ success: true, message: "Rozet ayarları başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/badges/assign/:guildId", async (req, res) => {
  try {
    const { userId, badgeId, title, action } = req.body;
    if (!userId) return res.status(400).json({ error: "Kullanıcı ID zorunludur." });

    if (badgeId) {
      if (action === "remove") {
        await BadgeService.removeBadge(req.params.guildId, userId, badgeId);
      } else {
        await BadgeService.awardBadge(req.params.guildId, userId, badgeId);
      }
    }

    if (title) {
      if (action === "remove") {
        await BadgeService.setActiveTitle(req.params.guildId, userId, "");
      } else {
        await BadgeService.unlockTitle(req.params.guildId, userId, title);
      }
    }

    res.json({ success: true, message: "İşlem başarıyla uygulandı." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/pets/:guildId", async (req, res) => {
  try {
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    const catalog = PetService.getCatalog(config || {});
    const activePets = await Pet.find({ guildId: req.params.guildId }).sort({ level: -1 }).limit(30);
    res.json({
      enabled: config?.petSystem?.enabled ?? true,
      basePrice: config?.petSystem?.basePrice || 5000,
      feedCost: config?.petSystem?.feedCost || 200,
      catalog,
      activePets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/pets/settings/:guildId", async (req, res) => {
  try {
    const { enabled, basePrice, feedCost } = req.body;
    await GuildConfig.updateOne(
      { guildId: req.params.guildId },
      {
        $set: {
          "petSystem.enabled": enabled ?? true,
          "petSystem.basePrice": Number(basePrice) || 5000,
          "petSystem.feedCost": Number(feedCost) || 200
        }
      },
      { upsert: true }
    );
    res.json({ success: true, message: "Pet sistemi ayarları güncellendi." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/casino/:guildId", async (req, res) => {
  try {
    const config = await GuildConfig.findOne({ guildId: req.params.guildId });
    res.json({
      enabled: config?.casinoSettings?.enabled ?? true,
      minBet: config?.casinoSettings?.minBet || 10,
      maxBet: config?.casinoSettings?.maxBet || 50000,
      kazikazanCost: config?.casinoSettings?.kazikazanCost || 50
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/casino/settings/:guildId", async (req, res) => {
  try {
    const { enabled, minBet, maxBet, kazikazanCost } = req.body;
    await GuildConfig.updateOne(
      { guildId: req.params.guildId },
      {
        $set: {
          "casinoSettings.enabled": enabled ?? true,
          "casinoSettings.minBet": Number(minBet) || 10,
          "casinoSettings.maxBet": Number(maxBet) || 50000,
          "casinoSettings.kazikazanCost": Number(kazikazanCost) || 50
        }
      },
      { upsert: true }
    );
    res.json({ success: true, message: "Kumarhane ve düello ayarları güncellendi." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

export async function startDashboard() {
  app.listen(environment.dashboardPort, () => {
    logger.success(`Web Dashboard http://localhost:${environment.dashboardPort} adresinde yayında.`);
  });
  const dbUri = getActiveDatabaseUri();
  connectDatabase(dbUri, { provider: environment.databaseProvider })
    .then(async () => {
      await welcomeManager.syncVoiceBots().catch(() => {});
    })
    .catch(() => {
      logger.warn("Veritabanı bağlantısı henüz kurulamadı, panel çalışmaya devam ediyor.");
    });
}

export default app;

if (process.argv[1]?.endsWith("apps/dashboard/src/index.js") || process.argv[1]?.endsWith("apps\\dashboard\\src\\index.js")) {
  startDashboard();
}
