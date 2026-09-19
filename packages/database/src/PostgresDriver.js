import pg from "pg";
import { randomUUID } from "node:crypto";
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
  Pet: "pets"
};

function getNested(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }
  return current;
}

function setNested(obj, path, value) {
  if (!obj || !path) return;
  const parts = path.split(".");
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

function incNested(obj, path, amount) {
  if (!obj || !path) return;
  const currentVal = getNested(obj, path);
  const num = typeof currentVal === "number" ? currentVal : 0;
  setNested(obj, path, num + Number(amount));
}

function pushNested(obj, path, item) {
  if (!obj || !path) return;
  const currentVal = getNested(obj, path);
  if (Array.isArray(currentVal)) {
    currentVal.push(item);
  } else {
    setNested(obj, path, [item]);
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

export class PgDocument {
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
    const pool = this._model.driver.pool;
    const tableName = this._model.tableName;
    const guildId = this._data.guildId || null;
    const userId = this._data.userId || null;
    const keyVal = this._data.serviceKey || this._data.caseId || this._data.ticketId || this._data.itemId || null;
    this._data.updatedAt = new Date();
    const query = `UPDATE ${tableName} SET guild_id = $1, user_id = $2, key_val = $3, data = $4, updated_at = NOW() WHERE _id = $5 RETURNING *`;
    const res = await pool.query(query, [guildId, userId, keyVal ? String(keyVal) : null, JSON.stringify(this._data), String(id)]);
    if (res.rows[0]) {
      this._data = { ...res.rows[0].data, _id: res.rows[0]._id, createdAt: res.rows[0].created_at, updatedAt: res.rows[0].updated_at };
    }
    return this;
  }
}

export class PgQuery {
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
        const direction = (dir === -1 || dir === "desc" || dir === "DESC") ? "DESC" : "ASC";
        if (key === "createdAt") {
          parts.push(`created_at ${direction}`);
        } else if (key === "updatedAt") {
          parts.push(`updated_at ${direction}`);
        } else if (["wallet", "totalVoiceMs", "totalMessages", "xp", "level", "points", "count", "rating"].includes(key)) {
          parts.push(`(data->>'${key}')::numeric ${direction}`);
        } else {
          parts.push(`data->>'${key}' ${direction}`);
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
    const res = await this.model.driver.pool.query(query, params);
    return res.rows.map(row => {
      const merged = { ...row.data, _id: row._id, createdAt: row.created_at, updatedAt: row.updated_at };
      return this._lean ? merged : new PgDocument(merged, this.model, false);
    });
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

export class PostgresModel {
  constructor(modelName, driver) {
    this.modelName = modelName;
    this.driver = driver;
    this.tableName = TABLE_MAP[modelName] || modelName.toLowerCase() + "s";

    const self = this;
    function ModelConstructor(initialData = {}) {
      const docData = self.createDefaultDoc(initialData);
      docData._id = docData._id || docData.id || randomUUID();
      docData.id = docData._id;
      return new PgDocument(docData, self, true);
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
    let paramIndex = 1;

    if (filter._id) {
      conditions.push(`_id = $${paramIndex++}`);
      params.push(String(filter._id));
    }
    if (filter.id && !filter._id) {
      conditions.push(`_id = $${paramIndex++}`);
      params.push(String(filter.id));
    }
    if (filter.guildId !== undefined) {
      conditions.push(`guild_id = $${paramIndex++}`);
      params.push(String(filter.guildId));
    }
    if (filter.userId !== undefined) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(String(filter.userId));
    }
    if (filter.caseId !== undefined) {
      conditions.push(`key_val = $${paramIndex++}`);
      params.push(String(filter.caseId));
    }
    if (filter.serviceKey !== undefined) {
      conditions.push(`key_val = $${paramIndex++}`);
      params.push(String(filter.serviceKey));
    }
    if (filter.ticketId !== undefined) {
      conditions.push(`key_val = $${paramIndex++}`);
      params.push(String(filter.ticketId));
    }
    if (filter.itemId !== undefined) {
      conditions.push(`key_val = $${paramIndex++}`);
      params.push(String(filter.itemId));
    }
    if (filter.messageId !== undefined) {
      conditions.push(`key_val = $${paramIndex++}`);
      params.push(String(filter.messageId));
    }

    if (Array.isArray(filter.$or) && filter.$or.length > 0) {
      const orClauses = [];
      for (const branch of filter.$or) {
        const subConditions = [];
        for (const [bKey, bVal] of Object.entries(branch)) {
          if (bKey === "_id" || bKey === "id") {
            subConditions.push(`_id = $${paramIndex++}`);
            params.push(String(bVal));
          } else if (bKey === "guildId") {
            subConditions.push(`guild_id = $${paramIndex++}`);
            params.push(String(bVal));
          } else if (bKey === "userId") {
            subConditions.push(`user_id = $${paramIndex++}`);
            params.push(String(bVal));
          } else if (typeof bVal === "boolean") {
            subConditions.push(`(data->>'${bKey}')::boolean = $${paramIndex++}`);
            params.push(bVal);
          } else if (typeof bVal === "number") {
            subConditions.push(`(data->>'${bKey}')::numeric = $${paramIndex++}`);
            params.push(bVal);
          } else {
            subConditions.push(`(data->>'${bKey}' = $${paramIndex} OR (jsonb_typeof(data->'${bKey}') = 'array' AND data->'${bKey}' ? $${paramIndex}))`);
            paramIndex++;
            params.push(String(bVal));
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

      if (val !== null && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
        if (val.$ne !== undefined) {
          if (val.$ne === null) {
            conditions.push(`data->>'${key}' IS NOT NULL`);
          } else {
            conditions.push(`(data->>'${key}' IS NULL OR data->>'${key}' != $${paramIndex++})`);
            params.push(String(val.$ne));
          }
        }
        if (val.$in !== undefined && Array.isArray(val.$in)) {
          conditions.push(`data->>'${key}' = ANY($${paramIndex++})`);
          params.push(val.$in.map(String));
        }
        const isDateKey = DATE_FIELDS.has(key) || val.$gt instanceof Date || val.$gte instanceof Date || val.$lt instanceof Date || val.$lte instanceof Date;
        if (val.$gt !== undefined) {
          if (isDateKey) {
            conditions.push(`(data->>'${key}')::timestamptz > $${paramIndex++}`);
            params.push(val.$gt instanceof Date ? val.$gt.toISOString() : val.$gt);
          } else {
            conditions.push(`(data->>'${key}')::numeric > $${paramIndex++}`);
            params.push(val.$gt);
          }
        }
        if (val.$gte !== undefined) {
          if (isDateKey) {
            conditions.push(`(data->>'${key}')::timestamptz >= $${paramIndex++}`);
            params.push(val.$gte instanceof Date ? val.$gte.toISOString() : val.$gte);
          } else {
            conditions.push(`(data->>'${key}')::numeric >= $${paramIndex++}`);
            params.push(val.$gte);
          }
        }
        if (val.$lt !== undefined) {
          if (isDateKey) {
            conditions.push(`(data->>'${key}')::timestamptz < $${paramIndex++}`);
            params.push(val.$lt instanceof Date ? val.$lt.toISOString() : val.$lt);
          } else {
            conditions.push(`(data->>'${key}')::numeric < $${paramIndex++}`);
            params.push(val.$lt);
          }
        }
        if (val.$lte !== undefined) {
          if (isDateKey) {
            conditions.push(`(data->>'${key}')::timestamptz <= $${paramIndex++}`);
            params.push(val.$lte instanceof Date ? val.$lte.toISOString() : val.$lte);
          } else {
            conditions.push(`(data->>'${key}')::numeric <= $${paramIndex++}`);
            params.push(val.$lte);
          }
        }
      } else if (typeof val === "boolean") {
        conditions.push(`(data->>'${key}')::boolean = $${paramIndex++}`);
        params.push(val);
      } else if (typeof val === "number") {
        conditions.push(`(data->>'${key}')::numeric = $${paramIndex++}`);
        params.push(val);
      } else if (val === null) {
        conditions.push(`(data->>'${key}' IS NULL)`);
      } else if (val instanceof Date) {
        conditions.push(`(data->>'${key}')::timestamptz = $${paramIndex++}`);
        params.push(val.toISOString());
      } else {
        conditions.push(`(data->>'${key}' = $${paramIndex} OR (jsonb_typeof(data->'${key}') = 'array' AND data->'${key}' ? $${paramIndex}))`);
        paramIndex++;
        params.push(String(val));
      }
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return { whereSql, params };
  }

  async findOne(filter = {}) {
    const { whereSql, params } = this.buildWhereClause(filter);
    const query = `SELECT * FROM ${this.tableName} ${whereSql} LIMIT 1`;
    const res = await this.driver.pool.query(query, params);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    const merged = { ...row.data, _id: row._id, createdAt: row.created_at, updatedAt: row.updated_at };
    return new PgDocument(merged, this, false);
  }

  async findById(id) {
    return await this.findOne({ _id: id });
  }

  async findByIdAndDelete(id) {
    return await this.deleteOne({ _id: id });
  }

  async findOneAndDelete(filter = {}) {
    return await this.deleteOne(filter);
  }

  find(filter = {}) {
    return new PgQuery(this, filter);
  }

  async create(docOrDocs) {
    if (Array.isArray(docOrDocs)) {
      const results = [];
      for (const item of docOrDocs) {
        results.push(await this.create(item));
      }
      return results;
    }
    const defaultDoc = this.createDefaultDoc(docOrDocs);
    const id = defaultDoc._id || defaultDoc.id || randomUUID();
    defaultDoc._id = id;
    defaultDoc.id = id;
    const guildId = defaultDoc.guildId || null;
    const userId = defaultDoc.userId || null;
    const keyVal = defaultDoc.serviceKey || defaultDoc.caseId || defaultDoc.ticketId || defaultDoc.itemId || null;
    defaultDoc.createdAt = defaultDoc.createdAt || new Date();
    defaultDoc.updatedAt = defaultDoc.updatedAt || new Date();
    const query = `
      INSERT INTO ${this.tableName} (_id, guild_id, user_id, key_val, data, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (_id) DO UPDATE SET guild_id = EXCLUDED.guild_id, user_id = EXCLUDED.user_id, key_val = EXCLUDED.key_val, data = EXCLUDED.data, updated_at = NOW()
      RETURNING *
    `;
    const res = await this.driver.pool.query(query, [String(id), guildId, userId, keyVal ? String(keyVal) : null, JSON.stringify(defaultDoc)]);
    const row = res.rows[0];
    const merged = { ...row.data, _id: row._id, createdAt: row.created_at, updatedAt: row.updated_at };
    return new PgDocument(merged, this, false);
  }

  async findOneAndUpdate(filter = {}, update = {}, options = {}) {
    const client = await this.driver.pool.connect();
    try {
      await client.query("BEGIN");
      const { whereSql, params } = this.buildWhereClause(filter);
      const selectQuery = `SELECT * FROM ${this.tableName} ${whereSql} LIMIT 1 FOR UPDATE`;
      const selRes = await client.query(selectQuery, params);

      let docData = null;
      let isNew = false;

      if (selRes.rows.length > 0) {
        const row = selRes.rows[0];
        docData = { ...row.data, _id: row._id, createdAt: row.created_at, updatedAt: row.updated_at };
      } else if (options.upsert) {
        isNew = true;
        docData = this.createDefaultDoc(filter);
        docData._id = docData._id || docData.id || randomUUID();
        docData.id = docData._id;
        docData.createdAt = new Date();
      } else {
        await client.query("COMMIT");
        return null;
      }

      if (update.$set) {
        for (const [k, v] of Object.entries(update.$set)) {
          setNested(docData, k, v);
        }
      }
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          incNested(docData, k, Number(v));
        }
      }
      if (update.$push) {
        for (const [k, v] of Object.entries(update.$push)) {
          pushNested(docData, k, v);
        }
      }
      for (const [k, v] of Object.entries(update)) {
        if (!k.startsWith("$")) {
          setNested(docData, k, v);
        }
      }

      docData.updatedAt = new Date();
      const guildId = docData.guildId || null;
      const userId = docData.userId || null;
      const keyVal = docData.serviceKey || docData.caseId || docData.ticketId || docData.itemId || docData.messageId || null;

      if (isNew) {
        const insertSql = `
          INSERT INTO ${this.tableName} (_id, guild_id, user_id, key_val, data, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING *
        `;
        const insRes = await client.query(insertSql, [String(docData._id), guildId, userId, keyVal ? String(keyVal) : null, JSON.stringify(docData)]);
        await client.query("COMMIT");
        const row = insRes.rows[0];
        const merged = { ...row.data, _id: row._id, createdAt: row.created_at, updatedAt: row.updated_at };
        return new PgDocument(merged, this, false);
      } else {
        const updateSql = `
          UPDATE ${this.tableName}
          SET guild_id = $1, user_id = $2, key_val = $3, data = $4, updated_at = NOW()
          WHERE _id = $5
          RETURNING *
        `;
        const updRes = await client.query(updateSql, [guildId, userId, keyVal ? String(keyVal) : null, JSON.stringify(docData), String(docData._id)]);
        await client.query("COMMIT");
        const row = updRes.rows[0];
        const merged = { ...row.data, _id: row._id, createdAt: row.created_at, updatedAt: row.updated_at };
        return new PgDocument(merged, this, false);
      }
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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
    const query = `SELECT COUNT(*)::int AS count FROM ${this.tableName} ${whereSql}`;
    const res = await this.driver.pool.query(query, params);
    return Number(res.rows[0]?.count || 0);
  }

  async deleteMany(filter = {}) {
    const { whereSql, params } = this.buildWhereClause(filter);
    const query = `DELETE FROM ${this.tableName} ${whereSql}`;
    const res = await this.driver.pool.query(query, params);
    return { deletedCount: res.rowCount };
  }

  async deleteOne(filter = {}) {
    const { whereSql, params } = this.buildWhereClause(filter);
    const query = `DELETE FROM ${this.tableName} WHERE _id IN (SELECT _id FROM ${this.tableName} ${whereSql} LIMIT 1)`;
    const res = await this.driver.pool.query(query, params);
    return { deletedCount: res.rowCount };
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

export class PostgresDriver {
  constructor() {
    this.pool = null;
    this.models = new Map();
  }

  async connect(uri) {
    if (this.pool) {
      await this.disconnect();
    }
    this.pool = new pg.Pool({
      connectionString: uri,
      max: 25,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });
    this.pool.on("error", (err) => {
      console.error("PostgreSQL Pool Hatası:", err?.message || err);
    });
    await this.initTables();
    return this.pool;
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async initTables() {
    if (!this.pool) return;
    for (const tableName of Object.values(TABLE_MAP)) {
      const sql = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
          _id VARCHAR(128) PRIMARY KEY,
          guild_id VARCHAR(64),
          user_id VARCHAR(64),
          key_val VARCHAR(128),
          data JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_${tableName}_guild_id ON ${tableName} (guild_id);
        CREATE INDEX IF NOT EXISTS idx_${tableName}_guild_user ON ${tableName} (guild_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_${tableName}_key_val ON ${tableName} (key_val);
        CREATE INDEX IF NOT EXISTS idx_${tableName}_data_gin ON ${tableName} USING gin (data);
      `;
      await this.pool.query(sql);
    }
  }

  getModel(modelName) {
    if (!this.models.has(modelName)) {
      this.models.set(modelName, new PostgresModel(modelName, this));
    }
    return this.models.get(modelName);
  }
}
