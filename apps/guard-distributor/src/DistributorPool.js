import { Client, GatewayIntentBits } from "discord.js";
import { Logger } from "@bot/core";
import { Backup, BotCredential } from "@bot/database";

export class DistributorPool {
  constructor(tokens = []) {
    this.tokens = tokens;
    this.clients = [];
    this.logger = new Logger("DISTRIBUTOR-POOL");
    this.currentIndex = 0;
    this.taskQueue = [];
    this.isProcessingQueue = false;
  }

  queueTask(taskFn) {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ taskFn, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.taskQueue.length > 0) {
      const item = this.taskQueue.shift();
      try {
        const result = await item.taskFn();
        item.resolve(result);
      } catch (err) {
        if (err?.status === 429 || err?.code === 429) {
          const waitMs = (err?.retry_after || 1.5) * 1000;
          await new Promise((r) => setTimeout(r, waitMs));
          try {
            const retryResult = await item.taskFn();
            item.resolve(retryResult);
          } catch (retryErr) {
            item.reject(retryErr);
          }
        } else {
          item.reject(err);
        }
      }
      await new Promise((r) => setTimeout(r, 350));
    }

    this.isProcessingQueue = false;
  }

  getNextClient() {
    if (this.clients.length === 0) return null;
    const client = this.clients[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.clients.length;
    return client;
  }

  async start(customTokens = null) {
    let tokensToUse = (customTokens && customTokens.length > 0) ? customTokens : this.tokens;
    if (!tokensToUse || tokensToUse.length === 0) {
      const cred = await BotCredential.findOne({ serviceKey: "GUARD_DISTRIBUTOR" });
      if (cred && cred.token) {
        tokensToUse = cred.token.split(",").map((t) => t.trim()).filter(Boolean);
      }
    }

    if (!tokensToUse || tokensToUse.length === 0) {
      this.logger.warn("Dağıtıcı bot tokenları tanımlanmadığı için havuz beklemeye alındı.");
      return;
    }

    for (let i = 0; i < tokensToUse.length; i++) {
      const token = tokensToUse[i];
      try {
        const client = new Client({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers
          ]
        });

        await client.login(token);
        this.clients.push(client);
        this.logger.success(`Dağıtıcı Bot #${i + 1} (${client.user.tag}) aktif edildi.`);
      } catch (error) {
        this.logger.error(`Dağıtıcı Bot #${i + 1} giriş yapamadı:`, error);
      }
    }
  }

  async restoreLatestBackup(guildId) {
    const backup = await Backup.findOne({ guildId }).sort({ createdAt: -1 });
    if (!backup) {
      this.logger.warn(`Geri yüklenecek yedek bulunamadı: ${guildId}`);
      return false;
    }

    const mainClient = this.getNextClient();
    if (!mainClient) {
      this.logger.error("Aktif dağıtıcı bot bulunamadığı için kurtarma yapılamadı.");
      return false;
    }

    const guild = await mainClient.guilds.fetch(guildId).catch(() => null);
    if (!guild) return false;

    for (const roleData of backup.roles) {
      await this.queueTask(async () => {
        const workerClient = this.getNextClient() || mainClient;
        const workerGuild = await workerClient.guilds.fetch(guildId).catch(() => null);
        if (!workerGuild) return;

        const existingRole = workerGuild.roles.cache.find((r) => r.name === roleData.name);
        if (!existingRole) {
          try {
            await workerGuild.roles.create({
              name: roleData.name,
              color: roleData.color,
              hoist: roleData.hoist,
              permissions: BigInt(roleData.permissions),
              mentionable: roleData.mentionable
            });
          } catch (error) {
            this.logger.error(`Rol geri yükleme başarısız: ${roleData.name}`, error);
          }
        }
      });
    }

    this.logger.success(`Yedek geri yükleme işlemi tamamlandı: ${guild.name}`);
    return true;
  }
}
