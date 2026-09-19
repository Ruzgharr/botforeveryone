import { environment, getActiveDatabaseUri, validateProductionConfig } from "@bot/config";
import { connectDatabase } from "@bot/database";
import { Logger } from "@bot/core";

import moderationClient from "./apps/moderation/src/index.js";
import registerClient from "./apps/register/src/index.js";
import statsClient from "./apps/stats/src/index.js";
import guardClient from "./apps/guard-main/src/index.js";
import distributorPool from "./apps/guard-distributor/src/index.js";
import welcomeManager from "./apps/voice-welcome/src/index.js";
import economyClient from "./apps/economy/src/index.js";
import utilityClient from "./apps/utility/src/index.js";
import { startDashboardV2 } from "./apps/dashboard-v2/src/index.js";

const masterLogger = new Logger("MASTER");

export const HealthState = Object.freeze({
  STARTING: "STARTING",
  READY: "READY",
  DEGRADED: "DEGRADED",
  FAILED: "FAILED",
  STOPPED: "STOPPED"
});

async function main() {
  masterLogger.info("Public Bot Ekosistemi başlatılıyor...");

  try {
    validateProductionConfig();
    const dbUri = getActiveDatabaseUri();
    await connectDatabase(dbUri, { provider: environment.databaseProvider });
    masterLogger.success("Veritabanı bağlantısı başarıyla kuruldu.");
  } catch (err) {
    masterLogger.error("Veritabanı bağlantı veya doğrulama hatası:", err.message || err);
  }

  await startDashboardV2().catch((e) => masterLogger.error("Dashboard V2 başlatılamadı:", e.message || e));

  const supervisedServices = [
    { name: "Moderasyon", client: moderationClient, state: HealthState.STARTING, failureCount: 0, nextRetryTime: 0 },
    { name: "Kayıt", client: registerClient, state: HealthState.STARTING, failureCount: 0, nextRetryTime: 0 },
    { name: "İstatistik", client: statsClient, state: HealthState.STARTING, failureCount: 0, nextRetryTime: 0 },
    { name: "Guard-Main", client: guardClient, state: HealthState.STARTING, failureCount: 0, nextRetryTime: 0 },
    { name: "Ekonomi", client: economyClient, state: HealthState.STARTING, failureCount: 0, nextRetryTime: 0 },
    { name: "Utility", client: utilityClient, state: HealthState.STARTING, failureCount: 0, nextRetryTime: 0 }
  ];

  for (const item of supervisedServices) {
    try {
      const started = await item.client.start();
      if (started !== false) {
        item.state = HealthState.READY;
      } else {
        item.state = HealthState.DEGRADED;
      }
    } catch (err) {
      item.state = HealthState.DEGRADED;
      masterLogger.error(`${item.name} botu başlatılamadı:`, err.message || err);
    }
  }

  await distributorPool.start().catch((err) => masterLogger.error("Dağıtıcı bot havuzu başlatılamadı:", err.message || err));
  await welcomeManager.start(environment.tokens.voiceWelcome).catch((err) => masterLogger.error("Ses karşılama botları başlatılamadı:", err.message || err));

  masterLogger.success("Tüm servisler orkestre edildi ve denetim döngüsü başlatıldı.");

  setInterval(async () => {
    const now = Date.now();
    for (const b of supervisedServices) {
      const isReady = typeof b.client.isReady === "function" ? b.client.isReady() : Boolean(b.client.ready);
      if (isReady) {
        if (b.state !== HealthState.READY) {
          b.state = HealthState.READY;
          b.failureCount = 0;
          masterLogger.success(`[WATCHDOG] ${b.name} botu tekrar READY durumuna geçti.`);
        }
        continue;
      }

      if (b.state === HealthState.FAILED) {
        continue;
      }

      if (now < b.nextRetryTime) {
        continue;
      }

      b.state = HealthState.DEGRADED;
      masterLogger.warn(`[WATCHDOG] ${b.name} botu yanıt vermiyor (Yeniden deneme: ${b.failureCount + 1}). Başlatılıyor...`);

      try {
        const result = await b.client.start();
        if (result !== false) {
          b.state = HealthState.READY;
          b.failureCount = 0;
          b.nextRetryTime = 0;
          masterLogger.success(`[WATCHDOG] ${b.name} botu başarıyla kurtarıldı.`);
        } else {
          throw new Error("Bot tokenı tanımlı değil veya oturum açılamadı.");
        }
      } catch (err) {
        b.failureCount++;
        if (b.failureCount >= 5) {
          b.state = HealthState.FAILED;
          masterLogger.error(`[WATCHDOG CRASH-LOOP] ${b.name} botu 5 ardışık deneme sonrası FAILED durumuna alındı: ${err.message || err}`);
        } else {
          const backoffMs = Math.min(120000, 5000 * Math.pow(2, b.failureCount - 1));
          b.nextRetryTime = Date.now() + backoffMs;
          masterLogger.warn(`[WATCHDOG] ${b.name} için bir sonraki deneme ${Math.round(backoffMs / 1000)} saniye ertelendi.`);
        }
      }
    }
  }, 15000);
}

process.on("SIGINT", () => {
  masterLogger.info("Sistem kapatılıyor...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  masterLogger.error("Yakalanamayan Hata (Unhandled Rejection):", reason);
});

main();
