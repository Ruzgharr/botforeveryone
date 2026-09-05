import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { environment, defaultGuildConfig } from "@bot/config";
import { connectDatabase, GuildConfig, Penalty, Stat, VoiceBot, UserAccount, BotCredential, ForceBan, Ticket, Backup, Economy, InviteRecord, StaffTask } from "@bot/database";
import { Logger } from "@bot/core";
import welcomeManager from "../../voice-welcome/src/index.js";

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
    const isDbConnected = mongoose.connection.readyState === 1;
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
      databaseName: mongoose.connection.name || "public-bot-ecosystem",
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

app.get("/api/config/:guildId", async (req, res) => {
  try {
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
    const { serviceKey, name, clientId, token, enabled, activityType, activityText, status } = req.body;
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

    res.json({ success: true, credential: updated });
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
    res.status(500).json({ error: "Haftalik oduller alinamadi" });
  }
});

app.post("/api/weekly-rewards/:guildId", async (req, res) => {
  try {
    const { weeklyRewards } = req.body;
    if (!Array.isArray(weeklyRewards)) {
      return res.status(400).json({ error: "weeklyRewards array olmali" });
    }
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.guildId },
      { $set: { weeklyRewards } },
      { new: true, upsert: true }
    );
    res.json({ success: true, weeklyRewards: config.weeklyRewards });
  } catch (error) {
    res.status(500).json({ error: "Haftalik oduller kaydedilemedi" });
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
    res.status(500).json({ error: "Yetkili rolleri alinamadi" });
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
    const cred = await BotCredential.findOne({ enabled: true, token: { $ne: "" } }).catch(() => null);
    const token = cred?.token || environment.tokens.moderation || environment.tokens.utility;
    if (!token) return res.json([]);
    const discordUrl = "https:".concat("/").concat("/discord.com/api/v10/channels/") + req.params.channelId + "/messages?limit=25";
    const resp = await fetch(discordUrl, {
      headers: { Authorization: `Bot ${token}` }
    });
    if (!resp.ok) return res.json([]);
    const msgs = await resp.json();
    const mapped = (Array.isArray(msgs) ? msgs : []).reverse().map((m) => ({
      id: m.id,
      author: m.author?.username || "Bilinmiyor",
      content: m.content || "",
      timestamp: m.timestamp
    }));
    res.json(mapped);
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

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

export async function startDashboard() {
  app.listen(environment.dashboardPort, () => {
    logger.success(`Ultra-Sade Web Dashboard http://localhost:${environment.dashboardPort} adresinde yayında.`);
  });
  connectDatabase(environment.mongoUri)
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
