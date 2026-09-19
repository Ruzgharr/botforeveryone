import test from "node:test";
import assert from "node:assert/strict";
import { DuelService } from "../apps/economy/src/services/DuelService.js";
import { DatabaseManager, Economy, GuildConfig } from "@bot/database";

await DatabaseManager.connect(":memory:", { provider: "SQLITE" });

test("DuelService createDuel enforces casino bet limits and prevents self duels", () => {
  const guildId = "test-duel-guild-1";
  const user1 = "test-duel-user-1";
  const user2 = "test-duel-user-2";

  const selfRes = DuelService.createDuel({
    guildId,
    challengerId: user1,
    targetId: user1,
    bet: 500
  });
  assert.equal(selfRes.success, false);

  const lowBetRes = DuelService.createDuel({
    guildId,
    challengerId: user1,
    targetId: user2,
    bet: 2,
    config: { casinoSettings: { minBet: 50, maxBet: 10000 } }
  });
  assert.equal(lowBetRes.success, false);

  const highBetRes = DuelService.createDuel({
    guildId,
    challengerId: user1,
    targetId: user2,
    bet: 20000,
    config: { casinoSettings: { minBet: 50, maxBet: 10000 } }
  });
  assert.equal(highBetRes.success, false);

  const validRes = DuelService.createDuel({
    guildId,
    challengerId: user1,
    targetId: user2,
    bet: 500,
    config: { casinoSettings: { minBet: 50, maxBet: 10000 } }
  });
  assert.equal(validRes.success, true);
  assert.ok(validRes.duel.id);

  DuelService.cancelDuel(validRes.duel.id, user1);
});

test("DuelService resolveDuel processes dice battle and pot transfer", async () => {
  const guildId = "test-duel-guild-2";
  const user1 = "test-duel-user-3";
  const user2 = "test-duel-user-4";

  await Economy.create({ guildId, userId: user1, wallet: 1000 });
  await Economy.create({ guildId, userId: user2, wallet: 1000 });

  const createRes = DuelService.createDuel({
    guildId,
    challengerId: user1,
    targetId: user2,
    bet: 300
  });
  assert.equal(createRes.success, true);

  const wrongUserRes = await DuelService.resolveDuel(createRes.duel.id, "unauthorized-user");
  assert.equal(wrongUserRes.success, false);

  const resolveRes = await DuelService.resolveDuel(createRes.duel.id, user2);
  assert.equal(resolveRes.success, true);
  assert.equal(resolveRes.totalPot, 600);
  assert.ok([user1, user2].includes(resolveRes.winnerId));

  const ecoWinner = await Economy.findOne({ guildId, userId: resolveRes.winnerId });
  const ecoLoser = await Economy.findOne({ guildId, userId: resolveRes.loserId });

  assert.equal(ecoWinner.wallet, 1300);
  assert.equal(ecoLoser.wallet, 700);
});
