import "dotenv/config";
import http from "node:http";
import { once } from "node:events";
import { environment, getActiveDatabaseUri } from "@bot/config";
import { connectDatabase, disconnectDatabase } from "@bot/database";

const dbUri = getActiveDatabaseUri();
await connectDatabase(dbUri, { provider: environment.databaseProvider });

const clients = [];
let pool = null;
let manager = null;

const clusterLogs = [];
const origLog = console.log;
const origWarn = console.warn;
const origErr = console.error;

function recordClusterLog(level, args) {
  const rawMsg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
  const time = new Date().toISOString();
  let service = "CLUSTER";
  const match = rawMsg.match(/\[([A-Za-z0-9_\-]+)\]/);
  if (match && match[1]) {
    service = match[1].toUpperCase();
  }
  clusterLogs.push({ time, service, level, message: rawMsg });
  if (clusterLogs.length > 500) clusterLogs.shift();
}

console.log = function(...args) {
  recordClusterLog("INFO", args);
  origLog.apply(console, args);
};
console.warn = function(...args) {
  recordClusterLog("WARN", args);
  origWarn.apply(console, args);
};
console.error = function(...args) {
  recordClusterLog("ERROR", args);
  origErr.apply(console, args);
};

process.on("unhandledRejection", (error) => {
  console.error("Background error:", error?.message || "unknown");
});

for (const name of ["moderation", "register", "stats", "guard-main", "economy", "utility"]) {
  try {
    const { default: client } = await import(`../apps/${name}/src/index.js`);
    clients.push(client);
    const readyPromise = new Promise((resolve) => {
      const done = () => resolve(true);
      client.once("clientReady", done);
      client.once("ready", done);
      setTimeout(() => {
        client.removeListener("clientReady", done);
        client.removeListener("ready", done);
        resolve(false);
      }, 10000);
    });
    client.start().catch((err) => {
      console.warn(`[${name.toUpperCase()}] Başlatma uyarısı:`, err?.message || err);
    });
    await readyPromise;
  } catch (err) {
    console.error(`[${name.toUpperCase()}] Modül yüklenemedi:`, err?.message || err);
  }
}

try {
  const { default: distributorPool } = await import("../apps/guard-distributor/src/index.js");
  pool = distributorPool;
  await pool.start().catch(() => null);
} catch (err) {
  console.error("[GUARD-DISTRIBUTOR] Modül yüklenemedi:", err?.message || err);
}

try {
  const { default: voiceManager } = await import("../apps/voice-welcome/src/index.js");
  manager = voiceManager;
  await manager.start(environment.tokens.voiceWelcome).catch(() => null);
} catch (err) {
  console.error("[VOICE-WELCOME] Modül yüklenemedi:", err?.message || err);
}

console.log("BOTS_RUNNING", JSON.stringify({
  bots: clients.filter((c) => c.isReady?.()).map((c) => c.user?.username || c.serviceName),
  distributors: (pool?.clients || []).map((c) => c.user?.username),
  voice: [...(manager?.clients?.values() || [])].map((c) => c.user?.username)
}));

const stoppedServices = new Set();

function getServicePayload(key, name, client) {
  if (stoppedServices.has(key)) {
    return {
      serviceKey: key,
      name: client?.user?.username || name,
      tag: client?.user?.tag || "",
      id: client?.user?.id || "",
      avatar: typeof client?.user?.displayAvatarURL === "function" ? client.user.displayAvatarURL() : "",
      status: "OFFLINE",
      ping: 0,
      uptime: 0,
      guildCount: 0,
      ready: false
    };
  }

  const isOnline = Boolean(
    client && (
      (typeof client.isReady === "function" && client.isReady()) ||
      client.ready === true ||
      (client.user && client.ws?.status === 0)
    )
  );
  const ping = client?.ws?.ping >= 0 ? client.ws.ping : 0;
  const uptime = client?.uptime ? Math.floor(client.uptime / 1000) : 0;
  const user = client?.user;
  return {
    serviceKey: key,
    name: user?.username || name,
    tag: user?.tag || "",
    id: user?.id || "",
    avatar: typeof user?.displayAvatarURL === "function" ? user.displayAvatarURL() : "",
    status: isOnline ? "ONLINE" : "OFFLINE",
    ping,
    uptime,
    guildCount: client?.guilds?.cache?.size || (isOnline ? 1 : 0),
    ready: isOnline
  };
}

function getClusterState() {
  const services = {
    MODERATION: getServicePayload("MODERATION", "BFE Moderasyon", clients.find((c) => c.serviceName === "MODERATION")),
    REGISTER: getServicePayload("REGISTER", "BFE2 Kayıt", clients.find((c) => c.serviceName === "REGISTER")),
    STATS: getServicePayload("STATS", "BFE3 İstatistik", clients.find((c) => c.serviceName === "STATS")),
    GUARD_MAIN: getServicePayload("GUARD_MAIN", "BFE4 Koruma", clients.find((c) => c.serviceName === "GUARD_MAIN" || c.serviceName === "GUARD-MAIN")),
    GUARD_DISTRIBUTOR: getServicePayload("GUARD_DISTRIBUTOR", "BFE5 Dağıtıcı", pool?.clients?.[0]),
    VOICE_WELCOME: getServicePayload("VOICE_WELCOME", "BFE6 Ses Karşılama", [...manager?.clients?.values() || []][0]),
    ECONOMY: getServicePayload("ECONOMY", "BFE7 Ekonomi", clients.find((c) => c.serviceName === "ECONOMY")),
    UTILITY: getServicePayload("UTILITY", "BFE8 Yardımcı", clients.find((c) => c.serviceName === "UTILITY"))
  };

  return {
    running: true,
    pid: process.pid,
    uptime: Math.floor(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
    services
  };
}

const CONTROL_PORT = Number(process.env.CLUSTER_CONTROL_PORT) || 3099;

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    const data = getClusterState();
    res.writeHead(200);
    res.end(JSON.stringify(data));
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/logs")) {
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const limit = Math.min(500, Number(urlObj.searchParams.get("limit")) || 200);
    const slice = clusterLogs.slice(-limit);
    res.writeHead(200);
    res.end(JSON.stringify({ logs: slice, count: slice.length }));
    return;
  }

  if (req.method === "GET" && req.url.startsWith("/guild-meta")) {
    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const requestedGuildId = urlObj.searchParams.get("guildId");
    let targetGuild = null;
    for (const c of clients) {
      if (c && c.guilds?.cache) {
        if (requestedGuildId && c.guilds.cache.has(requestedGuildId)) {
          targetGuild = c.guilds.cache.get(requestedGuildId);
          break;
        }
        if (!targetGuild && c.guilds.cache.size > 0) {
          targetGuild = c.guilds.cache.first();
        }
      }
    }

    if (!targetGuild) {
      res.writeHead(200);
      res.end(JSON.stringify({ found: false, roles: [], channels: [] }));
      return;
    }

    const roles = [...targetGuild.roles.cache.values()]
      .filter((r) => r.id !== targetGuild.id)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor !== "#000000" ? r.hexColor : "#94a3b8",
        position: r.rawPosition
      }))
      .sort((a, b) => b.position - a.position);

    const channels = [...targetGuild.channels.cache.values()]
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parentId: c.parentId || ""
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));

    res.writeHead(200);
    res.end(JSON.stringify({
      found: true,
      id: targetGuild.id,
      name: targetGuild.name,
      icon: typeof targetGuild.iconURL === "function" ? targetGuild.iconURL({ extension: "png" }) : null,
      memberCount: targetGuild.memberCount,
      roles,
      channels
    }));
    return;
  }

  if (req.method === "POST" && req.url === "/voice-sync") {
    try {
      if (manager) {
        await manager.syncVoiceBots();
        const activeClients = [...(manager.clients?.values() || [])];
        res.writeHead(200);
        res.end(JSON.stringify({
          success: true,
          count: activeClients.length,
          bots: activeClients.map((c) => ({
            id: c.user?.id,
            tag: c.user?.tag,
            username: c.user?.username
          }))
        }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify({ success: false, message: "Ses yöneticisi henüz aktif değil." }));
      return;
    } catch (err) {
      res.writeHead(500);
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  if (req.method === "POST" && (req.url === "/restart" || req.url === "/start" || req.url === "/stop")) {
    const action = req.url.slice(1);
    let bodyStr = "";
    req.on("data", (chunk) => { bodyStr += chunk; });
    req.on("end", async () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const key = body.serviceKey || "ALL";

        if (key === "ALL") {
          console.log(`[CLUSTER] Tüm bot kümesi için işlem: ${action}`);
          const allKeys = ["MODERATION", "REGISTER", "STATS", "GUARD_MAIN", "GUARD_DISTRIBUTOR", "VOICE_WELCOME", "ECONOMY", "UTILITY"];
          if (action === "stop") {
            allKeys.forEach((k) => stoppedServices.add(k));
          } else {
            stoppedServices.clear();
          }

          for (const c of clients) {
            try {
              if (action === "stop" || action === "restart") {
                await c.destroy();
              }
              if (action === "restart") {
                await new Promise((r) => setTimeout(r, 600));
              }
              if (action === "start" || action === "restart") {
                await c.start();
              }
            } catch (err) {
              console.error(`[CLUSTER] ${c.serviceName} hata:`, err.message);
            }
          }

          if (pool) {
            try {
              if (action === "stop" || action === "restart") await pool.stop();
              if (action === "start" || action === "restart") await pool.start();
            } catch (err) {
              console.error("[CLUSTER] GUARD_DISTRIBUTOR hata:", err.message);
            }
          }

          if (manager) {
            try {
              if (action === "stop" || action === "restart") await manager.stop();
              if (action === "start" || action === "restart") await manager.start(environment.tokens.voiceWelcome);
            } catch (err) {
              console.error("[CLUSTER] VOICE_WELCOME hata:", err.message);
            }
          }

          res.writeHead(200);
          res.end(JSON.stringify({ success: true, message: `Tüm bot kümesi işlemi (${action}) tamamlandı.` }));
          return;
        }

        if (action === "stop") {
          stoppedServices.add(key);
        } else {
          stoppedServices.delete(key);
        }

        const client = clients.find((c) => c.serviceName === key || c.serviceName === key.replace(/_/g, "-"));
        if (client) {
          console.log(`[CLUSTER] ${key} işlemi: ${action}`);
          if (action === "stop" || action === "restart") {
            await client.destroy();
          }
          if (action === "restart") {
            await new Promise((r) => setTimeout(r, 800));
          }
          if (action === "start" || action === "restart") {
            const readyPromise = new Promise((resolve) => {
              const done = () => resolve(true);
              client.once("clientReady", done);
              client.once("ready", done);
              setTimeout(() => {
                client.removeListener("clientReady", done);
                client.removeListener("ready", done);
                resolve(false);
              }, 12000);
            });
            await client.start();
            await readyPromise;
            await new Promise((r) => setTimeout(r, 500));
          }
          const payload = getServicePayload(key, key, client);
          res.writeHead(200);
          res.end(JSON.stringify({
            success: true,
            serviceKey: key,
            ping: payload.ping,
            status: payload.status
          }));
          return;
        }

        if (key === "GUARD_DISTRIBUTOR" && pool) {
          if (action === "stop" || action === "restart") await pool.stop();
          if (action === "start" || action === "restart") await pool.start();
          const p = getServicePayload("GUARD_DISTRIBUTOR", "BFE5 Dağıtıcı", pool?.clients?.[0]);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, serviceKey: key, status: p.status, ping: p.ping }));
          return;
        }

        if (key === "VOICE_WELCOME" && manager) {
          if (action === "stop" || action === "restart") await manager.stop();
          if (action === "start" || action === "restart") await manager.start(environment.tokens.voiceWelcome);
          const p = getServicePayload("VOICE_WELCOME", "BFE6 Ses Karşılama", [...manager?.clients?.values() || []][0]);
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, serviceKey: key, status: p.status, ping: p.ping }));
          return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: `Servis bulunamadı: ${key}` }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }



  if (req.method === "POST" && req.url === "/presence") {
    let bodyStr = "";
    req.on("data", (chunk) => { bodyStr += chunk; });
    req.on("end", async () => {
      try {
        const body = bodyStr ? JSON.parse(bodyStr) : {};
        const { serviceKey, status, activityType, activityText } = body;
        const client = clients.find((c) => c.serviceName === serviceKey || c.serviceName === serviceKey.replace(/_/g, "-"));
        if (client && client.user) {
          const typeMap = { PLAYING: 0, STREAMING: 1, LISTENING: 2, WATCHING: 3, CUSTOM: 4, COMPETING: 5 };
          client.user.setPresence({
            activities: [{ name: activityText, type: typeMap[activityType] ?? 0 }],
            status: (status || "online").toLowerCase()
          });
          res.writeHead(200);
          res.end(JSON.stringify({ success: true }));
          return;
        }
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Servis bulunamadı veya çevrim dışı." }));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Endpoint bulunamadı" }));
});

server.listen(CONTROL_PORT, "127.0.0.1", () => {
  console.log(`[CLUSTER] Kontrol ve yönetim sunucusu 127.0.0.1:${CONTROL_PORT} portunda dinlemede.`);
});

async function stop() {
  server.close();
  if (manager) await manager.stop().catch(() => null);
  if (pool) await pool.stop().catch(() => null);
  for (const c of clients) {
    try {
      await c.destroy();
    } catch {}
  }
  await disconnectDatabase().catch(() => null);
  process.exit(0);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
