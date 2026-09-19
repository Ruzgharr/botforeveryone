import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseManager, PostgresDriver, Stat, Economy, GuildConfig } from "@bot/database";
import { PostgresModel, PgDocument, PgQuery } from "../packages/database/src/PostgresDriver.js";

test("DatabaseManager default status and provider", () => {
  const status = DatabaseManager.getStatus();
  assert.ok(status.provider);
  assert.equal(typeof status.connected, "boolean");
});

test("DatabaseManager testConnection handles invalid connection safely", async () => {
  const result = await DatabaseManager.testConnection("POSTGRESQL", "postgresql://invalid:invalid@127.0.0.1:54329/nonexistent");
  assert.equal(result.success, false);
  assert.ok(result.error);
});

test("PostgresModel buildWhereClause handles indexed and JSONB fields", () => {
  const mockDriver = { pool: null };
  const model = new PostgresModel("Economy", mockDriver);

  const filter1 = { guildId: "guild1", userId: "user1" };
  const res1 = model.buildWhereClause(filter1);
  assert.equal(res1.whereSql, "WHERE guild_id = $1 AND user_id = $2");
  assert.deepEqual(res1.params, ["guild1", "user1"]);

  const filter2 = {
    guildId: "guild1",
    wallet: { $gte: 50 },
    active: true
  };
  const res2 = model.buildWhereClause(filter2);
  assert.ok(res2.whereSql.includes("guild_id = $1"));
  assert.ok(res2.whereSql.includes("(data->>'wallet')::numeric >= $2"));
  assert.ok(res2.whereSql.includes("(data->>'active')::boolean = $3"));
  assert.deepEqual(res2.params, ["guild1", 50, true]);
});

test("PgDocument proxy tracks fields and serializes toObject", () => {
  const mockModel = {
    tableName: "economies",
    driver: { pool: null }
  };
  const initial = {
    _id: "test-id-123",
    guildId: "g1",
    userId: "u1",
    wallet: 100,
    inventory: []
  };

  const doc = new PgDocument(initial, mockModel, false);
  assert.equal(doc.wallet, 100);
  assert.equal(doc._id, "test-id-123");

  doc.wallet += 50;
  assert.equal(doc.wallet, 150);

  doc.inventory.push({ itemId: "sword", count: 1 });
  assert.equal(doc.inventory.length, 1);

  doc.lastDaily = "2026-09-09T20:00:00.000Z";
  assert.ok(doc.lastDaily instanceof Date);
  assert.equal(typeof doc.lastDaily.getTime, "function");
  assert.equal(doc.lastDaily.getTime(), new Date("2026-09-09T20:00:00.000Z").getTime());

  const plain = doc.toObject();
  assert.equal(plain.wallet, 150);
  assert.equal(plain.inventory[0].itemId, "sword");
});

test("PgQuery builds proper order and limit clauses", async () => {
  let capturedQuery = "";
  let capturedParams = [];

  const mockDriver = {
    pool: {
      query: async (sql, params) => {
        capturedQuery = sql;
        capturedParams = params;
        return { rows: [] };
      }
    }
  };

  const model = new PostgresModel("Stat", mockDriver);
  const q = model.find({ guildId: "g123" }).sort({ totalMessages: -1 }).limit(10).skip(5);
  await q.exec();

  assert.ok(capturedQuery.includes("SELECT * FROM stats WHERE guild_id = $1"));
  assert.ok(capturedQuery.includes("ORDER BY (data->>'totalMessages')::numeric DESC"));
  assert.ok(capturedQuery.includes("LIMIT 10 OFFSET 5"));
  assert.deepEqual(capturedParams, ["g123"]);
});

test("Mongoose model proxy methods and overrides work in tests", async () => {
  const original = Economy.findOne;
  Economy.findOne = async () => ({ wallet: 999 });

  try {
    const found = await Economy.findOne({ userId: "mock" });
    assert.equal(found.wallet, 999);
  } finally {
    Economy.findOne = original;
  }
});

test("SqliteDriver memory connection, query and CRUD operations", async () => {
  const { SqliteDriver } = await import("../packages/database/src/SqliteDriver.js");
  const driver = new SqliteDriver();
  await driver.connect(":memory:");

  const model = driver.getModel("Economy");
  const created = await model.create({ guildId: "g_sq", userId: "u_sq", wallet: 250 });
  assert.equal(created.wallet, 250);

  const found = await model.findOne({ guildId: "g_sq", userId: "u_sq" });
  assert.equal(found.wallet, 250);

  await model.findOneAndUpdate({ guildId: "g_sq", userId: "u_sq" }, { $inc: { wallet: 50 } });
  const afterInc = await model.findOne({ guildId: "g_sq", userId: "u_sq" });
  assert.equal(afterInc.wallet, 300);

  await driver.disconnect();
});

test("ChatMessage model tracks creation, edit and deletion properly", async () => {
  const { SqliteDriver } = await import("../packages/database/src/SqliteDriver.js");
  const driver = new SqliteDriver();
  await driver.connect(":memory:");

  const chatModel = driver.getModel("ChatMessage");
  await chatModel.create({
    messageId: "msg_1",
    channelId: "ch_1",
    author: "UserA",
    content: "İlk mesaj"
  });

  const m1 = await chatModel.findOne({ messageId: "msg_1" });
  assert.equal(m1.content, "İlk mesaj");
  assert.equal(m1.isEdited, false);
  assert.equal(m1.isDeleted, false);

  await chatModel.findOneAndUpdate(
    { messageId: "msg_1" },
    { $set: { content: "Düzenlenmiş mesaj", isEdited: true, previousContent: "İlk mesaj" } }
  );

  const mEdited = await chatModel.findOne({ messageId: "msg_1" });
  assert.equal(mEdited.content, "Düzenlenmiş mesaj");
  assert.equal(mEdited.isEdited, true);
  assert.equal(mEdited.previousContent, "İlk mesaj");

  await chatModel.findOneAndUpdate(
    { messageId: "msg_1" },
    { $set: { isDeleted: true } }
  );

  const mDeleted = await chatModel.findOne({ messageId: "msg_1" });
  assert.equal(mDeleted.isDeleted, true);

  await driver.disconnect();
});
