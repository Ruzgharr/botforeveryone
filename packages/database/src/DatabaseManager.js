import mongoose from "mongoose";
import pg from "pg";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { PostgresDriver } from "./PostgresDriver.js";
import { SqliteDriver } from "./SqliteDriver.js";
import { DatabaseMigrator } from "./DatabaseMigrator.js";

class DatabaseManagerImpl {
  constructor() {
    this.activeProvider = (process.env.DATABASE_PROVIDER || "POSTGRESQL").toUpperCase();
    this.postgresDriver = new PostgresDriver();
    this.sqliteDriver = new SqliteDriver();
    this.activeUri = "";
    this.overrides = new Map();
    this.proxies = new Map();
  }

  getProvider() {
    return this.activeProvider;
  }

  async connect(uri, options = {}) {
    let targetProvider = options.provider;
    if (!targetProvider && uri) {
      if (uri.startsWith("postgres://") || uri.startsWith("postgresql://")) {
        targetProvider = "POSTGRESQL";
      } else if (uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://")) {
        targetProvider = "MONGODB";
      } else if (uri.startsWith("sqlite://") || uri.endsWith(".sqlite") || uri.endsWith(".db") || uri === ":memory:") {
        targetProvider = "SQLITE";
      }
    }
    if (!targetProvider) {
      targetProvider = process.env.DATABASE_PROVIDER || this.activeProvider || "POSTGRESQL";
    }
    if (targetProvider.toUpperCase() === "BETTER-SQLITE3") {
      targetProvider = "SQLITE";
    }
    this.activeProvider = targetProvider.toUpperCase();

    if (this.activeProvider === "POSTGRESQL") {
      this.activeUri = (uri && (uri.startsWith("postgres://") || uri.startsWith("postgresql://")))
        ? uri
        : (process.env.POSTGRES_URI || process.env.DATABASE_URL || "postgresql://postgres:postgres@127.0.0.1:5432/public_bot_ecosystem");
      await this.postgresDriver.connect(this.activeUri);
      return this.postgresDriver.pool;
    }

    if (this.activeProvider === "SQLITE") {
      this.activeUri = (uri && !uri.startsWith("mongodb") && !uri.startsWith("postgres"))
        ? uri
        : (process.env.SQLITE_PATH || "./data/bot_ecosystem.sqlite");
      await this.sqliteDriver.connect(this.activeUri);
      return this.sqliteDriver.db;
    }

    this.activeUri = (uri && (uri.startsWith("mongodb://") || uri.startsWith("mongodb+srv://")))
      ? uri
      : (process.env.MONGO_URI || "mongodb://127.0.0.1:27017/public-bot-ecosystem");
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(this.activeUri);
    }
    return mongoose.connection;
  }

  async disconnect() {
    if (this.activeProvider === "POSTGRESQL") {
      await this.postgresDriver.disconnect();
    } else if (this.activeProvider === "SQLITE") {
      await this.sqliteDriver.disconnect();
    } else {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  }

  async testConnection(provider, uri) {
    let target = (provider || "MONGODB").toUpperCase();
    if (target === "BETTER-SQLITE3") target = "SQLITE";
    const startTime = Date.now();

    if (target === "SQLITE") {
      try {
        const dbPath = uri ? uri.replace(/^sqlite:\/\//, "") : (process.env.SQLITE_PATH || "./data/bot_ecosystem.sqlite");
        if (dbPath !== ":memory:") {
          fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
        }
        const testDb = new Database(dbPath);
        const row = testDb.prepare("SELECT sqlite_version() as version").get();
        testDb.close();
        const latencyMs = Date.now() - startTime;
        return { success: true, latencyMs, version: `SQLite ${row?.version || "3.x"}` };
      } catch (err) {
        const msg = err.message || String(err);
        return { success: false, error: msg };
      }
    }

    if (target === "POSTGRESQL") {
      const pool = new pg.Pool({ connectionString: uri, connectionTimeoutMillis: 5000 });
      try {
        const res = await pool.query("SELECT version()");
        const latencyMs = Date.now() - startTime;
        return { success: true, latencyMs, version: res.rows[0]?.version || "PostgreSQL" };
      } catch (err) {
        const msg = err.message || err.errors?.map((e) => e.message).join(", ") || err.code || String(err);
        return { success: false, error: msg };
      } finally {
        await pool.end().catch(() => null);
      }
    }

    try {
      const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
      const latencyMs = Date.now() - startTime;
      await conn.close().catch(() => null);
      return { success: true, latencyMs, version: "MongoDB" };
    } catch (err) {
      const msg = err.message || err.errors?.map((e) => e.message).join(", ") || err.code || String(err);
      return { success: false, error: msg };
    }
  }

  async switchProvider(targetProvider, targetUri, options = {}) {
    let normalizedTarget = (targetProvider || "MONGODB").toUpperCase();
    if (normalizedTarget === "BETTER-SQLITE3") normalizedTarget = "SQLITE";
    const test = await this.testConnection(normalizedTarget, targetUri);
    if (!test.success) {
      throw new Error(`Bağlantı testi başarısız: ${test.error}`);
    }

    let migrationReport = null;
    if (options.migrateData) {
      let targetDriver = null;
      if (normalizedTarget === "POSTGRESQL") {
        targetDriver = new PostgresDriver();
        await targetDriver.connect(targetUri);
      } else if (normalizedTarget === "SQLITE") {
        targetDriver = new SqliteDriver();
        await targetDriver.connect(targetUri);
      }

      const sourceGetter = (name) => this.getModel(name);
      const targetGetter = (name) => {
        if (normalizedTarget === "POSTGRESQL") {
          return targetDriver.getModel(name);
        }
        if (normalizedTarget === "SQLITE") {
          return targetDriver.getModel(name);
        }
        return mongoose.models[name];
      };

      migrationReport = await DatabaseMigrator.migrate(sourceGetter, targetGetter);

      if (targetDriver) {
        await targetDriver.disconnect().catch(() => null);
      }
    }

    await this.disconnect();
    this.activeProvider = normalizedTarget;
    this.activeUri = targetUri;

    if (this.activeProvider === "POSTGRESQL") {
      await this.postgresDriver.connect(targetUri);
    } else if (this.activeProvider === "SQLITE") {
      await this.sqliteDriver.connect(targetUri);
    } else {
      await mongoose.connect(targetUri);
    }

    return {
      success: true,
      provider: this.activeProvider,
      uri: this.activeUri,
      migration: migrationReport
    };
  }

  getStatus() {
    let isConnected = false;
    if (this.activeProvider === "POSTGRESQL") {
      isConnected = Boolean(this.postgresDriver.pool);
    } else if (this.activeProvider === "SQLITE") {
      isConnected = Boolean(this.sqliteDriver.db);
    } else {
      isConnected = mongoose.connection.readyState === 1;
    }

    let maskedUri = "";
    if (this.activeUri) {
      try {
        const parsed = new URL(this.activeUri);
        if (parsed.password) parsed.password = "******";
        maskedUri = parsed.toString();
      } catch {
        maskedUri = this.activeUri.replace(/:([^:@]+)@/, ":******@");
      }
    }

    return {
      provider: this.activeProvider,
      connected: isConnected,
      uri: maskedUri
    };
  }

  getModel(modelName) {
    if (this.proxies.has(modelName)) {
      return this.proxies.get(modelName);
    }

    const self = this;
    const modelOverrides = new Map();
    this.overrides.set(modelName, modelOverrides);

    function ProxyConstructor(...args) {
      if (self.activeProvider === "POSTGRESQL") {
        const pgModel = self.postgresDriver.getModel(modelName);
        return new pgModel(...args);
      }
      if (self.activeProvider === "SQLITE") {
        const sqliteModel = self.sqliteDriver.getModel(modelName);
        return new sqliteModel(...args);
      }
      const mongoModel = mongoose.models[modelName];
      return new mongoModel(...args);
    }

    const proxy = new Proxy(ProxyConstructor, {
      get(target, prop) {
        if (modelOverrides.has(prop)) {
          return modelOverrides.get(prop);
        }

        if (self.activeProvider === "POSTGRESQL") {
          const pgModel = self.postgresDriver.getModel(modelName);
          const val = pgModel[prop];
          if (typeof val === "function") return val.bind(pgModel);
          return val;
        }

        if (self.activeProvider === "SQLITE") {
          const sqliteModel = self.sqliteDriver.getModel(modelName);
          const val = sqliteModel[prop];
          if (typeof val === "function") return val.bind(sqliteModel);
          return val;
        }

        const mongoModel = mongoose.models[modelName];
        if (!mongoModel) return undefined;
        const val = mongoModel[prop];
        if (typeof val === "function") return val.bind(mongoModel);
        return val;
      },

      set(target, prop, value) {
        modelOverrides.set(prop, value);
        return true;
      }
    });

    this.proxies.set(modelName, proxy);
    return proxy;
  }
}

export const DatabaseManager = new DatabaseManagerImpl();
