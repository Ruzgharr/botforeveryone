import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

const TABLE_MAP = {
  GuildConfig: "guildconfigs",
  Penalty: "penalties",
  UserAccount: "useraccounts",
  Stat: "stats",
  StaffTask: "stafftasks",
  Economy: "economies",
  Backup: "backups",
  VoiceBot: "voicebots",
  Ticket: "tickets",
  BotCredential: "botcredentials",
  StaffKpi: "staffkpis",
  MarketItem: "marketitems",
  ShopItem: "shopitems",
  ForceBan: "forcebans",
  InviteRecord: "inviterecords",
  ChatMessage: "chatmessages",
  BattlePass: "battlepasses",
  UserBattlePass: "userbattlepasses",
  Clan: "clans",
  Pet: "pets",
  DashboardAdmin: "dashboardadmins",
  SecurityAuditLog: "securityauditlogs"
};

function isValidSqlIdentifier(name) {
  return typeof name === "string" && /^[A-Za-z0-9_]+$/.test(name) && !["__proto__", "prototype", "constructor"].includes(name);
}

function getNested(obj, targetPath) {
  if (!obj || !targetPath) return undefined;
  const parts = targetPath.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setNested(obj, targetPath, value) {
  if (!obj || !targetPath) return;
  const parts = targetPath.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

function incNested(obj, targetPath, amount) {
  if (!obj || !targetPath) return;
  const currentVal = getNested(obj, targetPath);
  const num = typeof currentVal === "number" ? currentVal : 0;
  setNested(obj, targetPath, num + Number(amount));
}

function pushNested(obj, targetPath, item) {
  if (!obj || !targetPath) return;
  const currentVal = getNested(obj, targetPath);
  if (Array.isArray(currentVal)) {
    currentVal.push(item);
  } else {
    setNested(obj, targetPath, [item]);
  }
}

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "lastDaily",
  "lastBalik",
  "lastMaden",
  "lastPiyango",
  "lastKazikazan",
  "lastIncome",
  "propertyLastIncome",
  "registeredAt",
  "date",
  "expiresAt",
  "liftedAt",
  "closedAt",
  "startedAt",
  "matureAt",
  "timestamp",
  "purchasedAt",
  "editedAt",
  "deletedAt"
]);

function hydrateValue(prop, val) {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val;
  if (DATE_FIELDS.has(prop) || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val))) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return val;
}

export class SqliteDocument {
  constructor(data, model, isNew = false) {
    this._data = { ...data };
    this._model = model;
    this._isNew = isNew;

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target) {
          const val = target[prop];
          if (typeof val === "function") return val.bind(target);
          return val;
        }
        if (prop === "_id" || prop === "id") {
          return target._data._id || target._data.id;
        }
        const raw = target._data[prop];
        return hydrateValue(prop, raw);
      },
      set(target, prop, value) {
        if (prop === "_data" || prop === "_model" || prop === "_isNew") {
          target[prop] = value;
          return true;
        }
        target._data[prop] = value;
        return true;
      }
    });
  }

  toObject() {
    return JSON.parse(JSON.stringify(this._data));
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    if (this._isNew) {
      const saved = await this._model.create(this._data);
      this._data = saved.toObject();
      this._isNew = false;
      return this;
    }
    const id = this._data._id || this._data.id;
    const db = this._model.driver.db;
    const tableName = this._model.tableName;
    const guildId = this._data.guildId || null;
    const userId = this._data.userId || null;
    const keyVal = this._data.serviceKey || this._data.caseId || this._data.ticketId || this._data.itemId || this._data.messageId || null;
    this._data.updatedAt = new Date().toISOString();
    const query = `UPDATE ${tableName} SET guild_id = ?, user_id = ?, key_val = ?, data = ?, updated_at = datetime('now') WHERE _id = ?`;
    db.prepare(query).run(guildId, userId, keyVal ? String(keyVal) : null, JSON.stringify(this._data), String(id));
    return this;
  }
}

export class SqliteQuery {
  constructor(model, filter) {
    this.model = model;
    this.filter = filter;
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._lean = false;
  }

  sort(s) {
    this._sort = s;
    return this;
  }

  limit(l) {
    this._limit = Number(l);
    return this;
  }

  skip(s) {
    this._skip = Number(s);
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async exec() {
    const { whereSql, params } = this.model.buildWhereClause(this.filter);
    let orderSql = "";
    if (this._sort) {
      const parts = [];
      for (const [key, dir] of Object.entries(this._sort)) {
        if (!isValidSqlIdentifier(key)) continue;
        const direction = (dir === -1 || dir === "desc" || dir === "DESC") ? "DESC" : "ASC";
        if (key === "createdAt") {
          parts.push(`created_at ${direction}`);
        } else if (key === "updatedAt") {
          parts.push(`updated_at ${direction}`);
        } else if (["wallet", "totalVoiceMs", "totalMessages", "xp", "level", "points", "count", "rating"].includes(key)) {
          parts.push(`CAST(json_extract(data, '$.${key}') AS NUMERIC) ${direction}`);
        } else {
          parts.push(`json_extract(data, '$.${key}') ${direction}`);
        }
      }
      if (parts.length > 0) orderSql = `ORDER BY ${parts.join(", ")}`;
    }
    let limitSql = "";
    if (this._limit !== null && this._limit > 0) {
      limitSql = `LIMIT ${this._limit}`;
    }
    let offsetSql = "";
    if (this._skip !== null && this._skip > 0) {
      offsetSql = `OFFSET ${this._skip}`;
    }
    const query = `SELECT * FROM ${this.model.tableName} ${whereSql} ${orderSql} ${limitSql} ${offsetSql}`;
    const rows = this.model.driver.db.prepare(query).all(...params);
    return rows.map(row => {
      const parsedData = JSON.parse(row.data);
      const merged = { ...parsedData, _id: row._id, createdAt: row.created_at, updatedAt: row.updated_at };
      return this._lean ? merged : new SqliteDocument(merged, this.model, false);
    });
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

export class SqliteModel {
  constructor(modelName, driver) {
    this.modelName = modelName;
    this.driver = driver;
    this.tableName = TABLE_MAP[modelName] || modelName.toLowerCase();

    const self = this;
    function ModelConstructor(data = {}) {
      const defaultDoc = self.createDefaultDoc(data);
      const docData = { ...defaultDoc, ...data };
      docData._id = docData._id || docData.id || randomUUID();
      docData.id = docData._id;
      return new SqliteDocument(docData, self, true);
    }

    Object.setPrototypeOf(ModelConstructor, self);
    return new Proxy(ModelConstructor, {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (prop in self) {
          const val = self[prop];
          if (typeof val === "function") return val.bind(self);
          return val;
        }
        return undefined;
      }
    });
  }

  createDefaultDoc(inputData = {}) {
    const mongooseModel = mongoose.models[this.modelName];
    if (mongooseModel) {
      try {
        const temp = new mongooseModel(inputData);
        return temp.toObject();
      } catch {
        return { ...inputData };
      }
    }
    return { ...inputData };
  }

  buildWhereClause(filter = {}) {
    const conditions = [];
    const params = [];

    if (filter._id) {
      conditions.push("_id = ?");
      params.push(String(filter._id));
    }
    if (filter.id && !filter._id) {
      conditions.push("_id = ?");
      params.push(String(filter.id));
    }
    if (filter.guildId !== undefined) {
      conditions.push("guild_id = ?");
      params.push(String(filter.guildId));
    }
    if (filter.userId !== undefined) {
      conditions.push("user_id = ?");
      params.push(String(filter.userId));
    }
    if (filter.caseId !== undefined) {
      conditions.push("key_val = ?");
      params.push(String(filter.caseId));
    }
    if (filter.serviceKey !== undefined) {
      conditions.push("key_val = ?");
      params.push(String(filter.serviceKey));
    }
    if (filter.ticketId !== undefined) {
      conditions.push("key_val = ?");
      params.push(String(filter.ticketId));
    }
    if (filter.itemId !== undefined) {
      conditions.push("key_val = ?");
      params.push(String(filter.itemId));
    }
    if (filter.messageId !== undefined) {
      conditions.push("key_val = ?");
      params.push(String(filter.messageId));
    }

    if (Array.isArray(filter.$or) && filter.$or.length > 0) {
      const orClauses = [];
      for (const branch of filter.$or) {
        const subConditions = [];
        for (const [bKey, bVal] of Object.entries(branch)) {
          if (!isValidSqlIdentifier(bKey)) continue;
          if (bKey === "_id" || bKey === "id") {
            subConditions.push("_id = ?");
            params.push(String(bVal));
          } else if (bKey === "guildId") {
            subConditions.push("guild_id = ?");
            params.push(String(bVal));
          } else if (bKey === "userId") {
            subConditions.push("user_id = ?");
            params.push(String(bVal));
          } else if (typeof bVal === "boolean") {
            subConditions.push(`json_extract(data, '$.${bKey}') = ?`);
            params.push(bVal ? 1 : 0);
          } else if (typeof bVal === "number") {
            subConditions.push(`CAST(json_extract(data, '$.${bKey}') AS NUMERIC) = ?`);
            params.push(bVal);
          } else {
            subConditions.push(`(json_extract(data, '$.${bKey}') = ? OR json_extract(data, '$.${bKey}') LIKE ?)`);
            params.push(String(bVal), `%"${String(bVal)}"%`);
          }
        }
        if (subConditions.length > 0) {
          orClauses.push(`(${subConditions.join(" AND ")})`);
        }
      }
      if (orClauses.length > 0) {
        conditions.push(`(${orClauses.join(" OR ")})`);
      }
    }

    for (const [key, val] of Object.entries(filter)) {
      if (["_id", "id", "guildId", "userId", "caseId", "serviceKey", "ticketId", "itemId", "messageId", "$or"].includes(key)) continue;
      if (!isValidSqlIdentifier(key)) continue;

      if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        if (val.$ne !== undefined) {
          if (val.$ne === null) {
            conditions.push(`json_extract(data, '$.${key}') IS NOT NULL`);
          } else {
            conditions.push(`(json_extract(data, '$.${key}') IS NULL OR json_extract(data, '$.${key}') != ?)`);
            params.push(val.$ne);
          }
        }
        if (val.$in !== undefined && Array.isArray(val.$in)) {
          const inPlaceholders = val.$in.map(() => "?").join(", ");
          conditions.push(`json_extract(data, '$.${key}') IN (${inPlaceholders})`);
          params.push(...val.$in);
        }
        if (val.$gt !== undefined) {
          conditions.push(`CAST(json_extract(data, '$.${key}') AS NUMERIC) > ?`);
          params.push(val.$gt);
        }
        if (val.$gte !== undefined) {
          conditions.push(`CAST(json_extract(data, '$.${key}') AS NUMERIC) >= ?`);
          params.push(val.$gte);
        }
        if (val.$lt !== undefined) {
          conditions.push(`CAST(json_extract(data, '$.${key}') AS NUMERIC) < ?`);
          params.push(val.$lt);
        }
        if (val.$lte !== undefined) {
          conditions.push(`CAST(json_extract(data, '$.${key}') AS NUMERIC) <= ?`);
          params.push(val.$lte);
        }
      } else if (typeof val === "boolean") {
        conditions.push(`json_extract(data, '$.${key}') = ?`);
        params.push(val ? 1 : 0);
      } else if (typeof val === "number") {
        conditions.push(`CAST(json_extract(data, '$.${key}') AS NUMERIC) = ?`);
        params.push(val);
      } else if (val === null) {
        conditions.push(`json_extract(data, '$.${key}') IS NULL`);
      } else if (val instanceof Date) {
        conditions.push(`json_extract(data, '$.${key}') = ?`);
        params.push(val.toISOString());
      } else {
        conditions.push(`(json_extract(data, '$.${key}') = ? OR json_extract(data, '$.${key}') LIKE ?)`);
        params.push(String(val), `%"${String(val)}"%`);
      }
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { whereSql, params };
  }

  async findOne(filter = {}) {
    const query = new SqliteQuery(this, filter).limit(1);
    const results = await query.exec();
    return results[0] || null;
  }

  find(filter = {}) {
    return new SqliteQuery(this, filter);
  }

  async create(docOrDocs) {
    const isArray = Array.isArray(docOrDocs);
    const items = isArray ? docOrDocs : [docOrDocs];
    const results = [];
    const db = this.driver.db;

    const insertTx = db.transaction((rows) => {
      for (const input of rows) {
        const defaultDoc = this.createDefaultDoc(input);
        const data = { ...defaultDoc, ...input };
        const id = data._id || data.id || randomUUID();
        data._id = String(id);
        data.id = String(id);
        const guildId = data.guildId || null;
        const userId = data.userId || null;
        const keyVal = data.serviceKey || data.caseId || data.ticketId || data.itemId || data.messageId || null;
        const query = `INSERT INTO ${this.tableName} (_id, guild_id, user_id, key_val, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
        db.prepare(query).run(String(id), guildId, userId, keyVal ? String(keyVal) : null, JSON.stringify(data));
        results.push(new SqliteDocument(data, this, false));
      }
    });

    insertTx(items);
    return isArray ? results : results[0];
  }

  async findOneAndUpdate(filter, update, options = {}) {
    const isUpsert = Boolean(options.upsert);
    const returnNew = options.new !== false;
    const db = this.driver.db;

    const runTx = db.transaction(() => {
      const { whereSql, params } = this.buildWhereClause(filter);
      const selQuery = `SELECT * FROM ${this.tableName} ${whereSql} LIMIT 1`;
      const existing = db.prepare(selQuery).get(...params);

      if (!existing && !isUpsert) {
        return null;
      }

      let currentData = existing ? JSON.parse(existing.data) : this.createDefaultDoc(filter);
      const originalBeforeUpdate = { ...currentData };

      if (update.$set) {
        for (const [k, v] of Object.entries(update.$set)) {
          setNested(currentData, k, v);
        }
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          incNested(currentData, k, v);
        }
      }
      if (update.$push) {
        for (const [k, v] of Object.entries(update.$push)) {
          pushNested(currentData, k, v);
        }
      }
      if (!update.$set && !update.$inc && !update.$push) {
        for (const [k, v] of Object.entries(update)) {
          if (!k.startsWith("$")) {
            setNested(currentData, k, v);
          }
        }
      }

      currentData.updatedAt = new Date().toISOString();
      if (!existing) {
        currentData._id = currentData._id || currentData.id || randomUUID();
        currentData.createdAt = new Date().toISOString();
      }

      const idToUse = existing ? existing._id : currentData._id;
      const guildId = currentData.guildId || null;
      const userId = currentData.userId || null;
      const keyVal = currentData.serviceKey || currentData.caseId || currentData.ticketId || currentData.itemId || currentData.messageId || null;

      let resultDoc = null;
      if (existing) {
        const updateSql = `UPDATE ${this.tableName} SET guild_id = ?, user_id = ?, key_val = ?, data = ?, updated_at = datetime('now') WHERE _id = ?`;
        db.prepare(updateSql).run(guildId, userId, keyVal ? String(keyVal) : null, JSON.stringify(currentData), String(idToUse));
        resultDoc = returnNew ? { ...currentData, _id: idToUse } : originalBeforeUpdate;
      } else {
        const insertSql = `INSERT INTO ${this.tableName} (_id, guild_id, user_id, key_val, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
        db.prepare(insertSql).run(String(idToUse), guildId, userId, keyVal ? String(keyVal) : null, JSON.stringify(currentData));
        resultDoc = returnNew ? { ...currentData, _id: idToUse } : null;
      }

      return resultDoc;
    });

    const resultDoc = runTx();
    if (!resultDoc) return null;
    return options.lean ? resultDoc : new SqliteDocument(resultDoc, this, false);
  }

  async updateOne(filter = {}, update = {}, options = {}) {
    return await this.findOneAndUpdate(filter, update, options);
  }

  async updateMany(filter = {}, update = {}, options = {}) {
    const docs = await this.find(filter);
    for (const doc of docs) {
      await this.findOneAndUpdate({ _id: doc._id }, update, options);
    }
    return { modifiedCount: docs.length };
  }

  async countDocuments(filter = {}) {
    const { whereSql, params } = this.buildWhereClause(filter);
    const query = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereSql}`;
    const row = this.driver.db.prepare(query).get(...params);
    return Number(row?.count || 0);
  }

  async deleteMany(filter = {}) {
    const { whereSql, params } = this.buildWhereClause(filter);
    const query = `DELETE FROM ${this.tableName} ${whereSql}`;
    const res = this.driver.db.prepare(query).run(...params);
    return { deletedCount: res.changes };
  }

  async deleteOne(filter = {}) {
    const { whereSql, params } = this.buildWhereClause(filter);
    const query = `DELETE FROM ${this.tableName} WHERE _id IN (SELECT _id FROM ${this.tableName} ${whereSql} LIMIT 1)`;
    const res = this.driver.db.prepare(query).run(...params);
    return { deletedCount: res.changes };
  }

  async aggregate(pipeline = []) {
    const all = await this.find({}).lean();
    let current = all;

    for (const stage of pipeline) {
      if (stage.$match) {
        current = current.filter(item => {
          for (const [k, v] of Object.entries(stage.$match)) {
            if (v && typeof v === "object" && v.$ne !== undefined) {
              if (item[k] === v.$ne) return false;
            } else if (item[k] !== v) {
              return false;
            }
          }
          return true;
        });
      } else if (stage.$group) {
        const groups = new Map();
        const idKey = stage.$group._id ? String(stage.$group._id).replace("$", "") : null;
        for (const item of current) {
          const groupVal = idKey ? item[idKey] : "all";
          if (!groups.has(groupVal)) {
            groups.set(groupVal, { _id: groupVal, items: [] });
          }
          groups.get(groupVal).items.push(item);
        }
        const aggregated = [];
        for (const [grpId, groupData] of groups.entries()) {
          const out = { _id: grpId };
          for (const [field, expr] of Object.entries(stage.$group)) {
            if (field === "_id") continue;
            if (expr.$sum !== undefined) {
              if (expr.$sum === 1) {
                out[field] = groupData.items.length;
              } else if (expr.$sum.$cond) {
                const cond = expr.$sum.$cond;
                let count = 0;
                for (const it of groupData.items) {
                  const checkField = cond[0]?.$eq?.[0]?.replace("$", "");
                  const checkVal = cond[0]?.$eq?.[1];
                  if (it[checkField] === checkVal) {
                    count += cond[1] || 1;
                  } else {
                    count += cond[2] || 0;
                  }
                }
                out[field] = count;
              } else if (typeof expr.$sum === "string") {
                const prop = expr.$sum.replace("$", "");
                out[field] = groupData.items.reduce((acc, it) => acc + (Number(it[prop]) || 0), 0);
              }
            }
          }
          aggregated.push(out);
        }
        current = aggregated;
      } else if (stage.$sort) {
        const sortEntries = Object.entries(stage.$sort);
        current.sort((a, b) => {
          for (const [k, dir] of sortEntries) {
            const diff = (Number(a[k]) || 0) - (Number(b[k]) || 0);
            if (diff !== 0) return dir === -1 ? -diff : diff;
          }
          return 0;
        });
      } else if (stage.$limit) {
        current = current.slice(0, Number(stage.$limit));
      }
    }
    return current;
  }
}

export class SqliteDriver {
  constructor() {
    this.db = null;
    this.models = new Map();
  }

  async connect(uri) {
    if (this.db) {
      await this.disconnect();
    }
    const resolvedPath = (uri && !uri.startsWith("sqlite://"))
      ? uri
      : (uri ? uri.replace(/^sqlite:\/\//, "") : (process.env.SQLITE_PATH || "./data/bot_ecosystem.sqlite"));

    if (resolvedPath !== ":memory:") {
      fs.mkdirSync(path.dirname(path.resolve(resolvedPath)), { recursive: true });
    }
    this.db = new Database(resolvedPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    await this.initTables();
    return this.db;
  }

  async disconnect() {
    if (this.db) {
      try {
        this.db.close();
      } catch {}
      this.db = null;
    }
  }

  async initTables() {
    if (!this.db) return;
    for (const tableName of Object.values(TABLE_MAP)) {
      const sql = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          _id TEXT PRIMARY KEY,
          guild_id TEXT,
          user_id TEXT,
          key_val TEXT,
          data TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_${tableName}_guild_id ON ${tableName} (guild_id);
        CREATE INDEX IF NOT EXISTS idx_${tableName}_guild_user ON ${tableName} (guild_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_${tableName}_key_val ON ${tableName} (key_val);
      `;
      this.db.exec(sql);
    }
  }

  getModel(modelName) {
    if (!this.models.has(modelName)) {
      this.models.set(modelName, new SqliteModel(modelName, this));
    }
    return this.models.get(modelName);
  }
}
