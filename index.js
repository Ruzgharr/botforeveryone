import { environment } from "@bot/config";
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
import { startDashboard } from "./apps/dashboard/src/index.js";

const masterLogger = new Logger("MASTER");

async function main() {
  masterLogger.info("Public Bot Ekosistemi başlatılıyor...");

  try {
    await connectDatabase(environment.mongoUri);
    masterLogger.success("Veritabanı bağlantısı başarıyla kuruldu.");
  } catch (err) {
    masterLogger.error("Veritabanı bağlantı hatası:", err);
  }

  await startDashboard().catch((e) => masterLogger.error("Dashboard başlatılamadı:", e));

  await moderationClient.start().catch((err) => masterLogger.error("Moderasyon botu başlatılamadı:", err));
  await registerClient.start().catch((err) => masterLogger.error("Kayıt botu başlatılamadı:", err));
  await statsClient.start().catch((err) => masterLogger.error("İstatistik botu başlatılamadı:", err));
  await guardClient.start().catch((err) => masterLogger.error("Guard-Main botu başlatılamadı:", err));
  await distributorPool.start().catch((err) => masterLogger.error("Dağıtıcı bot havuzu başlatılamadı:", err));
  await welcomeManager.start(environment.tokens.voiceWelcome).catch((err) => masterLogger.error("Ses karşılama botları başlatılamadı:", err));
  await economyClient.start().catch((err) => masterLogger.error("Ekonomi botu başlatılamadı:", err));
  await utilityClient.start().catch((err) => masterLogger.error("Utility botu başlatılamadı:", err));

  masterLogger.success("Tüm servisler orkestre edildi ve dinlemede.");

  const botsToSupervise = [
    { name: "Moderasyon", client: moderationClient },
    { name: "Kayıt", client: registerClient },
    { name: "İstatistik", client: statsClient },
    { name: "Guard-Main", client: guardClient },
    { name: "Ekonomi", client: economyClient },
    { name: "Utility", client: utilityClient }
  ];

  setInterval(async () => {
    for (const b of botsToSupervise) {
      if (!b.client.isReady() && b.client.token) {
        masterLogger.warn(`[WATCHDOG] ${b.name} botunun bağlantısı kesilmiş görünüyor. Yeniden bağlanılıyor...`);
        await b.client.start().catch((err) => {
          masterLogger.error(`[WATCHDOG] ${b.name} yeniden başlatılamadı:`, err.message || err);
        });
      }
    }
  }, 30000);
}

process.on("SIGINT", () => {
  masterLogger.info("Sistem kapatılıyor...");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  masterLogger.error("Yakalanamayan Hata (Unhandled Rejection):", reason);
});

main();
