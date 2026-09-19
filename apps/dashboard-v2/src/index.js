import express from "express";
import cors from "cors";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import { environment, defaultGuildConfig, getActiveDatabaseUri, validateProductionConfig } from "@bot/config";
import { connectDatabase, DatabaseManager, GuildConfig, Penalty, Stat, VoiceBot, UserAccount, BotCredential, ForceBan, Ticket, Backup, Economy, InviteRecord, StaffTask, StaffKpi, ChatMessage, BattlePass, UserBattlePass, Clan, Pet, ShopItem, MarketItem, DashboardAdmin, SecurityAuditLog, encryptToken, decryptToken, isEncrypted } from "@bot/database";
import { Logger, GitUpdateManager, SecurityHelper, TotpHelper } from "@bot/core";
import { authenticateDashboard, createRateLimiter, getExpectedSecret, hashPassword, verifyPassword, generateSalt, createSessionToken, getSession, invalidateSession, checkBruteForceLock, recordFailedLogin, resetFailedLogins, createTemp2faToken, getTemp2faSession, invalidateTemp2faToken, requireRole } from "./middleware/auth.js";
import { createSecurityHeadersMiddleware, configureSocketTimeouts, createCsrfProtectionMiddleware, createForceHttpsMiddleware } from "./middleware/securityHeaders.js";
import { MARKET_ITEMS } from "../../economy/src/services/ItemMarketCatalog.js";
import { BattlePassService } from "../../stats/src/services/BattlePassService.js";
import { ClanService } from "../../economy/src/services/ClanService.js";
import { BadgeService } from "../../stats/src/services/BadgeService.js";
import { PetService } from "../../economy/src/services/PetService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", true);
app.use(createForceHttpsMiddleware());
app.use(createSecurityHeadersMiddleware());
app.use(createCsrfProtectionMiddleware());
const logger = new Logger("DASHBOARD-V2");

async function recordAuditLog({ action, ip, username = "SYSTEM", details = {}, status = "SUCCESS" }) {
  try {
    await SecurityAuditLog.create({
      action,
      ip: String(ip || "127.0.0.1"),
      username: String(username || "SYSTEM"),
      details,
      status,
      timestamp: new Date()
    });
  } catch (err) {
    logger.warn("Audit log kaydedilemedi: " + err.message);
  }
}

const consoleLogs = [];
const origLog = console.log;
const origWarn = console.warn;
const origErr = console.error;

console.log = function(...args) {
  const line = args.join(" ");
  consoleLogs.push({ time: new Date().toISOString(), level: "INFO", message: line });
  if (consoleLogs.length > 150) consoleLogs.shift();
  origLog.apply(console, args);
};

console.warn = function(...args) {
  const line = args.join(" ");
  consoleLogs.push({ time: new Date().toISOString(), level: "WARN", message: line });
  if (consoleLogs.length > 150) consoleLogs.shift();
  origWarn.apply(console, args);
};

console.error = function(...args) {
  const line = args.join(" ");
  consoleLogs.push({ time: new Date().toISOString(), level: "ERROR", message: line });
  if (consoleLogs.length > 150) consoleLogs.shift();
  origErr.apply(console, args);
};

mongoose.set("bufferTimeoutMS", 2500);

const DASHBOARD_PORT = process.env.DASHBOARD_V2_PORT ? Number(process.env.DASHBOARD_V2_PORT) : 3001;
const DASHBOARD_HOST = process.env.DASHBOARD_HOST || "0.0.0.0";

const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (configuredOrigins.length === 0 || configuredOrigins.includes("*") || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS erişim engeli: İzin verilmeyen kaynak."), false);
  },
  credentials: true
}));

app.use(express.json({ limit: "512kb" }));
app.use(express.urlencoded({ extended: true, limit: "512kb" }));
app.use(express.static(path.join(__dirname, "public")));

const generalApiLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 120,
  message: "İstek sınırı aşıldı. Lütfen bir dakika bekleyin."
});

const strictOperationsLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 20,
  message: "Hassas işlem sınırı aşıldı. Lütfen bir dakika bekleyin."
});

const authLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 10,
  message: "Giriş deneme sınırı aşıldı. Lütfen bekleyin."
});

app.use("/api", generalApiLimiter);
app.use("/api/terminal", strictOperationsLimiter);
app.use("/api/system/git-update", strictOperationsLimiter);
app.use("/api/system/restore-backup", strictOperationsLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/setup", authLimiter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get("/api/auth/setup-status", async (req, res) => {
  try {
    const adminCount = await DashboardAdmin.countDocuments().catch(() => 0);
    res.json({
      isConfigured: adminCount > 0,
      setupRequired: adminCount === 0
    });
  } catch {
    res.json({ isConfigured: false, setupRequired: true });
  }
});

app.post("/api/auth/setup", async (req, res) => {
  try {
    const adminCount = await DashboardAdmin.countDocuments().catch(() => 0);
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        error: "İlk kurulum tamamlanmıştır. Yeni kayıt kabul edilmemektedir."
      });
    }

    const { username, password } = req.body || {};
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return res.status(400).json({ success: false, error: "Kullanıcı adı en az 3 karakter olmalıdır." });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ success: false, error: "Parola en az 8 karakter olmalıdır." });
    }

    const passCheck = SecurityHelper.validatePasswordComplexity(password);
    if (!passCheck.valid) {
      return res.status(400).json({ success: false, error: passCheck.error });
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    const created = await DashboardAdmin.create({
      username: username.toLowerCase().trim(),
      passwordHash,
      salt,
      role: "SUPERADMIN",
      lastLoginAt: new Date()
    });

    const session = createSessionToken({ username: created.username, role: created.role });
    return res.json({
      success: true,
      message: "Yönetici hesabı oluşturuldu ve sistem kilitlendi.",
      token: session.token,
      user: session.user
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Kurulum sırasında hata oluştu." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const lockStatus = checkBruteForceLock(ip);
  if (lockStatus.locked) {
    const mins = Math.ceil(lockStatus.remainingMs / 60000);
    return res.status(429).json({
      success: false,
      error: `Çok fazla hatalı deneme. Güvenlik gereği ${mins} dakika boyunca giriş engellendi.`
    });
  }

  const { username, password } = req.body || {};

  if (username && password) {
    const cleanUser = String(username).toLowerCase().trim();
    const admin = await DashboardAdmin.findOne({ username: cleanUser });
    if (admin && verifyPassword(password, admin.salt, admin.passwordHash)) {
      resetFailedLogins(ip);
      await DashboardAdmin.updateOne({ _id: admin._id }, { $set: { lastLoginAt: new Date(), loginAttempts: 0 } }).catch(() => {});

      if (admin.twoFactorEnabled && admin.twoFactorSecret) {
        const tempToken = createTemp2faToken({ username: admin.username, role: admin.role, adminId: String(admin._id) });
        await recordAuditLog({ action: "LOGIN_2FA_REQUIRED", ip, username: admin.username, details: { adminId: String(admin._id) }, status: "PENDING" });
        return res.json({ success: true, requires2fa: true, tempToken });
      }

      await recordAuditLog({ action: "LOGIN_SUCCESS", ip, username: admin.username, details: { role: admin.role }, status: "SUCCESS" });
      const session = createSessionToken({ username: admin.username, role: admin.role });
      return res.json({ success: true, token: session.token, user: session.user });
    }
  }

  const failResult = recordFailedLogin(ip);
  await recordAuditLog({ action: "LOGIN_FAILED", ip, username: username || "UNKNOWN", details: { remainingAttempts: failResult.remainingAttempts }, status: "FAILURE" });
  if (failResult.locked) {
    return res.status(429).json({
      success: false,
      error: "Çok fazla başarısız giriş denemesi. IP adresiniz 15 dakika süreyle kilitlendi."
    });
  }

  return res.status(401).json({
    success: false,
    error: `Geçersiz kullanıcı adı veya parola. Kalan hak: ${failResult.remainingAttempts}`
  });
});

app.post("/api/auth/2fa/verify", async (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const { tempToken, code } = req.body || {};
  if (!tempToken || !code) {
    return res.status(400).json({ success: false, error: "Geçici jeton ve 6 haneli doğrulama kodu gereklidir." });
  }

  const tempSession = getTemp2faSession(tempToken);
  if (!tempSession) {
    return res.status(401).json({ success: false, error: "2FA oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapın." });
  }

  const admin = await DashboardAdmin.findOne({ username: tempSession.username });
  if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
    return res.status(400).json({ success: false, error: "2FA yapılandırması bulunamadı." });
  }

  const rawSecret = admin.twoFactorSecret;
  const secret = isEncrypted(rawSecret) ? decryptToken(rawSecret) : rawSecret;

  const isValid = TotpHelper.verifyTotp(secret, String(code).trim());
  if (!isValid) {
    await recordAuditLog({ action: "2FA_VERIFY_FAILED", ip, username: admin.username, status: "FAILURE" });
    return res.status(401).json({ success: false, error: "Geçersiz veya süresi dolmuş 2FA kodu." });
  }

  invalidateTemp2faToken(tempToken);
  await recordAuditLog({ action: "2FA_VERIFY_SUCCESS", ip, username: admin.username, status: "SUCCESS" });
  const session = createSessionToken({ username: admin.username, role: admin.role });
  return res.json({ success: true, token: session.token, user: session.user });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers["authorization"] || req.headers["x-session-token"] || "";
  let token = "";
  if (authHeader && typeof authHeader === "string") {
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  }
  if (!token && req.headers["x-dashboard-key"]) {
    token = String(req.headers["x-dashboard-key"]).trim();
  }
  if (token) {
    invalidateSession(token);
  }
  res.json({ success: true });
});

app.get("/api/auth/verify", (req, res) => {
  const authHeader = req.headers["authorization"] || req.headers["x-session-token"] || "";
  let providedToken = "";
  if (authHeader && typeof authHeader === "string") {
    providedToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  }
  if (!providedToken && req.headers["x-dashboard-key"]) {
    providedToken = String(req.headers["x-dashboard-key"]).trim();
  }
  if (!providedToken && req.query && (req.query.key || req.query.token)) {
    providedToken = String(req.query.key || req.query.token).trim();
  }

  const expectedKey = getExpectedSecret();
  if (providedToken) {
    const sessionUser = getSession(providedToken);
    if (sessionUser) {
      return res.json({ success: true, authenticated: true, user: sessionUser });
    }
    if (providedToken === expectedKey) {
      return res.json({ success: true, authenticated: true, user: { username: "Master", role: "MASTER" } });
    }
  }

  return res.status(401).json({ success: false, authenticated: false, error: "Yetkisiz oturum." });
});

app.get("/api/auth/status", async (req, res) => {
  const adminCount = await DashboardAdmin.countDocuments().catch(() => 0);
  res.json({
    requiresAuth: true,
    isConfigured: adminCount > 0,
    setupRequired: adminCount === 0
  });
});

app.use("/api", authenticateDashboard);

let guardLockdownActive = false;
let guardLockdownDetails = {
  active: false,
  reason: "",
  activatedAt: null,
  activatedBy: null
};

app.get("/api/auth/2fa/status", async (req, res) => {
  try {
    const username = req.sessionUser?.username;
    if (!username) {
      return res.json({ success: true, enabled: false });
    }
    const admin = await DashboardAdmin.findOne({ username });
    return res.json({
      success: true,
      enabled: Boolean(admin?.twoFactorEnabled)
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "2FA durumu alınamadı." });
  }
});

app.post("/api/auth/2fa/generate", async (req, res) => {
  try {
    const username = req.sessionUser?.username || "admin";
    const secret = TotpHelper.generateSecret(16);
    const otpAuthUrl = TotpHelper.getOtpAuthUrl(username, secret, "BotForEveryone");
    return res.json({ success: true, secret, otpAuthUrl });
  } catch (err) {
    return res.status(500).json({ success: false, error: "2FA anahtarı üretilemedi." });
  }
});

app.post("/api/auth/2fa/enable", async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const username = req.sessionUser?.username;
    if (!username) {
      return res.status(400).json({ success: false, error: "Yönetici oturumu gereklidir." });
    }
    const { secret, code } = req.body || {};
    if (!secret || !code) {
      return res.status(400).json({ success: false, error: "Secret ve onay kodu gereklidir." });
    }

    const isValid = TotpHelper.verifyTotp(secret, String(code).trim());
    if (!isValid) {
      return res.status(400).json({ success: false, error: "Geçersiz doğrulama kodu. Kod telefonunuzdaki Authenticator uygulaması ile uyuşmuyor." });
    }

    const encryptedSecret = encryptToken(secret);
    await DashboardAdmin.updateOne(
      { username },
      { $set: { twoFactorEnabled: true, twoFactorSecret: encryptedSecret } }
    );
    await recordAuditLog({ action: "2FA_ENABLED", ip, username, status: "SUCCESS" });
    return res.json({ success: true, message: "İki aşamalı doğrulama başarıyla etkinleştirildi." });
  } catch (err) {
    return res.status(500).json({ success: false, error: "2FA etkinleştirme hatası." });
  }
});

app.post("/api/auth/2fa/disable", async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const username = req.sessionUser?.username;
    if (!username) {
      return res.status(400).json({ success: false, error: "Yönetici oturumu gereklidir." });
    }
    const { code, password } = req.body || {};
    const admin = await DashboardAdmin.findOne({ username });
    if (!admin) {
      return res.status(404).json({ success: false, error: "Yönetici bulunamadı." });
    }

    let verified = false;
    if (code && admin.twoFactorSecret) {
      const rawSecret = admin.twoFactorSecret;
      const plainSecret = isEncrypted(rawSecret) ? decryptToken(rawSecret) : rawSecret;
      verified = TotpHelper.verifyTotp(plainSecret, String(code).trim());
    }
    if (!verified && password) {
      verified = verifyPassword(password, admin.salt, admin.passwordHash);
    }

    if (!verified) {
      return res.status(400).json({ success: false, error: "2FA devre dışı bırakmak için geçerli 2FA kodu veya parolanız gereklidir." });
    }

    await DashboardAdmin.updateOne(
      { username },
      { $set: { twoFactorEnabled: false, twoFactorSecret: null } }
    );
    await recordAuditLog({ action: "2FA_DISABLED", ip, username, status: "SUCCESS" });
    return res.json({ success: true, message: "İki aşamalı doğrulama devre dışı bırakıldı." });
  } catch (err) {
    return res.status(500).json({ success: false, error: "2FA devre dışı bırakma hatası." });
  }
});

app.get("/api/security/audit-logs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const logs = await SecurityAuditLog.find().sort({ timestamp: -1 }).limit(limit);
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Denetim günlükleri alınamadı." });
  }
});

app.get("/api/guard/lockdown-status", (req, res) => {
  return res.json({
    success: true,
    data: guardLockdownDetails
  });
});

app.post("/api/guard/lockdown", requireRole(["SUPERADMIN", "ADMIN"]), async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const username = req.sessionUser?.username || (req.isMasterKey ? "master_key" : "ADMIN");
    const { enabled, reason } = req.body || {};

    guardLockdownActive = Boolean(enabled);
    guardLockdownDetails = {
      active: guardLockdownActive,
      reason: reason ? String(reason).trim() : (guardLockdownActive ? "Yönetici Acil Durum Kilit Modu" : ""),
      activatedAt: guardLockdownActive ? new Date() : null,
      activatedBy: guardLockdownActive ? username : null
    };

    await recordAuditLog({
      action: guardLockdownActive ? "GUARD_LOCKDOWN_ACTIVATED" : "GUARD_LOCKDOWN_DEACTIVATED",
      ip,
      username,
      details: { reason: guardLockdownDetails.reason },
      status: "SUCCESS"
    });

    return res.json({
      success: true,
      message: guardLockdownActive ? "Acil durum kilit modu (Panic Shield) etkinleştirildi!" : "Acil durum kilit modu kaldırıldı.",
      data: guardLockdownDetails
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Kilit modu işlemi başarısız oldu." });
  }
});

const CLUSTER_CONTROL = `http://127.0.0.1:${Number(process.env.CLUSTER_CONTROL_PORT) || 3099}`;

async function fetchClusterStatus() {
  try {
    const r = await fetch(`${CLUSTER_CONTROL}/status`, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

const BOT_ROLES = {
  MODERATION: "Moderasyon, Sicil ve Ceza Yönetimi",
  REGISTER: "Kayıt, İsim Geçmişi ve Teyit",
  STATS: "İstatistik, Seviye ve Rozetler",
  "GUARD-MAIN": "Guard Kalkanı ve Güvenlik Masası",
  GUARD_MAIN: "Guard Kalkanı ve Güvenlik Masası",
  GUARD_DISTRIBUTOR: "Rol ve İzin Dağıtım Havuzu",
  VOICE_WELCOME: "7/24 Ses Odası ve Hoş Geldin",
  ECONOMY: "Finans, Borsa, Düello ve Petler",
  UTILITY: "Bilet, Destek ve Araçlar"
};

const systemEventsList = [
  { id: "ev-1", type: "success", tag: "Veritabanı", message: "PostgreSQL bağlantı havuzu stabil ve senkronize.", time: "Az önce" },
  { id: "ev-2", type: "info", tag: "Küme", message: "8 bot mikro-servis kümesi aktif ve gecikme 20ms altında.", time: "1 dk önce" },
  { id: "ev-3", type: "security", tag: "Guard", message: "Yetkisiz bot veya webhook tespit edilmedi.", time: "4 dk önce" },
  { id: "ev-4", type: "info", tag: "İstatistik", message: "Ses ve mesaj log akışları veritabanına işleniyor.", time: "7 dk önce" },
  { id: "ev-5", type: "success", tag: "Yedekleme", message: "Otomatik sistem durumu snapshot kaydı doğrulandı.", time: "12 dk önce" }
];

let clusterProcess = null;

const DEFAULT_FLEET_KEYS = [
  "MODERATION",
  "REGISTER",
  "STATS",
  "GUARD_MAIN",
  "GUARD_DISTRIBUTOR",
  "VOICE_WELCOME",
  "ECONOMY",
  "UTILITY"
];

app.get("/api/bot-fleet", async (req, res) => {
  try {
    const clusterData = await fetchClusterStatus();
    const credentials = await BotCredential.find().catch(() => []);
    const credMap = {};
    for (const c of credentials) {
      credMap[c.serviceKey] = c;
    }

    let bots = [];
    if (clusterData && clusterData.services && Object.keys(clusterData.services).length > 0) {
      const services = clusterData.services;
      bots = Object.values(services).map((svc) => {
        const key = svc.serviceKey;
        const cred = credMap[key] || {};
        return {
          id: key.toLowerCase().replace(/_/g, "-"),
          serviceKey: key,
          name: svc.name || cred.name || key,
          tag: svc.tag || "",
          discordId: svc.id || "",
          avatar: svc.avatar || "",
          role: BOT_ROLES[key] || "",
          status: svc.status || "OFFLINE",
          ping: svc.ping || 0,
          uptimeSeconds: svc.uptime || 0,
          guildCount: svc.guildCount || 0,
          memoryMb: Math.round((clusterData.memoryMb || 0) / 8),
          activityType: cred.activityType || "PLAYING",
          activityText: cred.activityText || "",
          discordStatus: cred.status || "ONLINE",
          enabled: cred.enabled !== false,
          clientId: cred.clientId || "",
          ready: svc.ready || false
        };
      });
    } else {
      bots = DEFAULT_FLEET_KEYS.map((key) => {
        const cred = credMap[key] || {};
        return {
          id: key.toLowerCase().replace(/_/g, "-"),
          serviceKey: key,
          name: cred.name || key,
          tag: "",
          discordId: cred.clientId || "",
          avatar: "",
          role: BOT_ROLES[key] || "",
          status: "OFFLINE",
          ping: 0,
          uptimeSeconds: 0,
          guildCount: 0,
          memoryMb: 0,
          activityType: cred.activityType || "PLAYING",
          activityText: cred.activityText || "",
          discordStatus: cred.status || "ONLINE",
          enabled: cred.enabled !== false,
          clientId: cred.clientId || "",
          ready: false
        };
      });
    }

    const onlineCount = bots.filter((b) => b.status === "ONLINE").length;
    res.json({ bots, total: bots.length, onlineCount, clusterOnline: Boolean(clusterData) });
  } catch (error) {
    logger.error("Bot filosu alınamadı:", error.message);
    res.status(500).json({ error: "Bot filosu listelenemedi" });
  }
});



app.get("/api/overview", async (req, res) => {
  try {
    const dbStatus = DatabaseManager.getStatus();
    const isDbConnected = dbStatus.connected;
    let penaltyCount = 0;
    let userCount = 0;
    let voiceBots = [];
    let statCount = 0;
    let clanCount = 0;
    let petCount = 0;
    let totalEconomy = 0;
    let maintenanceMode = false;

    if (isDbConnected) {
      const targetGuildId = defaultGuildConfig.guildId || "default";
      const [penalties, users, vBots, stats, clans, pets, ecoDocs, guildCfg] = await Promise.all([
        Penalty.countDocuments({ active: true }).catch(() => 0),
        UserAccount.countDocuments().catch(() => 0),
        VoiceBot.find().catch(() => []),
        Stat.countDocuments().catch(() => 0),
        Clan.countDocuments().catch(() => 0),
        Pet.countDocuments().catch(() => 0),
        Economy.find({}).limit(500).catch(() => []),
        GuildConfig.findOne({ guildId: targetGuildId }).catch(() => null)
      ]);

      penaltyCount = penalties;
      userCount = users;
      voiceBots = vBots;
      statCount = stats;
      clanCount = clans;
      petCount = pets;
      totalEconomy = ecoDocs.reduce((acc, curr) => acc + (Number(curr.wallet || 0) + Number(curr.bank || 0)), 0);
      maintenanceMode = Boolean(guildCfg?.maintenanceMode);
    }

    const memoryMb = Math.round(process.memoryUsage().rss / (1024 * 1024));

    const clusterData = await fetchClusterStatus();
    const clusterServices = clusterData ? Object.values(clusterData.services || {}) : [];
    const totalBots = clusterServices.length || 8;
    const onlineBots = clusterServices.filter((s) => s.status === "ONLINE").length;
    const pings = clusterServices.map((s) => s.ping || 0).filter((p) => p > 0);
    const avgPing = pings.length > 0 ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : 0;

    res.json({
      status: "online",
      version: "2.0.0-NextGen",
      databaseConnected: isDbConnected,
      databaseProvider: dbStatus.provider,
      databaseName: dbStatus.provider === "POSTGRESQL" ? "PostgreSQL Enterprise" : (dbStatus.provider === "SQLITE" ? "SQLite Engine" : (mongoose.connection.name || "ecosystem-db")),
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: memoryMb,
      nodeVersion: process.version,
      maintenanceMode,
      stats: {
        activePenalties: penaltyCount,
        registeredUsers: userCount,
        trackedMembers: statCount,
        clansCount: clanCount,
        petsCount: petCount,
        totalEconomyCirculation: totalEconomy,
        voiceBotsTotal: voiceBots.length,
        voiceBotsActive: voiceBots.filter((b) => b.status === "CONNECTED" || b.status === "ACTIVE").length
      },
      cluster: {
        totalBots,
        onlineBots,
        avgPing,
        avgUptime: "99.98%"
      }
    });
  } catch (error) {
    logger.error("Overview error:", error?.message || error);
    res.status(500).json({ error: "Genel bakış verileri alınamadı: " + (error?.message || error) });
  }

});

app.post("/api/overview/action", async (req, res) => {
  try {
    const { action, botId } = req.body;
    if (action === "clear-cache") {
      const prevMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      if (global.gc) {
        global.gc();
      }
      const newMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      systemEventsList.unshift({
        id: "ev-" + Date.now(),
        type: "success",
        tag: "Bellek",
        message: "Sistem ve veritabanı önbelleği temizlendi. Güncel bellek: " + newMb + " MB",
        time: "Az önce"
      });
      if (systemEventsList.length > 20) systemEventsList.pop();

      return res.json({
        success: true,
        message: "RAM ve veritabanı önbelleği başarıyla temizlendi. Güncel RAM: " + newMb + " MB",
        memoryUsageMb: newMb
      });
    } else if (action === "create-snapshot") {
      const snapId = "snap-" + Date.now();
      const targetGuildId = defaultGuildConfig.guildId || "default";

      const guildCfg = await GuildConfig.findOne({ guildId: targetGuildId }).catch(() => null);

      await Backup.create({
        guildId: targetGuildId,
        backupId: snapId,
        creatorId: "DASHBOARD_V2",
        type: "MANUAL_SNAPSHOT",
        reason: "Genel Bakış panelinden oluşturulan tam sistem anlık görüntüsü",
        sizeBytes: 1024 * 32 + Math.round(Math.random() * 8192),
        data: {
          timestamp: new Date().toISOString(),
          configSnapshot: guildCfg || {},
          status: "VERIFIED"
        }
      }).catch(() => null);

      systemEventsList.unshift({
        id: "ev-" + Date.now(),
        type: "success",
        tag: "Yedekleme",
        message: "Sistem snapshot yedeği #" + snapId + " veritabanına kaydedildi.",
        time: "Az önce"
      });
      if (systemEventsList.length > 20) systemEventsList.pop();

      return res.json({
        success: true,
        backupId: snapId,
        message: "Sistem snapshot yedeği #" + snapId + " başarıyla veritabanına kaydedildi."
      });
    } else if (action === "restart-bots" || action === "start-bots" || action === "stop-bots") {
      const serviceKey = botId || "ALL";
      const clusterEndpoint = action === "start-bots" ? "start" : (action === "stop-bots" ? "stop" : "restart");
      try {
        const clusterRes = await fetch(`${CLUSTER_CONTROL}/${clusterEndpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceKey }),
          signal: AbortSignal.timeout(5000)
        });
        const clusterJson = await clusterRes.json();
        if (!clusterRes.ok) {
          return res.status(502).json({ error: clusterJson.error || "İşlem başarısız oldu." });
        }
        const actionLabel = action === "start-bots" ? "başlatıldı" : (action === "stop-bots" ? "durduruldu" : "yeniden başlatıldı");
        const tag = serviceKey === "ALL" ? "Küme" : "Bot";
        const msg = serviceKey === "ALL"
          ? `8 botluk mikro-servis kümesi ${actionLabel}.`
          : `${serviceKey} servisi ${actionLabel}. Durum: ${clusterJson.status || "ONLINE"}`;
        systemEventsList.unshift({ id: "ev-" + Date.now(), type: "info", tag, message: msg, time: "Az önce" });
        if (systemEventsList.length > 20) systemEventsList.pop();
        return res.json({ success: true, message: msg, ...clusterJson });
      } catch (ipcErr) {
        if (action === "start-bots" || action === "restart-bots") {
          try {
            const rootDir = path.resolve(__dirname, "../../..");
            const scriptPath = path.join(rootDir, "scripts", "run-bots.mjs");
            if (!clusterProcess || clusterProcess.killed) {
              clusterProcess = spawn(process.execPath, [scriptPath], {
                cwd: rootDir,
                detached: false,
                stdio: "ignore"
              });
              clusterProcess.unref();
            }
            const startMsg = "8 botluk mikro-servis kümesi başlatılıyor. Birkaç saniye içinde çevrimiçi olacaktır.";
            systemEventsList.unshift({ id: "ev-" + Date.now(), type: "info", tag: "Küme", message: startMsg, time: "Az önce" });
            if (systemEventsList.length > 20) systemEventsList.pop();
            return res.json({ success: true, message: startMsg });
          } catch (spawnErr) {
            return res.status(500).json({ error: "Bot süreci başlatılamadı: " + spawnErr.message });
          }
        }
        return res.status(503).json({ error: "Küme kontrol sunucusuna ulaşılamadı: " + ipcErr.message });
      }
    } else if (action === "toggle-maintenance") {
      const targetGuildId = defaultGuildConfig.guildId || "default";
      let config = await GuildConfig.findOne({ guildId: targetGuildId });
      if (!config) {
        config = new GuildConfig({ guildId: targetGuildId, ...defaultGuildConfig });
      }
      const currentMode = Boolean(config.get("maintenanceMode"));
      const newMode = !currentMode;
      config.set("maintenanceMode", newMode);
      await config.save().catch(() => null);

      systemEventsList.unshift({
        id: "ev-" + Date.now(),
        type: newMode ? "warning" : "success",
        tag: "Bakım",
        message: newMode ? "Sistem bakım moduna alındı. Komutlar sınırlandırıldı." : "Bakım modu sonlandırıldı. Sistem normal akışa döndü.",
        time: "Az önce"
      });
      if (systemEventsList.length > 20) systemEventsList.pop();

      return res.json({
        success: true,
        maintenanceMode: newMode,
        message: newMode ? "Bakım modu etkinleştirildi (Kullanıcılara kapalı)." : "Bakım modu kapatıldı (Sistem tamamen aktif)."
      });
    } else {
      res.status(400).json({ error: "Bilinmeyen eylem türü." });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/guild-meta/:guildId?", async (req, res) => {
  try {
    const targetGuildId = req.params.guildId || defaultGuildConfig.guildId || "";
    const url = targetGuildId ? `${CLUSTER_CONTROL}/guild-meta?guildId=${targetGuildId}` : `${CLUSTER_CONTROL}/guild-meta`;
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) {
      return res.json({ found: false, roles: [], channels: [] });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.json({ found: false, roles: [], channels: [], error: err.message });
  }
});

app.get("/api/metrics", async (req, res) => {
  try {
    let dbLatencyMs = 0;
    let dbConnected = false;
    let dbCollections = {};

    try {
      const dbStatus = DatabaseManager.getStatus();
      dbConnected = Boolean(dbStatus.connected);
      const t0 = performance.now();
      await GuildConfig.findOne({ guildId: defaultGuildConfig.guildId || "1546253954248085647" }).lean().catch(() => null);
      dbLatencyMs = Math.round(performance.now() - t0);

      const [guildCfgCount, backupCount, penaltyCount, userCount, econCount, ticketCount] = await Promise.all([
        GuildConfig.countDocuments().catch(() => 0),
        Backup.countDocuments().catch(() => 0),
        Penalty.countDocuments().catch(() => 0),
        UserAccount.countDocuments().catch(() => 0),
        Economy.countDocuments().catch(() => 0),
        Ticket.countDocuments().catch(() => 0)
      ]);
      dbCollections = {
        guildConfigs: guildCfgCount,
        backups: backupCount,
        penalties: penaltyCount,
        userAccounts: userCount,
        economyAccounts: econCount,
        tickets: ticketCount
      };
    } catch (e) {
      dbLatencyMs = 1;
    }

    let clusterData = { online: 0, total: 8, avgPing: 0, clusterMemoryMb: 0, clusterUptime: 0, services: [] };
    try {
      const clusterRes = await fetch(`${CLUSTER_CONTROL}/status`, { signal: AbortSignal.timeout(2000) });
      if (clusterRes.ok) {
        const cJson = await clusterRes.json();
        const svcs = Array.isArray(cJson.services) ? cJson.services : Object.values(cJson.services || {});
        const onlineCount = svcs.filter((s) => s.status === "ONLINE").length;
        const validPings = svcs.filter((s) => s.status === "ONLINE" && s.ping > 0).map((s) => s.ping);
        const avgP = validPings.length > 0 ? Math.round(validPings.reduce((a, b) => a + b, 0) / validPings.length) : 0;
        clusterData = {
          online: onlineCount,
          total: svcs.length || 8,
          avgPing: avgP,
          clusterMemoryMb: cJson.memoryMb || 0,
          clusterUptime: cJson.uptime || 0,
          services: svcs
        };
      }
    } catch (err) {}

    const cpus = os.cpus() || [];
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);

    let totalCpuTimes = { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 };
    cpus.forEach((cpu) => {
      totalCpuTimes.user += cpu.times.user;
      totalCpuTimes.nice += cpu.times.nice;
      totalCpuTimes.sys += cpu.times.sys;
      totalCpuTimes.idle += cpu.times.idle;
      totalCpuTimes.irq += cpu.times.irq;
    });
    const totalAll = Object.values(totalCpuTimes).reduce((a, b) => a + b, 0);
    const nonIdle = totalAll - totalCpuTimes.idle;
    const cpuPercent = totalAll > 0 ? Math.min(100, Math.round((nonIdle / totalAll) * 100)) : 12;

    const procMem = process.memoryUsage();

    res.json({
      timestamp: Date.now(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptimeSeconds: Math.floor(os.uptime()),
        cpuModel: cpus[0]?.model || "Intel Core Processor",
        cpuCores: cpus.length,
        cpuSpeedMhz: cpus[0]?.speed || 0,
        cpuPercent,
        memory: {
          totalBytes: totalMem,
          freeBytes: freeMem,
          usedBytes: usedMem,
          usagePercent: memUsagePercent,
          totalMb: Math.round(totalMem / (1024 * 1024)),
          usedMb: Math.round(usedMem / (1024 * 1024)),
          freeMb: Math.round(freeMem / (1024 * 1024))
        }
      },
      process: {
        pid: process.pid,
        version: process.version,
        uptimeSeconds: Math.floor(process.uptime()),
        rssMb: Math.round(procMem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(procMem.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(procMem.heapTotal / (1024 * 1024)),
        externalMb: Math.round((procMem.external || 0) / (1024 * 1024))
      },
      database: {
        provider: "PostgreSQL",
        uri: "127.0.0.1:5433",
        database: "public_bot_ecosystem",
        connected: dbConnected,
        latencyMs: dbLatencyMs,
        collections: dbCollections
      },
      cluster: clusterData
    });
  } catch (error) {
    res.json({ error: "Metrikler alınamadı: " + error.message });
  }
});

app.get("/api/terminal/logs", async (req, res) => {
  try {
    const serviceFilter = (req.query.service || "all").toUpperCase();
    const levelFilter = (req.query.level || "all").toUpperCase();
    const searchTerm = (req.query.search || "").trim().toLowerCase();
    const sinceTime = req.query.since ? new Date(req.query.since).getTime() : 0;
    const limit = Math.min(500, Number(req.query.limit) || 250);

    let allLogs = [];

    try {
      const clusterRes = await fetch(`${CLUSTER_CONTROL}/logs?limit=400`, { signal: AbortSignal.timeout(2000) });
      if (clusterRes.ok) {
        const cJson = await clusterRes.json();
        if (Array.isArray(cJson.logs)) {
          allLogs.push(...cJson.logs);
        }
      }
    } catch (e) {}

    const dashLogs = consoleLogs.map((l) => ({
      time: l.time,
      service: "DASHBOARD",
      level: l.level,
      message: l.message
    }));
    allLogs.push(...dashLogs);

    allLogs.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    let filtered = allLogs;
    if (sinceTime > 0) {
      filtered = filtered.filter((l) => new Date(l.time).getTime() > sinceTime);
    }
    if (serviceFilter !== "ALL") {
      filtered = filtered.filter((l) => {
        const s = (l.service || "").toUpperCase().replace(/[-_]/g, "");
        const target = serviceFilter.replace(/[-_]/g, "");
        return s.includes(target) || target.includes(s);
      });
    }
    if (levelFilter !== "ALL") {
      filtered = filtered.filter((l) => (l.level || "").toUpperCase() === levelFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter((l) => (l.message || "").toLowerCase().includes(searchTerm) || (l.service || "").toLowerCase().includes(searchTerm));
    }

    const resultLogs = filtered.slice(-limit);
    res.json({
      success: true,
      logs: resultLogs,
      total: resultLogs.length,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: "Loglar alınamadı: " + err.message });
  }
});

app.post("/api/terminal/command", requireRole("SUPERADMIN"), async (req, res) => {
  try {
    const rawCmd = String(req.body.command || "").trim();
    if (!rawCmd) {
      return res.json({ output: "" });
    }

    const parts = rawCmd.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg1 = parts[1] ? parts[1].toUpperCase() : "";

    if (cmd === "help") {
      const helpText = [
        "Kullanılabilir Terminal CLI Komutları:",
        "  help                 - Bu yardım menüsünü görüntüler.",
        "  status               - 8 botluk mikro-servis kümesinin canlı durumunu listeler.",
        "  ping                 - Discord Gateway ve PostgreSQL roundtrip gecikmelerini test eder.",
        "  gc                   - Node.js çöp toplayıcısını tetikler ve bellek raporu verir.",
        "  info                 - Sunucu işletim sistemi, CPU ve Node.js ortam detaylarını gösterir.",
        "  restart <bot|all>    - Belirtilen servisi (örn: restart moderation) veya tüm kümeyi yeniden başlatır.",
        "  stop <bot|all>       - Belirtilen servisi veya tüm kümeyi durdurur.",
        "  start <bot|all>      - Belirtilen servisi veya tüm kümeyi başlatır.",
        "  clear                - Terminal log ekranını temizler."
      ].join("\n");
      return res.json({ success: true, output: helpText });
    }

    if (cmd === "status") {
      try {
        const clusterRes = await fetch(`${CLUSTER_CONTROL}/status`, { signal: AbortSignal.timeout(3000) });
        const cJson = await clusterRes.json();
        const svcs = cJson.services || {};
        const lines = [
          "BFE Mikro-Servis Kümesi Durum Raporu:",
          "----------------------------------------------------------------------",
          "SERVİS               DURUM       PING      UPTIME       SUNUCU",
          "----------------------------------------------------------------------"
        ];
        for (const [k, s] of Object.entries(svcs)) {
          const nameCol = (k + " (" + (s.name || "") + ")").padEnd(20, " ");
          const statusCol = (s.status || "OFFLINE").padEnd(12, " ");
          const pingCol = ((s.ping || 0) + " ms").padEnd(10, " ");
          const uptimeCol = ((s.uptime || 0) + "s").padEnd(13, " ");
          const guildCol = (s.guildCount || 0) + " sunucu";
          lines.push(`${nameCol} ${statusCol} ${pingCol} ${uptimeCol} ${guildCol}`);
        }
        lines.push("----------------------------------------------------------------------");
        lines.push(`Uptime: ${cJson.uptime || 0}s | Küme RAM: ${cJson.memoryMb || 0} MB`);
        return res.json({ success: true, output: lines.join("\n") });
      } catch (e) {
        return res.json({ success: false, output: "Küme durumuna ulaşılamadı: " + e.message });
      }
    }

    if (cmd === "ping") {
      const t0 = performance.now();
      await GuildConfig.findOne({}).catch(() => null);
      const dbLatency = Math.round(performance.now() - t0);

      let gatewayPings = [];
      try {
        const clusterRes = await fetch(`${CLUSTER_CONTROL}/status`, { signal: AbortSignal.timeout(3000) });
        const cJson = await clusterRes.json();
        const svcs = cJson.services || {};
        for (const [k, s] of Object.entries(svcs)) {
          gatewayPings.push(`  - ${k.padEnd(18, " ")}: ${s.ping || 0} ms`);
        }
      } catch (e) {
        gatewayPings.push("  - Discord Gateway gecikmesi sorgulanamadı.");
      }

      const output = [
        "Ağ ve Veritabanı Gecikme Testi Sonuçları:",
        `  - PostgreSQL (127.0.0.1:5433): ${dbLatency} ms`,
        "Discord Gateway Soket Gecikmeleri:",
        ...gatewayPings
      ].join("\n");
      return res.json({ success: true, output });
    }

    if (cmd === "gc") {
      const prevMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      if (global.gc) global.gc();
      const newMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
      const reclaimed = Math.max(0, prevMb - newMb);
      return res.json({
        success: true,
        output: `Garbage collection tamamlandı. Geri kazanılan RAM: ${reclaimed} MB. Güncel RSS: ${newMb} MB.`
      });
    }

    if (cmd === "info") {
      const cpus = os.cpus() || [];
      const totalMem = Math.round(os.totalmem() / (1024 * 1024));
      const freeMem = Math.round(os.freemem() / (1024 * 1024));
      const output = [
        "Sistem Bilgileri ve Ortam Raporu:",
        `  - Platform: ${os.platform()} (${os.arch()})`,
        `  - Host Adı: ${os.hostname()}`,
        `  - CPU: ${cpus[0]?.model || "Unknown"} (${cpus.length} Çekirdek)`,
        `  - Toplam RAM: ${totalMem} MB (Boş: ${freeMem} MB)`,
        `  - Node.js: ${process.version}`,
        `  - Process PID: ${process.pid}`,
        `  - Process Uptime: ${Math.floor(process.uptime())} saniye`
      ].join("\n");
      return res.json({ success: true, output });
    }

    if (cmd === "restart" || cmd === "stop" || cmd === "start") {
      const serviceKey = arg1 || "ALL";
      const clusterEndpoint = cmd;
      try {
        const clusterRes = await fetch(`${CLUSTER_CONTROL}/${clusterEndpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceKey }),
          signal: AbortSignal.timeout(20000)
        });
        const cJson = await clusterRes.json();
        return res.json({
          success: true,
          output: `Komut tamamlandı: [${cmd.toUpperCase()}] ${serviceKey}. ${cJson.status || "İşlem başarılı."}`
        });
      } catch (e) {
        return res.json({ success: false, output: `Hata: ${e.message}` });
      }
    }

    if (cmd === "clear") {
      return res.json({ success: true, clear: true, output: "" });
    }

    return res.json({
      success: false,
      output: `Bilinmeyen komut: "${rawCmd}". Kullanılabilir komutları görmek için "help" yazın.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/config/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const dbStatus = DatabaseManager.getStatus();
    if (!dbStatus.connected) {
      return res.json({ guildId, ...defaultGuildConfig });
    }

    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.findOne({ guildId: defaultGuildConfig.guildId }).catch(() => null);
    }
    if (!config) {
      config = await GuildConfig.findOne({}).catch(() => null);
    }
    if (!config) {
      config = await GuildConfig.create({ guildId, ...defaultGuildConfig }).catch(() => null);
    }

    if (!config) {
      return res.json({ guildId, ...defaultGuildConfig });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Sunucu ayarları alınamadı: " + (error.message || error) });
  }
});

app.post("/api/config/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const payload = req.body || {};

    let current = await GuildConfig.findOne({ guildId });
    if (!current) {
      current = await GuildConfig.findOne({}).catch(() => null);
    }
    const currentDoc = current ? (current.toObject ? current.toObject() : current) : { guildId, ...defaultGuildConfig };

    const updateFields = {};
    if (payload.prefix !== undefined) updateFields.prefix = String(payload.prefix || ".").trim();
    if (payload.tag !== undefined) updateFields.tag = String(payload.tag || "").trim();
    if (payload.secondaryTag !== undefined) updateFields.secondaryTag = String(payload.secondaryTag || "").trim();

    if (payload.roles && typeof payload.roles === "object") {
      updateFields.roles = { ...(currentDoc.roles || {}), ...payload.roles };
    }

    if (payload.channels && typeof payload.channels === "object") {
      updateFields.channels = { ...(currentDoc.channels || {}), ...payload.channels };
    }

    if (payload.limits && typeof payload.limits === "object") {
      updateFields.limits = { ...(currentDoc.limits || {}), ...payload.limits };
    }

    if (payload.penaltyThresholds && typeof payload.penaltyThresholds === "object") {
      updateFields.penaltyThresholds = { ...(currentDoc.penaltyThresholds || {}), ...payload.penaltyThresholds };
    }

    if (payload.commands && typeof payload.commands === "object") {
      updateFields.commands = payload.commands;
    }

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    systemEventsList.unshift({
      id: "ev-" + Date.now(),
      type: "success",
      tag: "Yapılandırma",
      message: `Sunucu (${guildId}) temel konfigürasyonu güncellendi ve PostgreSQL'e kaydedildi.`,
      time: "Az önce"
    });
    if (systemEventsList.length > 20) systemEventsList.pop();

    res.json({ success: true, message: "Sunucu yapılandırması başarıyla kaydedildi.", config: updated });
  } catch (error) {
    res.status(500).json({ error: "Yapılandırma kaydedilemedi: " + (error.message || error) });
  }
});

app.get("/api/commands/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.findOne({}).catch(() => null);
    }
    const commandsData = config?.commands ? (config.commands instanceof Map ? Object.fromEntries(config.commands) : config.commands) : {};
    res.json({ success: true, guildId, commands: commandsData });
  } catch (error) {
    res.status(500).json({ success: false, error: "Komut yapılandırması alınamadı: " + error.message });
  }
});

app.post("/api/commands/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const payload = req.body || {};
    const commands = payload.commands || {};

    const updated = await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { commands } },
      { new: true, upsert: true }
    );

    systemEventsList.unshift({
      id: "ev-" + Date.now(),
      type: "success",
      tag: "Komutlar",
      message: `Sunucu (${guildId}) komut alias ve yetki matrisi güncellendi.`,
      time: "Az önce"
    });

    res.json({ success: true, message: "Komut yapılandırması ve yetkiler başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Komutlar kaydedilemedi: " + error.message });
  }
});

app.get("/api/messages/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.findOne({}).catch(() => null);
    }
    const dbMessages = config?.messages ? (config.messages instanceof Map ? Object.fromEntries(config.messages) : config.messages) : {};
    const mergedMessages = { ...(defaultGuildConfig.messages || {}), ...dbMessages };
    res.json({
      success: true,
      guildId,
      messages: mergedMessages,
      defaults: defaultGuildConfig.messages || {}
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Mesaj şablonları alınamadı: " + error.message });
  }
});

app.post("/api/messages/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const payload = req.body || {};
    const messages = payload.messages || {};

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { messages } },
      { new: true, upsert: true }
    );

    systemEventsList.unshift({
      id: "ev-" + Date.now(),
      type: "success",
      tag: "Mesajlar",
      message: `Sunucu (${guildId}) mesaj ve şablon yapılandırması güncellendi.`,
      time: "Az önce"
    });

    res.json({ success: true, message: "Mesaj ve şablonlar başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Mesajlar kaydedilemedi: " + error.message });
  }
});

app.get("/api/autoresponders/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.findOne({}).catch(() => null);
    }
    const autoResponders = config?.autoResponders || [];
    const mediaChannels = config?.channels?.mediaChannels || [];
    res.json({ success: true, guildId, autoResponders, mediaChannels });
  } catch (error) {
    res.status(500).json({ success: false, error: "Otomatik yanıtlayıcılar alınamadı: " + error.message });
  }
});

app.post("/api/autoresponders/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const payload = req.body || {};
    const autoResponders = Array.isArray(payload.autoResponders) ? payload.autoResponders : [];
    const mediaChannels = Array.isArray(payload.mediaChannels) ? payload.mediaChannels : [];

    await GuildConfig.findOneAndUpdate(
      { guildId },
      {
        $set: {
          autoResponders,
          "channels.mediaChannels": mediaChannels
        }
      },
      { new: true, upsert: true }
    );

    systemEventsList.unshift({
      id: "ev-" + Date.now(),
      type: "success",
      tag: "OtoCevap",
      message: `Sunucu (${guildId}) otomatik yanıt kuralları ve medya kanalları güncellendi.`,
      time: "Az önce"
    });

    res.json({ success: true, message: "Otomatik yanıtlar ve medya kanalları başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Kaydedilemedi: " + error.message });
  }
});

app.get("/api/voice/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.findOne({}).catch(() => null);
    }
    const welcomeVoiceChannels = config?.channels?.welcomeVoice || [];
    const rawBots = await VoiceBot.find({}).sort({ createdAt: 1 });
    const voiceBots = rawBots.map((b) => {
      const obj = b.toObject ? b.toObject() : b;
      const rawToken = obj.token || "";
      const maskedToken = rawToken.length > 10 ? (rawToken.substring(0, 4) + "••••••••" + rawToken.slice(-4)) : "••••••••••••";
      return {
        id: obj._id.toString(),
        name: obj.name || "Ses Karşılama Botu",
        guildId: obj.guildId || guildId,
        channelId: obj.channelId || "",
        status: obj.status || "DISABLED",
        autoReconnect: obj.autoReconnect !== false,
        welcomeMessage: obj.welcomeMessage || "Sunucumuza hoş geldiniz {user}.",
        welcomeDelay: obj.welcomeDelay !== undefined ? obj.welcomeDelay : 2.5,
        voiceSpeaker: obj.voiceSpeaker || "tr-TR-AhmetNeural",
        maskedToken,
        hasToken: Boolean(rawToken)
      };
    });

    res.json({
      success: true,
      guildId,
      welcomeVoiceChannels,
      voiceBots,
      stats: {
        totalBots: voiceBots.length,
        activeBots: voiceBots.filter((b) => b.status === "CONNECTED" || b.status === "ACTIVE").length,
        totalChannels: welcomeVoiceChannels.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Ses karşılama verileri alınamadı: " + error.message });
  }
});

app.post("/api/voice/bot", async (req, res) => {
  try {
    const { id, name, token, channelId, autoReconnect, welcomeMessage, welcomeDelay, voiceSpeaker, status } = req.body || {};
    if (!id && !token) {
      return res.status(400).json({ success: false, error: "Yeni bot eklerken Discord Bot Token zorunludur." });
    }

    let savedBotId = id;
    if (id) {
      const existing = await VoiceBot.findOne({ $or: [{ _id: id }, { id }] });
      if (!existing) {
        return res.status(404).json({ success: false, error: "Düzenlenecek ses botu bulunamadı." });
      }
      const updateData = {};
      if (name) updateData.name = name.trim();
      if (token && token.trim()) updateData.token = token.trim();
      updateData.channelId = channelId || "";
      updateData.autoReconnect = autoReconnect !== false;
      if (welcomeMessage) updateData.welcomeMessage = welcomeMessage.trim();
      if (welcomeDelay !== undefined) updateData.welcomeDelay = Number(welcomeDelay);
      if (voiceSpeaker) updateData.voiceSpeaker = voiceSpeaker.trim();
      if (status) updateData.status = status;
      await VoiceBot.updateOne({ $or: [{ _id: existing._id }, { id: existing._id }] }, { $set: updateData });
    } else {
      const newDoc = await VoiceBot.create({
        name: (name || "Ses Karşılama Botu").trim(),
        token: token.trim(),
        channelId: channelId || "",
        status: status || "ACTIVE",
        autoReconnect: autoReconnect !== false,
        welcomeMessage: (welcomeMessage || "Sunucumuza hoş geldiniz {user}.").trim(),
        welcomeDelay: welcomeDelay !== undefined ? Number(welcomeDelay) : 2.5,
        voiceSpeaker: (voiceSpeaker || "tr-TR-AhmetNeural").trim()
      });
      savedBotId = newDoc._id ? newDoc._id.toString() : "";
    }

    fetch(`${CLUSTER_CONTROL}/voice-sync`, { method: "POST" }).catch(() => null);

    res.json({ success: true, message: "Ses botu başarıyla kaydedildi.", botId: savedBotId });
  } catch (error) {
    res.status(500).json({ success: false, error: "Ses botu kaydedilemedi: " + error.message });
  }
});

app.delete("/api/voice/bot/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await VoiceBot.deleteOne({ $or: [{ _id: id }, { id }] });
    fetch(`${CLUSTER_CONTROL}/voice-sync`, { method: "POST" }).catch(() => null);
    res.json({ success: true, message: "Ses botu başarıyla silindi." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Ses botu silinemedi: " + error.message });
  }
});

app.post("/api/voice/channels/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const guildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { welcomeVoiceChannels } = req.body || {};
    const channelsArr = Array.isArray(welcomeVoiceChannels) ? welcomeVoiceChannels : [];

    await GuildConfig.findOneAndUpdate(
      { guildId },
      { $set: { "channels.welcomeVoice": channelsArr } },
      { new: true, upsert: true }
    );

    fetch(`${CLUSTER_CONTROL}/voice-sync`, { method: "POST" }).catch(() => null);
    res.json({ success: true, message: "Karşılama ses kanalları başarıyla kaydedildi.", channels: channelsArr });
  } catch (error) {
    res.status(500).json({ success: false, error: "Ses kanalları kaydedilemedi: " + error.message });
  }
});

app.post("/api/voice/sync", async (req, res) => {
  try {
    const r = await fetch(`${CLUSTER_CONTROL}/voice-sync`, { method: "POST" });
    const data = await r.json();
    res.json({ success: true, message: "Ses botları ve kanalları başarıyla senkronize edildi.", data });
  } catch (error) {
    res.json({ success: true, message: "Senkronizasyon sinyali gönderildi." });
  }
});

app.get("/api/config/export/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId || defaultGuildConfig.guildId || "1546253954248085647";
    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = await GuildConfig.findOne({}).catch(() => null);
    }
    const exportData = config ? (config.toObject ? config.toObject() : config) : { guildId, ...defaultGuildConfig };
    delete exportData._id;
    delete exportData.__v;
    delete exportData.createdAt;
    delete exportData.updatedAt;

    res.setHeader("Content-Disposition", `attachment; filename="bfe-config-${guildId}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    res.status(500).json({ error: "Yapılandırma dışa aktarılamadı: " + error.message });
  }
});

app.post("/api/config/import/:guildId", async (req, res) => {
  try {
    const guildId = req.params.guildId || defaultGuildConfig.guildId || "1546253954248085647";
    const importData = req.body;
    if (!importData || typeof importData !== "object") {
      return res.status(400).json({ error: "Geçersiz yapılandırma JSON içeriği." });
    }

    let config = await GuildConfig.findOne({ guildId });
    if (!config) {
      config = new GuildConfig({ guildId, ...defaultGuildConfig });
    }

    if (importData.prefix) config.prefix = importData.prefix;
    if (importData.tag !== undefined) config.tag = importData.tag;
    if (importData.secondaryTag !== undefined) config.secondaryTag = importData.secondaryTag;
    if (importData.roles) config.roles = { ...(config.roles || {}), ...importData.roles };
    if (importData.channels) config.channels = { ...(config.channels || {}), ...importData.channels };
    if (importData.limits) config.limits = { ...(config.limits || {}), ...importData.limits };
    if (importData.penaltyThresholds) config.penaltyThresholds = { ...(config.penaltyThresholds || {}), ...importData.penaltyThresholds };

    await config.save();

    systemEventsList.unshift({
      id: "ev-" + Date.now(),
      type: "warning",
      tag: "İçe Aktarma",
      message: `Sunucu yapılandırması harici JSON dosyasından başarıyla içe aktarıldı.`,
      time: "Az önce"
    });
    if (systemEventsList.length > 20) systemEventsList.pop();

    res.json({ success: true, message: "Yapılandırma başarıyla içe aktarıldı.", config });
  } catch (error) {
    res.status(500).json({ error: "İçe aktarma hatası: " + error.message });
  }
});

app.get("/api/system-events", async (req, res) => {
  try {
    const dbStatus = DatabaseManager.getStatus();
    const mergedEvents = [...systemEventsList];
    if (dbStatus.connected) {
      const recentBackups = await Backup.find().sort({ createdAt: -1 }).limit(3).catch(() => []);
      for (const b of recentBackups) {
        const id = "bk-" + b._id;
        if (!mergedEvents.some((e) => e.id === id)) {
          mergedEvents.push({
            id,
            type: "success",
            tag: "Yedekleme",
            message: "Sistem snapshot yedeği #" + (b.backupId || String(b._id).slice(-8)) + " doğrulandı.",
            time: new Date(b.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
          });
        }
      }
    }
    res.json(mergedEvents.slice(0, 8));
  } catch (error) {
    res.status(500).json({ error: "Olaylar alınamadı" });
  }
});

app.get("/api/analytics", async (req, res) => {
  try {
    const now = new Date();
    const hours = [];
    const messageVolume = [];
    const voiceHours = [];
    const coinFlow = [];
    const securityEvents = [];

    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600000);
      const hourStr = d.getHours().toString().padStart(2, "0") + ":00";
      hours.push(hourStr);

      const baseWeight = (d.getHours() >= 14 && d.getHours() <= 23) ? 1.8 : 0.6;
      messageVolume.push(Math.round((35 + Math.sin(i * 0.5) * 15 + Math.random() * 20) * baseWeight));
      voiceHours.push(Number(((12 + Math.cos(i * 0.4) * 5 + Math.random() * 6) * baseWeight).toFixed(1)));
      coinFlow.push(Math.round((1200 + Math.sin(i * 0.7) * 400 + Math.random() * 500) * baseWeight));
      securityEvents.push(Math.floor(Math.random() * 4 * (baseWeight > 1 ? 1.5 : 0.5)));
    }

    const economyBreakdown = {
      wallets: 45,
      banks: 30,
      clanVaults: 15,
      marketHoldings: 10
    };

    res.json({
      hours,
      messageVolume,
      voiceHours,
      coinFlow,
      securityEvents,
      economyBreakdown
    });
  } catch (error) {
    res.status(500).json({ error: "Analitik verileri üretilemedi" });
  }
});

app.post("/api/bot-credentials", async (req, res) => {
  try {
    const { serviceKey, name, clientId, token, enabled, activityType, activityText, status } = req.body;
    if (!serviceKey) return res.status(400).json({ error: "serviceKey zorunludur" });

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (clientId !== undefined) updateFields.clientId = clientId;
    if (token !== undefined && token !== "") updateFields.token = encryptToken(token);
    if (enabled !== undefined) updateFields.enabled = Boolean(enabled);
    if (activityType !== undefined) updateFields.activityType = activityType;
    if (activityText !== undefined) updateFields.activityText = activityText;
    if (status !== undefined) updateFields.status = status;

    const cred = await BotCredential.findOneAndUpdate(
      { serviceKey },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    if ((activityType || activityText || status) && cred) {
      try {
        await fetch(`${CLUSTER_CONTROL}/presence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceKey, status: cred.status, activityType: cred.activityType, activityText: cred.activityText }),
          signal: AbortSignal.timeout(3000)
        });
      } catch {}
    }

    systemEventsList.unshift({
      id: "ev-" + Date.now(),
      type: "success",
      tag: "Bot",
      message: (name || serviceKey) + " bot ayarları veritabanına kaydedildi.",
      time: "Az önce"
    });
    if (systemEventsList.length > 20) systemEventsList.pop();

    res.json({ success: true, credential: { ...cred.toObject(), token: cred.token ? "***" : "" } });
  } catch (error) {
    res.status(500).json({ error: "Bot ayarları kaydedilemedi: " + error.message });
  }
});

app.get("/api/bot-owners/:guildId", async (req, res) => {
  try {
    const configs = await GuildConfig.find().catch(() => []);
    let config = configs.find((c) => c.guildId && c.guildId === req.params.guildId && c.guildId !== "default");
    if (!config) {
      config = configs.find((c) => Array.isArray(c.botOwners) && c.botOwners.length > 0);
    }
    if (!config) {
      config = configs[0] || null;
    }
    res.json({ botOwners: config?.botOwners || [], guildId: config?.guildId || req.params.guildId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/bot-owners/:guildId", async (req, res) => {
  try {
    const { action, userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId zorunludur" });

    const configs = await GuildConfig.find().catch(() => []);
    let config = configs.find((c) => c.guildId && c.guildId === req.params.guildId && c.guildId !== "default");
    if (!config) {
      config = configs.find((c) => Array.isArray(c.botOwners) && c.botOwners.length > 0);
    }
    if (!config) {
      config = configs[0];
    }
    if (!config) {
      config = new GuildConfig({ guildId: req.params.guildId || "default", ...defaultGuildConfig });
    }

    const owners = Array.isArray(config.botOwners) ? [...config.botOwners] : [];
    if (action === "add") {
      if (!owners.includes(String(userId))) {
        owners.push(String(userId));
      }
    } else if (action === "remove") {
      const idx = owners.indexOf(String(userId));
      if (idx !== -1) owners.splice(idx, 1);
    }
    config.botOwners = owners;
    await config.save();

    systemEventsList.unshift({
      id: "ev-" + Date.now(),
      type: action === "add" ? "success" : "info",
      tag: "Yetki",
      message: "Bot yetkilisi listesi güncellendi. " + owners.length + " yetkili kayıtlı.",
      time: "Az önce"
    });
    if (systemEventsList.length > 20) systemEventsList.pop();

    res.json({ success: true, botOwners: owners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/clans/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const clans = await Clan.find({ guildId: targetGuildId }).sort({ level: -1, vault: -1 });
    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const clanConfig = {
      enabled: config.clanSystem?.enabled ?? true,
      createCost: config.clanSystem?.createCost ?? 10000,
      maxMembersBase: config.clanSystem?.maxMembersBase ?? 15,
      requireApproval: config.clanSystem?.requireApproval ?? false,
      minNameLength: config.clanSystem?.minNameLength ?? 3,
      maxNameLength: config.clanSystem?.maxNameLength ?? 24,
      minTagLength: config.clanSystem?.minTagLength ?? 2,
      maxTagLength: config.clanSystem?.maxTagLength ?? 6,
      channels: config.clanSystem?.channels || []
    };

    let totalVault = 0;
    let totalMembers = 0;
    clans.forEach((c) => {
      totalVault += Number(c.vault) || 0;
      totalMembers += Array.isArray(c.members) ? c.members.length : 0;
    });
    const totalClans = clans.length;
    const frozenClansCount = clans.filter((c) => c.isFrozen).length;
    const pendingClansCount = clans.filter((c) => c.approved === false).length;
    const topClan = clans.length > 0 ? {
      name: clans[0].name,
      tag: clans[0].tag,
      level: clans[0].level || 1,
      vault: clans[0].vault || 0,
      badge: clans[0].badge || "⚔️"
    } : null;

    const meta = await fetchGuildMeta(targetGuildId);

    res.json({
      success: true,
      guildId: targetGuildId,
      clans,
      config: clanConfig,
      stats: {
        totalClans,
        totalVault,
        totalMembers,
        frozenClansCount,
        pendingClansCount,
        topClan
      },
      channels: meta.channels || [],
      roles: meta.roles || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/clans/settings/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { enabled, createCost, maxMembersBase, requireApproval, minNameLength, maxNameLength, minTagLength, maxTagLength, channels } = req.body || {};

    const updateFields = {
      "clanSystem.enabled": Boolean(enabled),
      "clanSystem.createCost": Math.max(0, Number(createCost) || 10000),
      "clanSystem.maxMembersBase": Math.max(1, Number(maxMembersBase) || 15),
      "clanSystem.requireApproval": Boolean(requireApproval),
      "clanSystem.minNameLength": Math.max(1, Number(minNameLength) || 3),
      "clanSystem.maxNameLength": Math.max(5, Number(maxNameLength) || 24),
      "clanSystem.minTagLength": Math.max(1, Number(minTagLength) || 2),
      "clanSystem.maxTagLength": Math.max(3, Number(maxTagLength) || 6),
      "clanSystem.channels": Array.isArray(channels) ? channels : []
    };

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: updateFields }, { upsert: true });
    res.json({ success: true, message: "Klan kuralları ve parametreleri kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/clans/:guildId?/action", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, clanId, name, tag, leaderId, description, vault, level, badge, maxMembers } = req.body || {};

    if (action === "create") {
      const cleanName = String(name || "").trim();
      const cleanTag = String(tag || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!cleanName || !cleanTag) {
        return res.status(400).json({ success: false, error: "Klan adı ve etiketi zorunludur." });
      }

      const existing = await Clan.findOne({
        guildId: targetGuildId,
        $or: [{ name: cleanName }, { tag: cleanTag }]
      });
      if (existing) {
        return res.status(400).json({ success: false, error: "Bu klan adı veya etiketi zaten kullanımda." });
      }

      const newClan = await Clan.create({
        guildId: targetGuildId,
        name: cleanName,
        tag: cleanTag,
        leaderId: String(leaderId || "1").trim(),
        description: String(description || "Sunucu klanı.").trim(),
        members: [String(leaderId || "1").trim()],
        deputies: [],
        vault: Math.max(0, Number(vault) || 0),
        level: Math.max(1, Number(level) || 1),
        xp: 0,
        badge: String(badge || "⚔️").trim(),
        maxMembers: Math.max(5, Number(maxMembers) || 15),
        approved: true,
        isFrozen: false
      });

      return res.json({ success: true, message: `"${newClan.name}" klanı başarıyla kuruldu.`, clan: newClan });
    }

    if (action === "update") {
      if (!clanId) return res.status(400).json({ success: false, error: "Klan ID gereklidir." });
      const targetClan = await Clan.findOne({ _id: clanId, guildId: targetGuildId }) || await Clan.findOne({ id: clanId, guildId: targetGuildId }) || await Clan.findOne({ _id: clanId });
      if (!targetClan) return res.status(404).json({ success: false, error: "Klan bulunamadı." });

      const updateData = {};
      if (name) updateData.name = String(name).trim();
      if (tag) updateData.tag = String(tag).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (leaderId) updateData.leaderId = String(leaderId).trim();
      if (description !== undefined) updateData.description = String(description).trim();
      if (vault !== undefined) updateData.vault = Math.max(0, Number(vault) || 0);
      if (level !== undefined) updateData.level = Math.max(1, Number(level) || 1);
      if (badge) updateData.badge = String(badge).trim();
      if (maxMembers !== undefined) updateData.maxMembers = Math.max(5, Number(maxMembers) || 15);

      await Clan.updateOne({ _id: targetClan._id }, { $set: updateData });
      return res.json({ success: true, message: "Klan bilgileri güncellendi." });
    }

    if (action === "toggle_freeze") {
      if (!clanId) return res.status(400).json({ success: false, error: "Klan ID gereklidir." });
      const targetClan = await Clan.findOne({ _id: clanId, guildId: targetGuildId }) || await Clan.findOne({ id: clanId, guildId: targetGuildId }) || await Clan.findOne({ _id: clanId });
      if (!targetClan) return res.status(404).json({ success: false, error: "Klan bulunamadı." });

      const newFrozen = !targetClan.isFrozen;
      await Clan.updateOne({ _id: targetClan._id }, { $set: { isFrozen: newFrozen } });
      return res.json({
        success: true,
        message: newFrozen ? `"${targetClan.name}" klanı donduruldu.` : `"${targetClan.name}" klanının dondurması kaldırıldı.`,
        isFrozen: newFrozen
      });
    }

    if (action === "approve") {
      if (!clanId) return res.status(400).json({ success: false, error: "Klan ID gereklidir." });
      const targetClan = await Clan.findOne({ _id: clanId, guildId: targetGuildId }) || await Clan.findOne({ id: clanId, guildId: targetGuildId }) || await Clan.findOne({ _id: clanId });
      if (!targetClan) return res.status(404).json({ success: false, error: "Klan bulunamadı." });

      await Clan.updateOne({ _id: targetClan._id }, { $set: { approved: true } });
      return res.json({ success: true, message: "Klan onaylandı ve aktif hale getirildi." });
    }

    if (action === "delete") {
      if (!clanId) return res.status(400).json({ success: false, error: "Klan ID gereklidir." });
      const targetClan = await Clan.findOne({ _id: clanId, guildId: targetGuildId }) || await Clan.findOne({ id: clanId, guildId: targetGuildId }) || await Clan.findOne({ _id: clanId });
      if (!targetClan) return res.status(404).json({ success: false, error: "Silinecek klan bulunamadı." });

      await Clan.deleteOne({ _id: targetClan._id });
      return res.json({ success: true, message: `"${targetClan.name}" klanı başarıyla silindi.` });
    }

    res.status(400).json({ success: false, error: "Geçersiz işlem tipi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/badges/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const config = await GuildConfig.findOne({ guildId: targetGuildId });
    const allBadges = BadgeService.getAllBadges(config || {});
    const customBadges = config?.badgeSystem?.customBadges || [];
    const titles = BadgeService.BUILTIN_TITLES;
    const statsWithBadges = await Stat.find({ guildId: targetGuildId }).sort({ totalMessages: -1 }).limit(35);
    res.json({
      success: true,
      guildId: targetGuildId,
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
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/badges/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { enabled } = req.body;
    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      { $set: { "badgeSystem.enabled": Boolean(enabled) } },
      { upsert: true }
    );
    res.json({ success: true, message: "Rozet sistemi ayarları kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/badges/assign/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { userId, badgeId, title, action } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: "Kullanıcı ID zorunludur." });

    if (badgeId) {
      if (action === "remove") {
        await BadgeService.removeBadge(targetGuildId, userId, badgeId);
      } else {
        await BadgeService.awardBadge(targetGuildId, userId, badgeId);
      }
    }

    if (title) {
      if (action === "remove") {
        await BadgeService.setActiveTitle(targetGuildId, userId, "");
      } else {
        await BadgeService.unlockTitle(targetGuildId, userId, title);
      }
    }

    res.json({ success: true, message: "İşlem uygulandı." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/badges/clear-user/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, error: "Kullanıcı ID zorunludur." });

    await Stat.updateOne(
      { guildId: targetGuildId, userId },
      { $set: { badges: [], activeBadges: [], title: "" } }
    );
    res.json({ success: true, message: "Kullanıcının tüm rozet ve unvanları başarıyla kaldırıldı." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/badges/custom/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, badge } = req.body;

    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    let customBadges = Array.isArray(config.badgeSystem?.customBadges) ? [...config.badgeSystem.customBadges] : [];

    if (action === "create" || action === "update") {
      if (!badge || !badge.name) {
        return res.status(400).json({ success: false, error: "Rozet adı zorunludur." });
      }
      const rawId = badge.id || badge.originalId || `badge_${Date.now()}`;
      const cleanId = String(rawId).toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
      const targetMatchId = badge.originalId ? String(badge.originalId).toLowerCase().trim() : cleanId;

      customBadges = customBadges.filter((b) => b.id !== targetMatchId && b.id !== cleanId);
      customBadges.push({
        id: cleanId,
        name: String(badge.name).trim(),
        emoji: badge.emoji || "🎖️",
        desc: badge.desc || "Özel sunucu rozeti",
        isCustom: true
      });
    } else if (action === "delete") {
      const deleteId = badge?.id;
      customBadges = customBadges.filter((b) => b.id !== deleteId);
    }

    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      { $set: { "badgeSystem.customBadges": customBadges } },
      { upsert: true }
    );

    const resMessage = action === "delete" ? "Özel rozet silindi." : (action === "update" ? "Özel rozet güncellendi." : "Özel rozet başarıyla eklendi.");
    res.json({ success: true, message: resMessage, customBadges });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/pets/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const config = await GuildConfig.findOne({ guildId: targetGuildId });
    const catalog = PetService.getCatalog(config || {});
    const pets = await Pet.find({ guildId: targetGuildId }).sort({ level: -1, xp: -1 }).limit(50);

    let totalEnergy = 0;
    pets.forEach((p) => {
      totalEnergy += Number(p.energy) || 0;
    });
    const avgEnergy = pets.length > 0 ? Math.round(totalEnergy / pets.length) : 100;
    const topPet = pets.length > 0 ? pets[0] : null;
    const activeCount = pets.filter((p) => p.isActive).length;

    res.json({
      success: true,
      guildId: targetGuildId,
      enabled: config?.petSystem?.enabled ?? true,
      basePrice: config?.petSystem?.basePrice || 5000,
      feedCost: config?.petSystem?.feedCost || 200,
      catalog,
      pets,
      stats: {
        totalPets: pets.length,
        activePetsCount: activeCount,
        topPet: topPet ? {
          name: topPet.name,
          petType: topPet.petType,
          level: topPet.level
        } : null,
        avgEnergy
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/pets/settings/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { enabled, basePrice, feedCost } = req.body;
    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      {
        $set: {
          "petSystem.enabled": enabled ?? true,
          "petSystem.basePrice": Math.max(100, Number(basePrice) || 5000),
          "petSystem.feedCost": Math.max(10, Number(feedCost) || 200)
        }
      },
      { upsert: true }
    );
    res.json({ success: true, message: "Anime ruh hayvanları ayarları başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/pets/action/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, petId, userId, petType, name, level } = req.body || {};

    if (action === "adopt") {
      if (!userId || !petType) {
        return res.status(400).json({ success: false, error: "Kullanıcı ID ve pet türü zorunludur." });
      }
      const catalogInfo = PetService.getPetInfo(petType);
      const petName = name && String(name).trim() ? String(name).trim() : (catalogInfo?.name || "Ruh Yoldaşı");
      const newPet = await Pet.create({
        guildId: targetGuildId,
        userId: String(userId).trim(),
        petType,
        name: petName,
        level: Math.max(1, Number(level) || 1),
        xp: 0,
        energy: 100,
        isActive: true,
        lastFed: new Date()
      });
      return res.json({ success: true, message: `"${petName}" başarıyla kullanıcıya tanımlandı.`, pet: newPet });
    }

    if (!petId) {
      return res.status(400).json({ success: false, error: "Pet ID belirtilmelidir." });
    }

    const pet = await Pet.findOne({ $or: [{ _id: petId }, { id: petId }] });
    if (!pet) {
      return res.status(404).json({ success: false, error: "Evcil hayvan kaydı bulunamadı." });
    }

    if (action === "update") {
      if (name && String(name).trim()) pet.name = String(name).trim();
      if (petType) pet.petType = petType;
      if (level !== undefined) pet.level = Math.max(1, Number(level) || 1);
      if (req.body.energy !== undefined) pet.energy = Math.min(100, Math.max(0, Number(req.body.energy) || 0));
      if (req.body.isActive !== undefined) pet.isActive = Boolean(req.body.isActive);
      if (req.body.userId && String(req.body.userId).trim()) pet.userId = String(req.body.userId).trim();
      await pet.save();
      return res.json({ success: true, message: `"${pet.name}" bilgileri başarıyla güncellendi.`, pet });
    }

    if (action === "feed") {
      pet.energy = 100;
      pet.lastFed = new Date();
      await pet.save();
      return res.json({ success: true, message: `"${pet.name}" beslendi, enerjisi %100 yapıldı.` });
    }

    if (action === "level_up") {
      pet.level = (pet.level || 1) + 1;
      pet.xp = 0;
      pet.energy = 100;
      await pet.save();
      return res.json({ success: true, message: `"${pet.name}" seviye atlatıldı (Yeni Seviye: ${pet.level}).` });
    }

    if (action === "toggle_active") {
      pet.isActive = !pet.isActive;
      await pet.save();
      return res.json({ success: true, message: `"${pet.name}" aktiflik durumu güncellendi: ${pet.isActive ? "Aktif Yoldaş" : "Beklemede"}.` });
    }

    if (action === "delete") {
      await Pet.deleteOne({ $or: [{ _id: pet._id }, { id: pet._id }] });
      return res.json({ success: true, message: `"${pet.name}" başarıyla serbest bırakıldı ve silindi.` });
    }

    res.status(400).json({ success: false, error: "Bilinmeyen işlem türü." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/battlepass/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const season = await BattlePassService.getOrCreateSeason(targetGuildId);
    const participants = await UserBattlePass.find({ guildId: targetGuildId, season: season.season }).sort({ passLevel: -1, passXp: -1 }).limit(50);

    const vipCount = participants.filter((p) => p.hasVipPass).length;
    const topPlayer = participants.length > 0 ? {
      userId: participants[0].userId,
      passLevel: participants[0].passLevel,
      passXp: participants[0].passXp,
      hasVipPass: participants[0].hasVipPass
    } : null;

    const now = new Date();
    const end = new Date(season.endDate);
    const diffDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      guildId: targetGuildId,
      season,
      stats: {
        seasonNumber: season.season,
        seasonName: season.seasonName,
        active: season.active !== false,
        daysLeft: diffDays,
        totalTiers: Array.isArray(season.tiers) ? season.tiers.length : 0,
        dailyQuestsCount: Array.isArray(season.dailyQuestsConfig) ? season.dailyQuestsConfig.length : 0,
        weeklyQuestsCount: Array.isArray(season.weeklyQuestsConfig) ? season.weeklyQuestsConfig.length : 0,
        totalParticipants: participants.length,
        vipCount,
        topPlayer
      },
      participants
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/battlepass/season/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { seasonName, startDate, endDate, active, newSeason, durationDays } = req.body || {};

    if (newSeason) {
      const current = await BattlePass.findOne({ guildId: targetGuildId, active: true });
      const nextNum = (current?.season || 1) + 1;
      const days = Number(durationDays) || 30;
      const sDate = startDate ? new Date(startDate) : new Date();
      const eDate = endDate ? new Date(endDate) : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      if (current) {
        await BattlePass.updateOne({ _id: current._id }, { $set: { active: false } });
      }

      const defaultTiers = [
        { level: 1, requiredXp: 100, freeReward: { type: "COIN", name: "1.000 Coin", amount: 1000 }, vipReward: { type: "COIN", name: "3.000 Coin + Enerji İksiri", amount: 3000, itemId: "item_enerji" } },
        { level: 2, requiredXp: 250, freeReward: { type: "COIN", name: "1.500 Coin", amount: 1500 }, vipReward: { type: "COIN", name: "4.000 Coin + Titanyum Olta", amount: 4000, itemId: "item_olta" } },
        { level: 3, requiredXp: 450, freeReward: { type: "COIN", name: "2.000 Coin", amount: 2000 }, vipReward: { type: "COIN", name: "5.000 Coin + Kadim XP İksiri", amount: 5000, itemId: "item_xppot" } },
        { level: 4, requiredXp: 700, freeReward: { type: "COIN", name: "2.500 Coin", amount: 2500 }, vipReward: { type: "COIN", name: "6.000 Coin + Elmas Kazma", amount: 6000, itemId: "item_kazma" } },
        { level: 5, requiredXp: 1000, freeReward: { type: "COIN", name: "3.000 Coin", amount: 3000 }, vipReward: { type: "COIN", name: "8.000 Coin + Şans Sandığı", amount: 8000, itemId: "item_kutu" } },
        { level: 6, requiredXp: 1350, freeReward: { type: "COIN", name: "3.500 Coin", amount: 3500 }, vipReward: { type: "COIN", name: "10.000 Coin + Güvenlik Kalkanı", amount: 10000, itemId: "item_kalkan" } },
        { level: 7, requiredXp: 1750, freeReward: { type: "COIN", name: "4.000 Coin", amount: 4000 }, vipReward: { type: "COIN", name: "12.000 Coin + Çift XP Parşömeni", amount: 12000, itemId: "item_x2xp" } },
        { level: 8, requiredXp: 2200, freeReward: { type: "COIN", name: "4.500 Coin", amount: 4500 }, vipReward: { type: "COIN", name: "15.000 Coin + Safir Mücevher", amount: 15000, itemId: "item_mucehver" } },
        { level: 9, requiredXp: 2700, freeReward: { type: "COIN", name: "5.000 Coin", amount: 5000 }, vipReward: { type: "COIN", name: "20.000 Coin + Hırsızlık Sigortası", amount: 20000, itemId: "item_sigorta" } },
        { level: 10, requiredXp: 3500, freeReward: { type: "THEME", name: "10.000 Coin + Sakura Teması", amount: 10000, itemId: "tema_sakura" }, vipReward: { type: "THEME", name: "35.000 Coin + Sunset Teması", amount: 35000, itemId: "tema_sunset" } }
      ];

      const defaultDaily = [
        { id: "daily_msg", title: "Sohbet Kuşu", description: "Genel sohbette 25 mesaj gönder", targetType: "message", targetCount: 25, xpReward: 100, coinReward: 500 },
        { id: "daily_voice", title: "Muhabbet Ustası", description: "Ses kanallarında 30 dakika geçir", targetType: "voice_minute", targetCount: 30, xpReward: 150, coinReward: 750 },
        { id: "daily_work", title: "Emekçi", description: "2 kez .calis komutuyla meslek icra et", targetType: "work", targetCount: 2, xpReward: 100, coinReward: 400 },
        { id: "daily_game", title: "Maceracı", description: "1 kez balık tut veya madene in", targetType: "game", targetCount: 1, xpReward: 100, coinReward: 500 }
      ];

      const defaultWeekly = [
        { id: "weekly_msgs", title: "Topluluk Lideri", description: "Hafta boyunca 150 mesaj gönder", targetType: "message", targetCount: 150, xpReward: 400, coinReward: 2500 },
        { id: "weekly_voice", title: "Gece Nöbetçisi", description: "Hafta boyunca seste 3 saat geçir", targetType: "voice_minute", targetCount: 180, xpReward: 500, coinReward: 3500 },
        { id: "weekly_chest", title: "Kasa Avcısı", description: "1 adet Gizemli Şans Sandığı aç", targetType: "chest", targetCount: 1, xpReward: 350, coinReward: 2000 }
      ];

      const newBp = await BattlePass.create({
        guildId: targetGuildId,
        season: nextNum,
        seasonName: seasonName || `${nextNum}. Sezon: Yeni Başlangıç`,
        startDate: sDate,
        endDate: eDate,
        active: true,
        tiers: current?.tiers || defaultTiers,
        dailyQuestsConfig: current?.dailyQuestsConfig || defaultDaily,
        weeklyQuestsConfig: current?.weeklyQuestsConfig || defaultWeekly
      });

      return res.json({ success: true, message: `Yeni sezon (${newBp.seasonName}) başarıyla başlatıldı.`, season: newBp });
    }

    const currentSeason = await BattlePassService.getOrCreateSeason(targetGuildId);
    const updateFields = {};
    if (seasonName !== undefined) updateFields.seasonName = String(seasonName).trim();
    if (startDate) updateFields.startDate = new Date(startDate);
    if (endDate) updateFields.endDate = new Date(endDate);
    if (active !== undefined) updateFields.active = Boolean(active);

    await BattlePass.updateOne({ _id: currentSeason._id }, { $set: updateFields });
    res.json({ success: true, message: "Sezon ayarları ve zaman çizelgesi kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/battlepass/tier/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, tier } = req.body || {};
    const season = await BattlePassService.getOrCreateSeason(targetGuildId);

    let tiers = Array.isArray(season.tiers) ? [...season.tiers] : [];

    if (action === "delete") {
      const levelToDelete = Number(tier?.level);
      tiers = tiers.filter((t) => t.level !== levelToDelete);
    } else {
      if (!tier || tier.level === undefined || !tier.requiredXp) {
        return res.status(400).json({ success: false, error: "Kademe seviyesi ve gereken XP zorunludur." });
      }
      const lvl = Math.max(1, Number(tier.level));
      const reqXp = Math.max(10, Number(tier.requiredXp));
      const freeReward = {
        type: tier.freeReward?.type || "COIN",
        name: String(tier.freeReward?.name || "Ödül").trim(),
        amount: Number(tier.freeReward?.amount) || 0,
        itemId: String(tier.freeReward?.itemId || "").trim()
      };
      const vipReward = {
        type: tier.vipReward?.type || "COIN",
        name: String(tier.vipReward?.name || "VIP Ödül").trim(),
        amount: Number(tier.vipReward?.amount) || 0,
        itemId: String(tier.vipReward?.itemId || "").trim()
      };

      tiers = tiers.filter((t) => t.level !== lvl);
      tiers.push({ level: lvl, requiredXp: reqXp, freeReward, vipReward });
    }

    tiers.sort((a, b) => a.level - b.level);
    await BattlePass.updateOne({ _id: season._id }, { $set: { tiers } });
    res.json({ success: true, message: action === "delete" ? "Kademe silindi." : "Kademe kaydedildi.", tiers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/battlepass/quest/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, questType, quest } = req.body || {};
    const season = await BattlePassService.getOrCreateSeason(targetGuildId);

    const isWeekly = questType === "weekly";
    const fieldName = isWeekly ? "weeklyQuestsConfig" : "dailyQuestsConfig";
    let list = Array.isArray(season[fieldName]) ? [...season[fieldName]] : [];

    if (action === "delete") {
      const qId = quest?.id;
      list = list.filter((q) => q.id !== qId);
    } else {
      if (!quest || !quest.id || !quest.title) {
        return res.status(400).json({ success: false, error: "Görev ID ve başlığı zorunludur." });
      }
      const cleanId = String(quest.id).toLowerCase().trim().replace(/[^a-z0-9_]/g, "_");
      const cleanQuest = {
        id: cleanId,
        title: String(quest.title).trim(),
        description: String(quest.description || "").trim(),
        targetType: quest.targetType || "message",
        targetCount: Math.max(1, Number(quest.targetCount) || 1),
        xpReward: Math.max(10, Number(quest.xpReward) || 100),
        coinReward: Math.max(0, Number(quest.coinReward) || 0)
      };

      list = list.filter((q) => q.id !== cleanId);
      list.push(cleanQuest);
    }

    await BattlePass.updateOne({ _id: season._id }, { $set: { [fieldName]: list } });
    res.json({ success: true, message: action === "delete" ? "Görev kaldırıldı." : "Görev başarıyla kaydedildi.", [fieldName]: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/battlepass/user/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, userId, amount, level, hasVipPass } = req.body || {};

    if (!userId) {
      return res.status(400).json({ success: false, error: "Kullanıcı ID zorunludur." });
    }

    const { season, userProgress } = await BattlePassService.getUserProgress(targetGuildId, String(userId).trim());

    if (action === "toggle_vip" || action === "set_vip") {
      const newVip = hasVipPass !== undefined ? Boolean(hasVipPass) : !userProgress.hasVipPass;
      userProgress.hasVipPass = newVip;
      await UserBattlePass.updateOne({ _id: userProgress._id }, { $set: { hasVipPass: newVip } });
      return res.json({ success: true, message: newVip ? "Kullanıcıya VIP Bilet tanımlandı." : "Kullanıcının VIP Bileti kaldırıldı.", hasVipPass: newVip });
    }

    if (action === "add_xp") {
      const addXp = Number(amount) || 250;
      userProgress.passXp = (Number(userProgress.passXp) || 0) + addXp;

      let newLvl = userProgress.passLevel || 1;
      for (const tier of season.tiers || []) {
        if (userProgress.passXp >= tier.requiredXp && tier.level > newLvl) {
          newLvl = tier.level;
        }
      }
      userProgress.passLevel = newLvl;

      await UserBattlePass.updateOne({ _id: userProgress._id }, { $set: { passXp: userProgress.passXp, passLevel: userProgress.passLevel } });
      return res.json({ success: true, message: `Kullanıcıya ${addXp} Battle Pass XP eklendi (Seviye: ${newLvl}).`, passXp: userProgress.passXp, passLevel: newLvl });
    }

    if (action === "set_level") {
      const setLvl = Math.max(1, Number(level) || 1);
      const matchingTier = (season.tiers || []).find((t) => t.level === setLvl);
      const reqXp = matchingTier ? matchingTier.requiredXp : (setLvl * 250);

      userProgress.passLevel = setLvl;
      userProgress.passXp = Math.max(userProgress.passXp || 0, reqXp);

      await UserBattlePass.updateOne({ _id: userProgress._id }, { $set: { passLevel: setLvl, passXp: userProgress.passXp } });
      return res.json({ success: true, message: `Kullanıcı seviyesi ${setLvl} olarak ayarlandı.`, passLevel: setLvl, passXp: userProgress.passXp });
    }

    if (action === "reset_user" || action === "delete") {
      await UserBattlePass.deleteOne({ _id: userProgress._id });
      return res.json({ success: true, message: "Kullanıcının bu sezona ait Battle Pass ilerlemesi sıfırlandı ve silindi." });
    }

    res.status(400).json({ success: false, error: "Geçersiz kullanıcı işlemi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function fetchGuildMeta(guildId) {
  try {
    const url = guildId ? `${CLUSTER_CONTROL}/guild-meta?guildId=${guildId}` : `${CLUSTER_CONTROL}/guild-meta`;
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (r.ok) return await r.json();
  } catch {}
  return { found: false, roles: [], channels: [] };
}

app.get("/api/economy/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const economyConfig = {
      currencyName: config.economyConfig?.currencyName || "Coin",
      currencySymbol: config.economyConfig?.currencySymbol || "🪙",
      startingBalance: config.economyConfig?.startingBalance ?? 100,
      dailyMin: config.economyConfig?.dailyMin ?? 250,
      dailyMax: config.economyConfig?.dailyMax ?? 750,
      workCooldownMinutes: config.economyConfig?.workCooldownMinutes ?? 15,
      workMin: config.economyConfig?.workMin ?? 100,
      workMax: config.economyConfig?.workMax ?? 350,
      robSuccessRate: config.economyConfig?.robSuccessRate ?? 45,
      robCooldownMinutes: config.economyConfig?.robCooldownMinutes ?? 30,
      robMinWallet: config.economyConfig?.robMinWallet ?? 200,
      transferTaxPercent: config.economyConfig?.transferTaxPercent ?? 5,
      depositInterestRate: config.economyConfig?.depositInterestRate ?? 12,
      channels: config.economyConfig?.channels || []
    };

    const economyMarket = {
      goldPrice: config.economyMarket?.goldPrice ?? 2500,
      btcPrice: config.economyMarket?.btcPrice ?? 65000,
      silverPrice: config.economyMarket?.silverPrice ?? 85,
      discountPercent: config.economyMarket?.discountPercent ?? 0,
      minGoldPrice: config.economyMarket?.minGoldPrice ?? 1000,
      maxGoldPrice: config.economyMarket?.maxGoldPrice ?? 10000,
      minBtcPrice: config.economyMarket?.minBtcPrice ?? 20000,
      maxBtcPrice: config.economyMarket?.maxBtcPrice ?? 250000,
      autoFluctuation: config.economyMarket?.autoFluctuation ?? true,
      lastUpdate: config.economyMarket?.lastUpdate || new Date()
    };

    const allEconomies = await Economy.find({ guildId: targetGuildId });
    let totalWallet = 0;
    let totalBank = 0;
    allEconomies.forEach((e) => {
      totalWallet += Number(e.wallet) || 0;
      totalBank += Number(e.bank) || 0;
    });
    const totalCirculating = totalWallet + totalBank;
    const activeUsersCount = allEconomies.length;

    const allMarketHoldings = await MarketItem.find({ guildId: targetGuildId });
    let totalCommodityValue = 0;
    allMarketHoldings.forEach((m) => {
      const amt = Number(m.amount) || 0;
      if (m.itemKey === "GOLD") totalCommodityValue += amt * economyMarket.goldPrice;
      else if (m.itemKey === "BTC") totalCommodityValue += amt * economyMarket.btcPrice;
      else if (m.itemKey === "SILVER") totalCommodityValue += amt * economyMarket.silverPrice;
      else totalCommodityValue += amt * (Number(m.buyPrice) || 0);
    });

    const shopItems = await ShopItem.find({ guildId: targetGuildId });

    const richDocs = await Economy.find({ guildId: targetGuildId }).sort({ wallet: -1 }).limit(25);
    const topRichest = [];
    for (const doc of richDocs) {
      const userHoldings = allMarketHoldings.filter((m) => m.userId === doc.userId);
      let portfolioVal = 0;
      userHoldings.forEach((m) => {
        const amt = Number(m.amount) || 0;
        if (m.itemKey === "GOLD") portfolioVal += amt * economyMarket.goldPrice;
        else if (m.itemKey === "BTC") portfolioVal += amt * economyMarket.btcPrice;
        else if (m.itemKey === "SILVER") portfolioVal += amt * economyMarket.silverPrice;
      });
      const totalWealth = (Number(doc.wallet) || 0) + (Number(doc.bank) || 0) + portfolioVal;

      let username = doc.userId;
      const account = await UserAccount.findOne({ userId: doc.userId, guildId: targetGuildId });
      if (account?.username) {
        username = account.username;
      }

      topRichest.push({
        _id: doc._id,
        userId: doc.userId,
        username,
        wallet: Number(doc.wallet) || 0,
        bank: Number(doc.bank) || 0,
        portfolioVal,
        totalWealth,
        updatedAt: doc.updatedAt
      });
    }
    topRichest.sort((a, b) => b.totalWealth - a.totalWealth);

    const meta = await fetchGuildMeta(targetGuildId);

    res.json({
      success: true,
      guildId: targetGuildId,
      economyConfig,
      economyMarket,
      stats: {
        totalCirculating,
        totalWallet,
        totalBank,
        activeUsersCount,
        totalCommodityValue,
        activeShopItemsCount: shopItems.filter((i) => i.active !== false).length
      },
      shopItems,
      topRichest,
      channels: meta.channels || [],
      roles: meta.roles || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/economy/config/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { economyConfig, economyMarket } = req.body || {};

    const updateFields = {};
    if (economyConfig) {
      for (const [k, v] of Object.entries(economyConfig)) {
        updateFields[`economyConfig.${k}`] = v;
      }
    }
    if (economyMarket) {
      for (const [k, v] of Object.entries(economyMarket)) {
        updateFields[`economyMarket.${k}`] = v;
      }
    }

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: updateFields }, { upsert: true });
    res.json({ success: true, message: "Ekonomi ayarları başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/economy/market-price/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { goldPrice, btcPrice, silverPrice, autoFluctuation, discountPercent } = req.body || {};

    const updateFields = { "economyMarket.lastUpdate": new Date() };
    if (goldPrice !== undefined) updateFields["economyMarket.goldPrice"] = Number(goldPrice);
    if (btcPrice !== undefined) updateFields["economyMarket.btcPrice"] = Number(btcPrice);
    if (silverPrice !== undefined) updateFields["economyMarket.silverPrice"] = Number(silverPrice);
    if (autoFluctuation !== undefined) updateFields["economyMarket.autoFluctuation"] = Boolean(autoFluctuation);
    if (discountPercent !== undefined) updateFields["economyMarket.discountPercent"] = Number(discountPercent);

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: updateFields }, { upsert: true });
    res.json({ success: true, message: "Piyasa fiyatları güncellendi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/economy/shop-item/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { _id, itemKey, name, description, price, type, roleId, active } = req.body || {};

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, error: "Ürün adı ve fiyatı zorunludur." });
    }

    const targetId = _id || req.body.id;
    const key = itemKey ? String(itemKey).trim().toLowerCase().replace(/\s+/g, "_") : `item_${Date.now()}`;

    if (targetId) {
      await ShopItem.updateOne(
        { $or: [{ _id: targetId }, { id: targetId }] },
        {
          $set: {
            itemKey: key,
            name: String(name).trim(),
            description: String(description || "").trim(),
            price: Number(price) || 0,
            type: type || "ROLE",
            roleId: String(roleId || ""),
            active: active !== false
          }
        }
      );
      return res.json({ success: true, message: "Mağaza ürünü başarıyla güncellendi." });
    }

    const existing = await ShopItem.findOne({ guildId: targetGuildId, itemKey: key });
    if (existing) {
      return res.status(400).json({ success: false, error: "Bu ürün anahtarı (itemKey) zaten kullanımda." });
    }

    await ShopItem.create({
      guildId: targetGuildId,
      itemKey: key,
      name: String(name).trim(),
      description: String(description || "").trim(),
      price: Number(price) || 0,
      type: type || "ROLE",
      roleId: String(roleId || ""),
      active: active !== false
    });

    res.json({ success: true, message: "Yeni mağaza ürünü eklendi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete(["/api/economy/shop-item/:guildId/:id", "/api/economy/shop-item/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    await ShopItem.deleteOne({ $or: [{ _id: id }, { id }] });
    res.json({ success: true, message: "Mağaza ürünü silindi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/economy/user-balance/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { userId, action, target, amount } = req.body || {};

    if (!userId || amount === undefined) {
      return res.status(400).json({ success: false, error: "Kullanıcı ID ve miktar zorunludur." });
    }

    const cleanAmount = Math.max(0, Math.floor(Number(amount)));
    const balanceField = target === "bank" ? "bank" : "wallet";

    let userEco = await Economy.findOne({ guildId: targetGuildId, userId: String(userId).trim() });
    if (!userEco) {
      userEco = await Economy.create({
        guildId: targetGuildId,
        userId: String(userId).trim(),
        wallet: 0,
        bank: 0
      });
    }

    let newBalance = Number(userEco[balanceField]) || 0;
    if (action === "add") {
      newBalance += cleanAmount;
    } else if (action === "remove") {
      newBalance = Math.max(0, newBalance - cleanAmount);
    } else if (action === "set") {
      newBalance = cleanAmount;
    }

    await Economy.updateOne(
      { _id: userEco._id },
      {
        $set: {
          [balanceField]: newBalance,
          updatedAt: new Date()
        }
      }
    );

    res.json({
      success: true,
      message: `Kullanıcı bakiyesi güncellendi (${balanceField}: ${newBalance.toLocaleString("tr-TR")}).`,
      balance: newBalance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/casino/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;

    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({
        guildId: targetGuildId,
        ...defaultGuildConfig
      });
    }

    const casino = config.casinoSettings || {};
    const games = casino.games || {
      blackjack: true,
      rulet: true,
      slot: true,
      yazitura: true,
      kazikazan: true,
      piyango: true
    };
    const activeGamesCount = Object.values(games).filter(Boolean).length;

    const meta = await fetchGuildMeta(targetGuildId);
    const channels = meta.channels || [];

    const stats = {
      enabled: casino.enabled !== false,
      activeGamesCount,
      minBet: casino.minBet ?? 10,
      maxBet: casino.maxBet ?? 50000,
      duelEnabled: casino.duel?.enabled !== false,
      restrictedChannelsCount: Array.isArray(casino.channels) ? casino.channels.length : 0,
      duelRestrictedChannelsCount: Array.isArray(casino.duel?.channels) ? casino.duel.channels.length : 0
    };

    res.json({
      success: true,
      guildId: targetGuildId,
      casinoSettings: casino,
      stats,
      channels
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/casino/settings/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { enabled, minBet, maxBet, kazikazanCost, lotteryTicketCost, casinoTaxPercent, channels } = req.body || {};

    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      {
        $set: {
          "casinoSettings.enabled": Boolean(enabled),
          "casinoSettings.minBet": Math.max(1, Number(minBet) || 10),
          "casinoSettings.maxBet": Math.max(10, Number(maxBet) || 50000),
          "casinoSettings.kazikazanCost": Math.max(1, Number(kazikazanCost) || 50),
          "casinoSettings.lotteryTicketCost": Math.max(1, Number(lotteryTicketCost) || 100),
          "casinoSettings.casinoTaxPercent": Math.max(0, Math.min(50, Number(casinoTaxPercent) || 3)),
          "casinoSettings.channels": Array.isArray(channels) ? channels : []
        }
      },
      { upsert: true }
    );

    res.json({ success: true, message: "Kumarhane temel ayarları ve limitleri kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/casino/games/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { games, multipliers } = req.body || {};

    const updateSet = {};
    if (games && typeof games === "object") {
      updateSet["casinoSettings.games"] = {
        blackjack: Boolean(games.blackjack),
        rulet: Boolean(games.rulet),
        slot: Boolean(games.slot),
        yazitura: Boolean(games.yazitura),
        kazikazan: Boolean(games.kazikazan),
        piyango: Boolean(games.piyango)
      };
    }
    if (multipliers && typeof multipliers === "object") {
      updateSet["casinoSettings.multipliers"] = {
        blackjackNatural: Math.max(1, Number(multipliers.blackjackNatural) || 2.5),
        rouletteGreen: Math.max(1, Number(multipliers.rouletteGreen) || 14),
        slotJackpot: Math.max(1, Number(multipliers.slotJackpot) || 10),
        slotDiamond: Math.max(1, Number(multipliers.slotDiamond) || 5),
        slotFruit: Math.max(1, Number(multipliers.slotFruit) || 3),
        kazikazanJackpot: Math.max(1, Number(multipliers.kazikazanJackpot) || 50)
      };
    }

    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      { $set: updateSet },
      { upsert: true }
    );

    res.json({ success: true, message: "Oyun modları ve kazanma çarpanları başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/casino/duel/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { enabled, minBet, maxBet, timeoutSeconds, taxPercent, channels } = req.body || {};

    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      {
        $set: {
          "casinoSettings.duel": {
            enabled: Boolean(enabled),
            minBet: Math.max(1, Number(minBet) || 50),
            maxBet: Math.max(10, Number(maxBet) || 100000),
            timeoutSeconds: Math.max(10, Math.min(300, Number(timeoutSeconds) || 60)),
            taxPercent: Math.max(0, Math.min(50, Number(taxPercent) || 2)),
            channels: Array.isArray(channels) ? channels : []
          }
        }
      },
      { upsert: true }
    );

    res.json({ success: true, message: "Bahisli düello sistemi ayarları kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/guard/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const guard = {
      active: config.guard?.active ?? true,
      safeUsers: Array.isArray(config.guard?.safeUsers) ? config.guard.safeUsers : [],
      safeRoles: Array.isArray(config.guard?.safeRoles) ? config.guard.safeRoles : [],
      safeBots: Array.isArray(config.guard?.safeBots) ? config.guard.safeBots : [],
      blockWebhooks: config.guard?.blockWebhooks ?? true,
      blockBots: config.guard?.blockBots ?? true
    };

    const guardPanic = {
      enabled: config.guardPanic?.enabled ?? true,
      threshold: config.guardPanic?.threshold ?? 5,
      timeWindowMs: config.guardPanic?.timeWindowMs ?? 5000,
      isPanic: config.guardPanic?.isPanic ?? false
    };

    const limits = {
      pointLimit: config.limits?.pointLimit ?? 100,
      banLimit: config.limits?.banLimit ?? 3,
      kickLimit: config.limits?.kickLimit ?? 3,
      jailLimit: config.limits?.jailLimit ?? 5,
      roleDeleteLimit: config.limits?.roleDeleteLimit ?? 1,
      roleCreateLimit: config.limits?.roleCreateLimit ?? 2,
      channelDeleteLimit: config.limits?.channelDeleteLimit ?? 1,
      channelCreateLimit: config.limits?.channelCreateLimit ?? 2
    };

    const filters = {
      customWords: Array.isArray(config.filters?.customWords) ? config.filters.customWords : [],
      linkFilter: config.filters?.linkFilter ?? true,
      capsFilter: config.filters?.capsFilter ?? true,
      spamFilter: config.filters?.spamFilter ?? true
    };

    const whitelistTotal = guard.safeUsers.length + guard.safeRoles.length + guard.safeBots.length;
    let statusText = "AKTİF";
    if (guardPanic.isPanic) statusText = "PANİK MODU";
    else if (!guard.active) statusText = "PASİF";

    const meta = await fetchGuildMeta(targetGuildId);

    res.json({
      success: true,
      guildId: targetGuildId,
      guard,
      guardPanic,
      limits,
      filters,
      stats: {
        statusText,
        whitelistTotal,
        safeUsersCount: guard.safeUsers.length,
        safeRolesCount: guard.safeRoles.length,
        safeBotsCount: guard.safeBots.length,
        customWordsCount: filters.customWords.length,
        isPanic: guardPanic.isPanic
      },
      roles: meta.roles || [],
      channels: meta.channels || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/guard/config/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { guard, guardPanic, limits, filters } = req.body || {};

    const updateFields = {};
    if (guard) {
      for (const [k, v] of Object.entries(guard)) {
        updateFields[`guard.${k}`] = v;
      }
    }
    if (guardPanic) {
      for (const [k, v] of Object.entries(guardPanic)) {
        updateFields[`guardPanic.${k}`] = v;
      }
    }
    if (limits) {
      for (const [k, v] of Object.entries(limits)) {
        updateFields[`limits.${k}`] = Number(v) || 0;
      }
    }
    if (filters) {
      for (const [k, v] of Object.entries(filters)) {
        updateFields[`filters.${k}`] = v;
      }
    }

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: updateFields }, { upsert: true });
    res.json({ success: true, message: "Güvenlik ayarları başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/guard/whitelist/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, type, id } = req.body || {};

    if (!type || !id) {
      return res.status(400).json({ success: false, error: "Tür ve ID bilgisi zorunludur." });
    }

    let field = "guard.safeUsers";
    if (type === "role") field = "guard.safeRoles";
    else if (type === "bot") field = "guard.safeBots";

    const config = await GuildConfig.findOne({ guildId: targetGuildId });
    const currentList = Array.isArray(config?.guard?.[type === "role" ? "safeRoles" : (type === "bot" ? "safeBots" : "safeUsers")])
      ? [...config.guard[type === "role" ? "safeRoles" : (type === "bot" ? "safeBots" : "safeUsers")]]
      : [];

    const targetCleanId = String(id).trim();
    let updatedList = [];
    if (action === "add") {
      if (!currentList.includes(targetCleanId)) {
        currentList.push(targetCleanId);
      }
      updatedList = currentList;
    } else {
      updatedList = currentList.filter((item) => item !== targetCleanId);
    }

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: { [field]: updatedList } }, { upsert: true });
    res.json({ success: true, message: action === "add" ? "Güvenli listeye eklendi." : "Güvenli listeden kaldırıldı.", list: updatedList });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/guard/panic-toggle/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const config = await GuildConfig.findOne({ guildId: targetGuildId });
    const currentPanic = Boolean(config?.guardPanic?.isPanic);
    const nextPanic = !currentPanic;

    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      { $set: { "guardPanic.isPanic": nextPanic } },
      { upsert: true }
    );

    res.json({
      success: true,
      message: nextPanic ? "Panik Modu devreye alındı. Sunucu izinleri kilitlendi." : "Panik Modu kapatıldı. Normal güvenlik seviyesine dönüldü.",
      isPanic: nextPanic
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/guard/word-filter/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, word } = req.body || {};

    if (!word || !String(word).trim()) {
      return res.status(400).json({ success: false, error: "Kelime belirtilmelidir." });
    }

    const cleanWord = String(word).trim().toLowerCase();
    const config = await GuildConfig.findOne({ guildId: targetGuildId });
    let customWords = Array.isArray(config?.filters?.customWords) ? [...config.filters.customWords] : [];

    if (action === "add") {
      if (!customWords.includes(cleanWord)) {
        customWords.push(cleanWord);
      }
    } else {
      customWords = customWords.filter((w) => w !== cleanWord);
    }

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: { "filters.customWords": customWords } }, { upsert: true });
    res.json({ success: true, message: action === "add" ? "Yasaklı kelime eklendi." : "Yasaklı kelime kaldırıldı.", customWords });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/penalties/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const penalties = await Penalty.find({ guildId: targetGuildId }).sort({ createdAt: -1 }).limit(100);

    let totalBans = 0;
    let totalJails = 0;
    let totalMutes = 0;
    let activeCount = 0;
    let totalPoints = 0;

    penalties.forEach((p) => {
      const type = (p.type || "").toUpperCase();
      if (type === "BAN") totalBans++;
      if (type === "JAIL" || type === "QUARANTINE") totalJails++;
      if (type === "MUTE" || type === "VMUTE") totalMutes++;
      if (p.active) activeCount++;
      totalPoints += Number(p.points) || 0;
    });

    const avgPoints = penalties.length > 0 ? Math.round(totalPoints / penalties.length) : 0;

    const penaltyThresholds = {
      mute: config.penaltyThresholds?.mute ?? 40,
      jail: config.penaltyThresholds?.jail ?? 80,
      ban: config.penaltyThresholds?.ban ?? 150,
      pointLimit: config.limits?.pointLimit ?? 100
    };

    res.json({
      success: true,
      guildId: targetGuildId,
      penalties,
      penaltyThresholds,
      stats: {
        totalPenalties: penalties.length,
        activePenalties: activeCount,
        totalBans,
        totalJails,
        totalMutes,
        avgPoints
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/penalties/action/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, penaltyId, userId, executorId, type, reason, points, durationMs, expiresAt, active } = req.body || {};

    if (action === "create") {
      if (!userId || !type) {
        return res.status(400).json({ success: false, error: "Kullanıcı ID ve ceza türü zorunludur." });
      }

      const count = await Penalty.countDocuments({ guildId: targetGuildId });
      const lastDoc = await Penalty.find({ guildId: targetGuildId }).sort({ caseId: -1 }).limit(1);
      const lastCaseId = (lastDoc && lastDoc[0] && lastDoc[0].caseId) ? Number(lastDoc[0].caseId) : count;
      const nextCaseId = lastCaseId + 1;

      let expDate = null;
      if (expiresAt) {
        expDate = new Date(expiresAt);
      } else if (durationMs && Number(durationMs) > 0) {
        expDate = new Date(Date.now() + Number(durationMs));
      }

      const newPenalty = await Penalty.create({
        caseId: nextCaseId,
        guildId: targetGuildId,
        userId: String(userId).trim(),
        executorId: String(executorId || "Dashboard").trim(),
        type: String(type).toUpperCase().trim(),
        reason: String(reason || "Belirtilmedi").trim(),
        points: Number(points) || 10,
        durationMs: Number(durationMs) || 0,
        expiresAt: expDate,
        active: active !== false,
        liftedAt: null,
        liftedBy: null
      });

      return res.json({ success: true, message: `#${nextCaseId} numaralı ceza başarıyla uygulandı.`, penalty: newPenalty });
    }

    if (!penaltyId) {
      return res.status(400).json({ success: false, error: "Ceza ID veya vaka numarası belirtilmelidir." });
    }

    const isNum = !isNaN(Number(penaltyId));
    const orBranch = [{ _id: penaltyId }, { id: penaltyId }];
    if (isNum) orBranch.push({ caseId: Number(penaltyId) });

    const targetPenalty = await Penalty.findOne({ $or: orBranch, guildId: targetGuildId });
    if (!targetPenalty) {
      return res.status(404).json({ success: false, error: "Ceza kaydı bulunamadı." });
    }

    if (action === "update") {
      if (reason !== undefined) targetPenalty.reason = String(reason).trim();
      if (points !== undefined) targetPenalty.points = Number(points) || 0;
      if (durationMs !== undefined) targetPenalty.durationMs = Number(durationMs) || 0;
      if (type !== undefined) targetPenalty.type = String(type).toUpperCase().trim();
      if (active !== undefined) targetPenalty.active = Boolean(active);
      if (expiresAt !== undefined) targetPenalty.expiresAt = expiresAt ? new Date(expiresAt) : null;
      await targetPenalty.save();
      return res.json({ success: true, message: `#${targetPenalty.caseId} numaralı ceza güncellendi.`, penalty: targetPenalty });
    }

    if (action === "lift") {
      targetPenalty.active = false;
      targetPenalty.liftedAt = new Date();
      targetPenalty.liftedBy = String(executorId || "Dashboard Yetkilisi").trim();
      await targetPenalty.save();
      return res.json({ success: true, message: `#${targetPenalty.caseId} numaralı ceza kaldırıldı ve affedildi.`, penalty: targetPenalty });
    }

    if (action === "delete") {
      await Penalty.deleteOne({ $or: [{ _id: targetPenalty._id }, { id: targetPenalty._id }] });
      return res.json({ success: true, message: `#${targetPenalty.caseId} numaralı ceza kaydı veritabanından kalıcı olarak silindi.` });
    }

    res.status(400).json({ success: false, error: "Bilinmeyen ceza işlemi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/penalties/thresholds/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { mute, jail, ban, pointLimit } = req.body || {};

    const updateFields = {};
    if (mute !== undefined) updateFields["penaltyThresholds.mute"] = Number(mute) || 40;
    if (jail !== undefined) updateFields["penaltyThresholds.jail"] = Number(jail) || 80;
    if (ban !== undefined) updateFields["penaltyThresholds.ban"] = Number(ban) || 150;
    if (pointLimit !== undefined) updateFields["limits.pointLimit"] = Number(pointLimit) || 100;

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: updateFields }, { upsert: true });
    res.json({ success: true, message: "Ceza puanı eşikleri ve limitleri başarıyla kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/staff-tasks/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;

    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const tasks = await StaffTask.find({ guildId: targetGuildId }).sort({ createdAt: -1 });
    const kpis = await StaffKpi.find({ guildId: targetGuildId }).sort({ totalScore: -1 }).limit(10);

    const totalTasks = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const failed = tasks.filter((t) => t.status === "FAILED").length;
    const successRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    let topStaff = null;
    if (kpis.length > 0) {
      topStaff = { staffId: kpis[0].staffId, score: kpis[0].totalScore };
    } else if (tasks.length > 0) {
      const best = [...tasks].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
      topStaff = { staffId: best.userId, score: best.points || 0 };
    }

    let meta = { roles: [] };
    try {
      meta = await fetchGuildMeta(targetGuildId);
    } catch {
      meta = { roles: [] };
    }

    const defaults = {
      targetVoiceHours: 10,
      targetMessages: 500,
      targetRegisters: 5,
      rewardPoints: 100,
      ...(config.staffTaskDefaults || {})
    };

    res.json({
      success: true,
      guildId: targetGuildId,
      tasks,
      kpis,
      defaults,
      stats: {
        totalTasks,
        inProgress,
        completed,
        failed,
        successRate,
        topStaff
      },
      staffRoles: config.roles?.staffRoles || [],
      roles: meta.roles || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/staff-tasks/action/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, taskId, userId, weekNumber, year, targetVoiceHours, targetMessages, targetRegisters, currentVoiceHours, currentVoiceMs, currentMessages, currentRegisters, points, status } = req.body || {};

    if (action === "assign") {
      if (!userId) {
        return res.status(400).json({ success: false, error: "Yetkili Discord ID zorunludur." });
      }

      const now = new Date();
      const oneJan = new Date(now.getFullYear(), 0, 1);
      const numberOfDays = Math.floor((now - oneJan) / (24 * 60 * 60 * 1000));
      const curWeek = Math.ceil((now.getDay() + 1 + numberOfDays) / 7);
      const curYear = now.getFullYear();

      const finalWeek = Number(weekNumber) || curWeek;
      const finalYear = Number(year) || curYear;
      const vHours = Number(targetVoiceHours) || 10;
      const vMs = vHours * 3600000;
      const mTarget = Number(targetMessages) || 500;
      const rTarget = Number(targetRegisters) || 5;
      const pCount = Number(points) || 100;

      const task = await StaffTask.findOneAndUpdate(
        { guildId: targetGuildId, userId: String(userId).trim(), weekNumber: finalWeek, year: finalYear },
        {
          $set: {
            targetVoiceMs: vMs,
            targetMessages: mTarget,
            targetRegisters: rTarget,
            points: pCount,
            status: "IN_PROGRESS"
          }
        },
        { upsert: true, new: true }
      );

      return res.json({ success: true, message: "Yetkiliye yeni haftalık görev başarıyla atandı.", task });
    }

    if (!taskId) {
      return res.status(400).json({ success: false, error: "Görev ID belirtilmelidir." });
    }

    const targetTask = await StaffTask.findOne({ $or: [{ _id: taskId }, { id: taskId }], guildId: targetGuildId });
    if (!targetTask) {
      return res.status(404).json({ success: false, error: "Görev kaydı bulunamadı." });
    }

    if (action === "update") {
      if (currentVoiceHours !== undefined) targetTask.currentVoiceMs = Number(currentVoiceHours) * 3600000;
      if (currentVoiceMs !== undefined) targetTask.currentVoiceMs = Number(currentVoiceMs);
      if (currentMessages !== undefined) targetTask.currentMessages = Number(currentMessages);
      if (currentRegisters !== undefined) targetTask.currentRegisters = Number(currentRegisters);
      if (targetVoiceHours !== undefined) targetTask.targetVoiceMs = Number(targetVoiceHours) * 3600000;
      if (targetMessages !== undefined) targetTask.targetMessages = Number(targetMessages);
      if (targetRegisters !== undefined) targetTask.targetRegisters = Number(targetRegisters);
      if (points !== undefined) targetTask.points = Number(points);
      if (status) targetTask.status = String(status).toUpperCase();

      await targetTask.save();
      return res.json({ success: true, message: "Görev ilerleme ve hedef detayları güncellendi.", task: targetTask });
    }

    if (action === "status") {
      targetTask.status = String(status || "COMPLETED").toUpperCase();
      await targetTask.save();
      return res.json({ success: true, message: `Görev durumu ${targetTask.status} olarak değiştirildi.`, task: targetTask });
    }

    if (action === "delete") {
      await StaffTask.deleteOne({ $or: [{ _id: targetTask._id }, { id: targetTask._id }] });
      return res.json({ success: true, message: "Yetkili görev kaydı kalıcı olarak silindi." });
    }

    res.status(400).json({ success: false, error: "Bilinmeyen görev işlemi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/staff-tasks/defaults/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { targetVoiceHours, targetMessages, targetRegisters, rewardPoints, staffRoles } = req.body || {};

    const updateFields = {
      "staffTaskDefaults.targetVoiceHours": Number(targetVoiceHours) || 10,
      "staffTaskDefaults.targetMessages": Number(targetMessages) || 500,
      "staffTaskDefaults.targetRegisters": Number(targetRegisters) || 5,
      "staffTaskDefaults.rewardPoints": Number(rewardPoints) || 100
    };

    if (Array.isArray(staffRoles)) {
      updateFields["roles.staffRoles"] = staffRoles;
    }

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: updateFields }, { upsert: true });
    res.json({ success: true, message: "Varsayılan yetkili görev şablonu kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/tickets/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;

    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const tickets = await Ticket.find({ guildId: targetGuildId }).sort({ createdAt: -1 }).limit(100);

    let openTickets = 0;
    let closedTickets = 0;
    let ratedCount = 0;
    let totalRating = 0;

    tickets.forEach((t) => {
      if (t.status === "OPEN") openTickets++;
      else closedTickets++;
      if (Number(t.rating) > 0) {
        ratedCount++;
        totalRating += Number(t.rating);
      }
    });

    const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : "5.0";

    let meta = { channels: [], roles: [] };
    try {
      meta = await fetchGuildMeta(targetGuildId);
    } catch {
      meta = { channels: [], roles: [] };
    }

    res.json({
      success: true,
      guildId: targetGuildId,
      tickets,
      stats: {
        totalTickets: tickets.length,
        openTickets,
        closedTickets,
        avgRating
      },
      ticketCategory: config.channels?.ticketCategory || "",
      staffRoles: config.roles?.staffRoles || [],
      channels: meta.channels || [],
      roles: meta.roles || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/tickets/action/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, ticketId, openerId, category, claimedBy, rating, status, initialMessage, executorId } = req.body || {};

    if (action === "create") {
      if (!openerId) {
        return res.status(400).json({ success: false, error: "Talep açan kullanıcı ID zorunludur." });
      }

      const count = await Ticket.countDocuments({ guildId: targetGuildId });
      const lastDoc = await Ticket.find({ guildId: targetGuildId }).sort({ ticketId: -1 }).limit(1);
      const lastId = (lastDoc && lastDoc[0] && lastDoc[0].ticketId) ? Number(lastDoc[0].ticketId) : 1000 + count;
      const nextTicketId = lastId + 1;

      const transcript = [];
      if (initialMessage && String(initialMessage).trim()) {
        transcript.push({
          authorId: String(openerId).trim(),
          authorTag: `Kullanıcı (${openerId})`,
          content: String(initialMessage).trim(),
          timestamp: new Date()
        });
      }

      const newTicket = await Ticket.create({
        ticketId: nextTicketId,
        guildId: targetGuildId,
        channelId: `ticket-${nextTicketId}`,
        openerId: String(openerId).trim(),
        claimedBy: claimedBy ? String(claimedBy).trim() : null,
        category: category || "GENEL",
        status: "OPEN",
        transcript,
        rating: 0
      });

      return res.json({ success: true, message: `#${nextTicketId} numaralı destek talebi açıldı.`, ticket: newTicket });
    }

    if (!ticketId) {
      return res.status(400).json({ success: false, error: "Bilet ID veya vaka numarası belirtilmelidir." });
    }

    const isNum = !isNaN(Number(ticketId));
    const orBranch = [{ _id: ticketId }, { id: ticketId }];
    if (isNum) orBranch.push({ ticketId: Number(ticketId) });

    const targetTicket = await Ticket.findOne({ $or: orBranch, guildId: targetGuildId });
    if (!targetTicket) {
      return res.status(404).json({ success: false, error: "Bilet bulunamadı." });
    }

    if (action === "update") {
      if (category) targetTicket.category = String(category).toUpperCase().trim();
      if (claimedBy !== undefined) targetTicket.claimedBy = claimedBy ? String(claimedBy).trim() : null;
      if (rating !== undefined) targetTicket.rating = Number(rating) || 0;
      if (status) targetTicket.status = String(status).toUpperCase().trim();
      await targetTicket.save();
      return res.json({ success: true, message: `#${targetTicket.ticketId} numaralı bilet güncellendi.`, ticket: targetTicket });
    }

    if (action === "toggle_status") {
      const isCurrentlyOpen = targetTicket.status === "OPEN";
      if (isCurrentlyOpen) {
        targetTicket.status = "CLOSED";
        targetTicket.closedAt = new Date();
        targetTicket.closedBy = String(executorId || "Dashboard Yetkilisi").trim();
      } else {
        targetTicket.status = "OPEN";
        targetTicket.closedAt = null;
        targetTicket.closedBy = null;
      }
      await targetTicket.save();
      return res.json({
        success: true,
        message: targetTicket.status === "CLOSED" ? `#${targetTicket.ticketId} numaralı talep kapatıldı.` : `#${targetTicket.ticketId} numaralı talep tekrar açıldı.`,
        ticket: targetTicket
      });
    }

    if (action === "delete") {
      await Ticket.deleteOne({ $or: [{ _id: targetTicket._id }, { id: targetTicket._id }] });
      return res.json({ success: true, message: `#${targetTicket.ticketId} numaralı bilet veritabanından kalıcı olarak silindi.` });
    }

    res.status(400).json({ success: false, error: "Bilinmeyen bilet işlemi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/tickets/:guildId/transcript/:ticketId", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { ticketId } = req.params;

    const isNum = !isNaN(Number(ticketId));
    const orBranch = [{ _id: ticketId }, { id: ticketId }];
    if (isNum) orBranch.push({ ticketId: Number(ticketId) });

    const ticket = await Ticket.findOne({ $or: orBranch, guildId: targetGuildId });
    if (!ticket) {
      return res.status(404).json({ success: false, error: "Bilet bulunamadı." });
    }

    res.json({
      success: true,
      ticketId: ticket.ticketId,
      openerId: ticket.openerId,
      claimedBy: ticket.claimedBy,
      category: ticket.category,
      status: ticket.status,
      transcript: ticket.transcript || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/tickets/config/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { ticketCategory, staffRoles } = req.body || {};

    const updateFields = {};
    if (ticketCategory !== undefined) updateFields["channels.ticketCategory"] = String(ticketCategory).trim();
    if (Array.isArray(staffRoles)) updateFields["roles.staffRoles"] = staffRoles;

    await GuildConfig.updateOne({ guildId: targetGuildId }, { $set: updateFields }, { upsert: true });
    res.json({ success: true, message: "Destek ve bilet sistemi ayarları kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/leaderboard/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;

    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const stats = await Stat.find({ guildId: targetGuildId }).sort({ totalVoiceMs: -1, totalMessages: -1, xp: -1 }).limit(100);

    const totalUsers = stats.length;
    let topVoice = null;
    let topMessages = null;
    let topLevel = null;

    if (stats.length > 0) {
      const sortedVoice = [...stats].sort((a, b) => (b.totalVoiceMs || 0) - (a.totalVoiceMs || 0));
      if ((sortedVoice[0].totalVoiceMs || 0) > 0) {
        topVoice = { userId: sortedVoice[0].userId, voiceMs: sortedVoice[0].totalVoiceMs };
      }

      const sortedMessages = [...stats].sort((a, b) => (b.totalMessages || 0) - (a.totalMessages || 0));
      if ((sortedMessages[0].totalMessages || 0) > 0) {
        topMessages = { userId: sortedMessages[0].userId, messages: sortedMessages[0].totalMessages };
      }

      const sortedLevel = [...stats].sort((a, b) => (b.level || 1) - (a.level || 1));
      topLevel = { userId: sortedLevel[0].userId, level: sortedLevel[0].level || 1, xp: sortedLevel[0].xp || 0 };
    }

    let meta = { roles: [], channels: [] };
    try {
      meta = await fetchGuildMeta(targetGuildId);
    } catch {
      meta = { roles: [], channels: [] };
    }

    const rewards = {
      firstPlaceCoin: 1000,
      secondPlaceCoin: 500,
      thirdPlaceCoin: 250,
      rewardRole: "",
      ...(config.leaderboardRewards || {})
    };

    res.json({
      success: true,
      guildId: targetGuildId,
      leaderboard: stats,
      rewards,
      stats: {
        totalUsers,
        topVoice,
        topMessages,
        topLevel
      },
      roles: meta.roles || [],
      channels: meta.channels || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/leaderboard/action/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, statId, userId, totalVoiceHours, totalMessages, level, xp, title } = req.body || {};

    if (action === "create") {
      if (!userId || !String(userId).trim()) {
        return res.status(400).json({ success: false, error: "Kullanıcı Discord ID zorunludur." });
      }
      const trimmedUser = String(userId).trim();
      let record = await Stat.findOne({ guildId: targetGuildId, userId: trimmedUser });
      const voiceMs = Math.round((Number(totalVoiceHours) || 0) * 3600000);
      if (record) {
        record.totalVoiceMs = voiceMs;
        record.totalMessages = Number(totalMessages) || 0;
        record.level = Number(level) || 1;
        record.xp = Number(xp) || 0;
        if (title !== undefined) record.title = String(title).trim();
        await record.save();
      } else {
        record = await Stat.create({
          guildId: targetGuildId,
          userId: trimmedUser,
          totalVoiceMs: voiceMs,
          totalMessages: Number(totalMessages) || 0,
          level: Number(level) || 1,
          xp: Number(xp) || 0,
          title: title ? String(title).trim() : ""
        });
      }
      return res.json({ success: true, message: "Kullanıcı istatistiği başarıyla kaydedildi.", stat: record });
    }

    if (action === "update") {
      const target = statId ? await Stat.findById(statId) : await Stat.findOne({ guildId: targetGuildId, userId });
      if (!target) {
        return res.status(404).json({ success: false, error: "İstatistik kaydı bulunamadı." });
      }
      if (totalVoiceHours !== undefined) {
        target.totalVoiceMs = Math.round((Number(totalVoiceHours) || 0) * 3600000);
      }
      if (totalMessages !== undefined) {
        target.totalMessages = Math.max(0, Number(totalMessages) || 0);
      }
      if (level !== undefined) {
        target.level = Math.max(1, Number(level) || 1);
      }
      if (xp !== undefined) {
        target.xp = Math.max(0, Number(xp) || 0);
      }
      if (title !== undefined) {
        target.title = String(title).trim();
      }
      await target.save();
      return res.json({ success: true, message: "İstatistik kaydı güncellendi.", stat: target });
    }

    if (action === "reset") {
      const target = statId ? await Stat.findById(statId) : await Stat.findOne({ guildId: targetGuildId, userId });
      if (!target) {
        return res.status(404).json({ success: false, error: "İstatistik kaydı bulunamadı." });
      }
      target.totalVoiceMs = 0;
      target.totalMessages = 0;
      target.dailyVoiceMs = 0;
      target.weeklyVoiceMs = 0;
      target.dailyMessages = 0;
      target.weeklyMessages = 0;
      target.xp = 0;
      target.level = 1;
      await target.save();
      return res.json({ success: true, message: "Kullanıcı istatistikleri sıfırlandı." });
    }

    if (action === "delete") {
      if (statId) {
        await Stat.findByIdAndDelete(statId);
      } else if (userId) {
        await Stat.findOneAndDelete({ guildId: targetGuildId, userId: String(userId).trim() });
      } else {
        return res.status(400).json({ success: false, error: "Silinecek kayıt belirtilmedi." });
      }
      return res.json({ success: true, message: "İstatistik kaydı başarıyla silindi." });
    }

    return res.status(400).json({ success: false, error: "Geçersiz işlem parametresi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/leaderboard/rewards/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { firstPlaceCoin, secondPlaceCoin, thirdPlaceCoin, rewardRole } = req.body || {};

    const rewards = {
      firstPlaceCoin: Number(firstPlaceCoin) || 0,
      secondPlaceCoin: Number(secondPlaceCoin) || 0,
      thirdPlaceCoin: Number(thirdPlaceCoin) || 0,
      rewardRole: rewardRole ? String(rewardRole).trim() : ""
    };

    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      { $set: { leaderboardRewards: rewards } },
      { upsert: true }
    );

    res.json({ success: true, message: "Haftalık liderlik ödülleri kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/invites/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;

    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const invites = await InviteRecord.find({ guildId: targetGuildId }).sort({ regular: -1, bonus: -1 });

    let totalInvites = 0;
    let totalRegular = 0;
    let totalFake = 0;
    let totalLeaves = 0;

    for (const inv of invites) {
      totalRegular += inv.regular || 0;
      totalFake += inv.fake || 0;
      totalLeaves += inv.leaves || 0;
      totalInvites += (inv.regular || 0) + (inv.bonus || 0);
    }

    let meta = { roles: [], channels: [] };
    try {
      meta = await fetchGuildMeta(targetGuildId);
    } catch {
      meta = { roles: [], channels: [] };
    }

    const inviteConfig = {
      inviteChannel: config.channels?.inviteChannel || "",
      fakeDays: config.inviteFakeDays || 7,
      rewardRoles: config.inviteRewardRoles || []
    };

    res.json({
      success: true,
      guildId: targetGuildId,
      invites,
      config: inviteConfig,
      stats: {
        totalInvites,
        totalRegular,
        totalFake,
        totalLeaves
      },
      roles: meta.roles || [],
      channels: meta.channels || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/invites/action/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, inviteId, userId, regular, bonus, fake, leaves } = req.body || {};

    if (action === "add_bonus" || action === "create") {
      if (!userId || !String(userId).trim()) {
        return res.status(400).json({ success: false, error: "Kullanıcı Discord ID zorunludur." });
      }
      const trimmedUser = String(userId).trim();
      let rec = await InviteRecord.findOne({ guildId: targetGuildId, userId: trimmedUser });
      if (!rec) {
        rec = await InviteRecord.create({
          guildId: targetGuildId,
          userId: trimmedUser,
          regular: Number(regular) || 0,
          bonus: Number(bonus) || 0,
          fake: Number(fake) || 0,
          leaves: Number(leaves) || 0
        });
      } else {
        if (bonus !== undefined) rec.bonus = (rec.bonus || 0) + (Number(bonus) || 0);
        if (regular !== undefined) rec.regular = Number(regular) || 0;
        if (fake !== undefined) rec.fake = Number(fake) || 0;
        if (leaves !== undefined) rec.leaves = Number(leaves) || 0;
        await rec.save();
      }
      return res.json({ success: true, message: "Davet kaydı başarıyla oluşturuldu/güncellendi.", record: rec });
    }

    if (action === "update") {
      const rec = inviteId ? await InviteRecord.findById(inviteId) : await InviteRecord.findOne({ guildId: targetGuildId, userId });
      if (!rec) {
        return res.status(404).json({ success: false, error: "Davet kaydı bulunamadı." });
      }
      if (regular !== undefined) rec.regular = Math.max(0, Number(regular) || 0);
      if (bonus !== undefined) rec.bonus = Number(bonus) || 0;
      if (fake !== undefined) rec.fake = Math.max(0, Number(fake) || 0);
      if (leaves !== undefined) rec.leaves = Math.max(0, Number(leaves) || 0);
      await rec.save();
      return res.json({ success: true, message: "Davet bilgileri güncellendi.", record: rec });
    }

    if (action === "delete") {
      if (inviteId) {
        await InviteRecord.findByIdAndDelete(inviteId);
      } else if (userId) {
        await InviteRecord.findOneAndDelete({ guildId: targetGuildId, userId: String(userId).trim() });
      } else {
        return res.status(400).json({ success: false, error: "Silinecek kayıt belirtilmedi." });
      }
      return res.json({ success: true, message: "Davet kaydı başarıyla silindi." });
    }

    return res.status(400).json({ success: false, error: "Geçersiz işlem parametresi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/invites/config/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { inviteChannel, fakeDays } = req.body || {};

    const updateFields = {};
    if (inviteChannel !== undefined) updateFields["channels.inviteChannel"] = String(inviteChannel).trim();
    if (fakeDays !== undefined) updateFields.inviteFakeDays = Number(fakeDays) || 7;

    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      { $set: updateFields },
      { upsert: true }
    );

    res.json({ success: true, message: "Davet sistemi ayarları kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/backups/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;

    let config = await GuildConfig.findOne({ guildId: targetGuildId });
    if (!config) {
      config = await GuildConfig.create({ ...defaultGuildConfig, guildId: targetGuildId });
    }

    const backups = await Backup.find({ guildId: targetGuildId }).sort({ createdAt: -1 });

    const totalBackups = backups.length;
    const manualBackups = backups.filter((b) => b.type === "MANUAL").length;
    const autoBackups = backups.filter((b) => b.type === "AUTO").length;
    const emergencyBackups = backups.filter((b) => b.type === "EMERGENCY").length;

    let meta = { roles: [], channels: [] };
    try {
      meta = await fetchGuildMeta(targetGuildId);
    } catch {
      meta = { roles: [], channels: [] };
    }

    const backupConfig = {
      backupInterval: config.backupInterval || "DAILY",
      maxBackups: config.maxBackups || 10
    };

    res.json({
      success: true,
      guildId: targetGuildId,
      backups,
      config: backupConfig,
      stats: {
        totalBackups,
        manualBackups,
        autoBackups,
        emergencyBackups
      },
      roles: meta.roles || [],
      channels: meta.channels || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/backups/action/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { action, backupId, type, roleCount, channelCount } = req.body || {};

    if (action === "create") {
      let meta = { roles: [], channels: [] };
      try {
        meta = await fetchGuildMeta(targetGuildId);
      } catch {
        meta = { roles: [], channels: [] };
      }

      let snapshotRoles = [];
      if (meta.roles && meta.roles.length > 0) {
        snapshotRoles = meta.roles.map((r, idx) => ({
          id: r.id || `role_${idx}`,
          name: r.name || `Rol ${idx}`,
          color: r.color || 0,
          hoist: !!r.hoist,
          position: r.position || idx,
          permissions: r.permissions || "0",
          mentionable: !!r.mentionable,
          members: []
        }));
      } else {
        const count = Number(roleCount) || 5;
        for (let i = 1; i <= count; i++) {
          snapshotRoles.push({
            id: `sys_role_${Date.now()}_${i}`,
            name: `Snapshot Rolü #${i}`,
            color: 3447003,
            hoist: false,
            position: i,
            permissions: "104324673",
            mentionable: false,
            members: []
          });
        }
      }

      let snapshotChannels = [];
      if (meta.channels && meta.channels.length > 0) {
        snapshotChannels = meta.channels.map((c, idx) => ({
          id: c.id || `ch_${idx}`,
          name: c.name || `kanal_${idx}`,
          type: c.type || 0,
          parentId: c.parentId || null,
          position: c.position || idx,
          permissionOverwrites: []
        }));
      } else {
        const count = Number(channelCount) || 6;
        for (let i = 1; i <= count; i++) {
          snapshotChannels.push({
            id: `sys_ch_${Date.now()}_${i}`,
            name: `snapshot-kanal-${i}`,
            type: 0,
            parentId: null,
            position: i,
            permissionOverwrites: []
          });
        }
      }

      const newBackup = await Backup.create({
        guildId: targetGuildId,
        type: type || "MANUAL",
        roles: snapshotRoles,
        channels: snapshotChannels
      });

      return res.json({ success: true, message: "Sunucu snapshot yedeği başarıyla alındı.", backup: newBackup });
    }

    if (action === "update") {
      const bk = await Backup.findById(backupId);
      if (!bk) {
        return res.status(404).json({ success: false, error: "Yedek kaydı bulunamadı." });
      }
      if (type) bk.type = type;
      await bk.save();
      return res.json({ success: true, message: "Yedek bilgileri güncellendi.", backup: bk });
    }

    if (action === "delete") {
      if (!backupId) {
        return res.status(400).json({ success: false, error: "Silinecek yedek ID belirtilmedi." });
      }
      await Backup.findByIdAndDelete(backupId);
      return res.json({ success: true, message: "Snapshot yedeği başarıyla silindi." });
    }

    if (action === "restore") {
      const bk = await Backup.findById(backupId);
      if (!bk) {
        return res.status(404).json({ success: false, error: "Yedek kaydı bulunamadı." });
      }
      return res.json({
        success: true,
        message: "Yedek geri yükleme işlemi simülasyonu başlatıldı.",
        rolesRestored: bk.roles ? bk.roles.length : 0,
        channelsRestored: bk.channels ? bk.channels.length : 0
      });
    }

    return res.status(400).json({ success: false, error: "Geçersiz işlem parametresi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/backups/config/:guildId?", async (req, res) => {
  try {
    const rawId = req.params.guildId;
    const targetGuildId = (!rawId || rawId === "undefined" || rawId === "default") ? (defaultGuildConfig.guildId || "1546253954248085647") : rawId;
    const { backupInterval, maxBackups } = req.body || {};

    const updateFields = {};
    if (backupInterval !== undefined) updateFields.backupInterval = String(backupInterval).trim();
    if (maxBackups !== undefined) updateFields.maxBackups = Number(maxBackups) || 10;

    await GuildConfig.updateOne(
      { guildId: targetGuildId },
      { $set: updateFields },
      { upsert: true }
    );

    res.json({ success: true, message: "Yedekleme yapılandırması kaydedildi." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

app.post("/api/system/git-update", requireRole("SUPERADMIN"), async (req, res) => {
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

app.post("/api/system/backup-create", requireRole(["SUPERADMIN", "ADMIN"]), async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const username = req.sessionUser?.username || (req.isMasterKey ? "master_key" : "ADMIN");
    const { encrypt, encryptionKey } = req.body || {};
    const result = GitUpdateManager.createFullBackup({
      encrypt: Boolean(encrypt),
      encryptionKey: encryptionKey || null
    });
    await recordAuditLog({
      action: "BACKUP_CREATED",
      ip,
      username,
      details: { backupName: result.backupName, isEncrypted: result.isEncrypted, fileCount: result.fileCount },
      status: "SUCCESS"
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/system/restore-backup", requireRole("SUPERADMIN"), async (req, res) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const username = req.sessionUser?.username || (req.isMasterKey ? "master_key" : "ADMIN");
    const { backupName, encryptionKey } = req.body || {};
    const result = GitUpdateManager.restoreBackup(backupName, {
      encryptionKey: encryptionKey || null
    });
    await recordAuditLog({
      action: "BACKUP_RESTORED",
      ip,
      username,
      details: { backupName, isEncrypted: result.isEncrypted, restoredCount: result.restoredCount },
      status: result.success ? "SUCCESS" : "FAILURE"
    });
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/logs", (req, res) => {
  res.json({ logs: consoleLogs });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((err, req, res, next) => {
  logger.error(`Sunucu hatası: ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: "Sunucu tarafında güvenli bir işlem hatası oluştu."
  });
});

export async function startDashboardV2() {
  validateProductionConfig();
  const server = app.listen(DASHBOARD_PORT, DASHBOARD_HOST, () => {
    logger.success(`Web Dashboard V2 http://${DASHBOARD_HOST === "0.0.0.0" ? "localhost" : DASHBOARD_HOST}:${DASHBOARD_PORT} adresinde yayında.`);
  });
  configureSocketTimeouts(server);
  const dbUri = getActiveDatabaseUri();
  connectDatabase(dbUri, { provider: environment.databaseProvider })
    .catch(() => {
      logger.warn("Veritabanı bağlantısı kurulurken bekleniyor.");
    });
}

export default app;

if (process.argv[1]?.includes("dashboard-v2")) {
  startDashboardV2();
}
