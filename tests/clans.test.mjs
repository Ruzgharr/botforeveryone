import test from "node:test";
import assert from "node:assert/strict";
import { ClanService } from "../apps/economy/src/services/ClanService.js";
import { DatabaseManager, Clan, Economy, GuildConfig } from "@bot/database";

await DatabaseManager.connect(":memory:", { provider: "SQLITE" });

test("ClanService getClanSettings and setClanSettings update config", async () => {
  const guildId = "test-clan-guild-1";
  const initial = await ClanService.getClanSettings(guildId);
  assert.equal(initial.enabled, true);
  assert.equal(initial.createCost, 10000);

  const updated = await ClanService.setClanSettings(guildId, {
    enabled: true,
    createCost: 15000,
    maxMembersBase: 30
  });

  assert.equal(updated.createCost, 15000);
  assert.equal(updated.maxMembersBase, 30);
});

test("ClanService createClan validates wallet balance and creates clan", async () => {
  const guildId = "test-clan-guild-2";
  const userId = "test-clan-user-1";

  await ClanService.setClanSettings(guildId, { enabled: true, createCost: 10000 });
  await Economy.create({ guildId, userId, wallet: 5000 });

  const failResult = await ClanService.createClan(guildId, userId, "Gölge Kurtlar", "GLG", "Klan açıklaması");
  assert.equal(failResult.success, false);
  assert.ok(failResult.reason.includes("Coin"));

  await Economy.updateOne({ guildId, userId }, { $set: { wallet: 25000 } });
  const successResult = await ClanService.createClan(guildId, userId, "Gölge Kurtlar", "GLG", "Klan açıklaması");
  assert.equal(successResult.success, true);
  assert.ok(successResult.clan);
  assert.equal(successResult.clan.name, "Gölge Kurtlar");
  assert.equal(successResult.clan.tag, "GLG");
  assert.equal(successResult.clan.leaderId, userId);

  const ecoAfter = await Economy.findOne({ guildId, userId });
  assert.equal(ecoAfter.wallet, 15000);
});

test("ClanService depositToVault transfers coin to clan treasury", async () => {
  const guildId = "test-clan-guild-3";
  const userId = "test-clan-user-2";

  await ClanService.setClanSettings(guildId, { enabled: true, createCost: 5000 });
  await Economy.create({ guildId, userId, wallet: 20000 });

  const created = await ClanService.createClan(guildId, userId, "Akıncılar", "AKN", "Klan açıklaması");
  assert.equal(created.success, true);

  const depResult = await ClanService.depositToVault(guildId, userId, 3000);
  assert.equal(depResult.success, true);
  assert.equal(depResult.newVault, 3000);

  const topList = await ClanService.getTopClans(guildId, 10);
  assert.ok(Array.isArray(topList));
  assert.ok(topList.length >= 1);
  assert.equal(topList[0].name, "Akıncılar");
});
