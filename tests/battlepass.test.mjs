import test from "node:test";
import assert from "node:assert/strict";
import { BattlePassService } from "../apps/stats/src/services/BattlePassService.js";
import { DatabaseManager, BattlePass, UserBattlePass, Economy } from "@bot/database";

await DatabaseManager.connect(":memory:", { provider: "SQLITE" });

test("BattlePassService getOrCreateSeason creates season with 10 tiers", async () => {
  const guildId = "test-bp-guild-1";
  const season = await BattlePassService.getOrCreateSeason(guildId);

  assert.ok(season);
  assert.equal(season.guildId, guildId);
  assert.equal(season.season, 1);
  assert.equal(season.active, true);
  assert.equal(Array.isArray(season.tiers), true);
  assert.equal(season.tiers.length, 10);
});

test("BattlePassService getUserProgress initializes quests and tracking", async () => {
  const guildId = "test-bp-guild-2";
  const userId = "test-bp-user-1";

  const { season, userProgress } = await BattlePassService.getUserProgress(guildId, userId);
  assert.ok(season);
  assert.ok(userProgress);
  assert.equal(userProgress.userId, userId);
  assert.equal(userProgress.passXp, 0);
  assert.equal(userProgress.passLevel, 1);
  assert.ok(Array.isArray(userProgress.dailyQuests));
  assert.ok(userProgress.dailyQuests.length > 0);
  assert.ok(Array.isArray(userProgress.weeklyQuests));
  assert.ok(userProgress.weeklyQuests.length > 0);
});

test("BattlePassService recordProgress and claimQuestReward function properly", async () => {
  const guildId = "test-bp-guild-3";
  const userId = "test-bp-user-2";

  await BattlePassService.recordProgress(guildId, userId, "message", 50);
  const { userProgress } = await BattlePassService.getUserProgress(guildId, userId);

  const msgQuest = userProgress.dailyQuests.find((q) => q.questId === "daily_msg");
  assert.ok(msgQuest);
  assert.equal(msgQuest.completed, true);
  assert.equal(msgQuest.claimed, false);

  const claimResult = await BattlePassService.claimQuestReward(guildId, userId, "daily_msg", false);
  assert.equal(claimResult.success, true);
  assert.ok(claimResult.gainedXp > 0);
  assert.ok(claimResult.gainedCoin > 0);

  const doubleClaim = await BattlePassService.claimQuestReward(guildId, userId, "daily_msg", false);
  assert.equal(doubleClaim.success, false);
});
