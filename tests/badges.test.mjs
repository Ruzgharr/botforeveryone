import test from "node:test";
import assert from "node:assert/strict";
import { BadgeService } from "../apps/stats/src/services/BadgeService.js";
import { DatabaseManager, Stat, Economy, GuildConfig } from "@bot/database";

await DatabaseManager.connect(":memory:", { provider: "SQLITE" });

test("BadgeService checkAndAwardBadges awards billionaire and chat badges", async () => {
  const guildId = "test-badge-guild-1";
  const userId = "test-badge-user-1";

  await GuildConfig.updateOne(
    { guildId },
    { $set: { "badgeSystem.enabled": true } },
    { upsert: true }
  );

  await Economy.create({ guildId, userId, wallet: 150000 });
  await Stat.create({ guildId, userId, totalMessages: 1500, totalVoiceMs: 0, level: 5 });

  const awarded = await BadgeService.checkAndAwardBadges({ guildId, userId });
  assert.ok(Array.isArray(awarded));
  const badgeIds = awarded.map((b) => b.id);
  assert.ok(badgeIds.includes("milyarder"));
  assert.ok(badgeIds.includes("mesaj_ustasi"));

  const stat = await Stat.findOne({ guildId, userId });
  assert.ok(stat.badges.includes("milyarder"));
  assert.ok(stat.badges.includes("mesaj_ustasi"));
});

test("BadgeService setActiveBadges limits active display to 5 badges", async () => {
  const guildId = "test-badge-guild-2";
  const userId = "test-badge-user-2";

  await Stat.create({
    guildId,
    userId,
    badges: ["milyarder", "mesaj_ustasi", "ses_sampiyonu", "seviye_zirvesi", "sakura_ustasi", "sadik_uye"]
  });

  const updatedStat = await BadgeService.setActiveBadges(guildId, userId, [
    "milyarder",
    "mesaj_ustasi",
    "ses_sampiyonu",
    "seviye_zirvesi",
    "sakura_ustasi",
    "sadik_uye"
  ]);

  assert.ok(updatedStat);
  assert.equal(updatedStat.activeBadges.length, 5);

  const freshStat = await Stat.findOne({ guildId, userId });
  assert.equal(freshStat.activeBadges.length, 5);
});

test("BadgeService unlockTitle and setActiveTitle manage user display title", async () => {
  const guildId = "test-badge-guild-3";
  const userId = "test-badge-user-3";

  await Stat.create({ guildId, userId, unlockedTitles: [] });

  const statAfterUnlock = await BadgeService.unlockTitle(guildId, userId, "[🌸 Sakura Efendisi]");
  assert.ok(statAfterUnlock.unlockedTitles.includes("[🌸 Sakura Efendisi]"));
  assert.equal(statAfterUnlock.title, "[🌸 Sakura Efendisi]");

  const statAfterChange = await BadgeService.setActiveTitle(guildId, userId, "[👑 Sunucu Ağası]");
  assert.equal(statAfterChange.title, "[👑 Sunucu Ağası]");

  const statAfterClear = await BadgeService.setActiveTitle(guildId, userId, "");
  assert.equal(statAfterClear.title, "");
});
