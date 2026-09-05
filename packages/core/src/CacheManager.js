export class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.redisClient = null;
    this.initRedis();
  }

  async initRedis() {
    const redisUri = process.env.REDIS_URI;
    if (!redisUri) return;

    try {
      const redisModule = await import("redis").catch(() => null);
      if (redisModule && redisModule.createClient) {
        this.redisClient = redisModule.createClient({ url: redisUri });
        this.redisClient.on("error", () => {});
        await this.redisClient.connect().catch(() => {
          this.redisClient = null;
        });
      }
    } catch {
      this.redisClient = null;
    }
  }

  async get(key) {
    const mem = this.memoryCache.get(key);
    if (mem) {
      if (mem.expiresAt > Date.now()) {
        return mem.value;
      }
      this.memoryCache.delete(key);
    }

    if (this.redisClient && this.redisClient.isReady) {
      try {
        const data = await this.redisClient.get(key);
        if (data) {
          const parsed = JSON.parse(data);
          this.memoryCache.set(key, { value: parsed, expiresAt: Date.now() + 15000 });
          return parsed;
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  async set(key, value, ttlSeconds = 60) {
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000
    });

    if (this.redisClient && this.redisClient.isReady) {
      try {
        await this.redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
      } catch {}
    }
  }

  async del(key) {
    this.memoryCache.delete(key);
    if (this.redisClient && this.redisClient.isReady) {
      try {
        await this.redisClient.del(key);
      } catch {}
    }
  }

  clear() {
    this.memoryCache.clear();
  }
}

export const globalCache = new CacheManager();
