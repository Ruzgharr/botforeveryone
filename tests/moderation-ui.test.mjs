import test from "node:test";
import assert from "node:assert/strict";
import { ModerationUI } from "../apps/moderation/src/services/ModerationUI.js";

function getV2Text(payload) {
  return payload?.components?.[0]?.components?.[0]?.content || "";
}

test("ModerationUI formatSicilPayload generates clean state and records state", () => {
  const dummyUser = { id: "123456789", tag: "testuser#0001", username: "testuser" };

  const cleanPayload = ModerationUI.formatSicilPayload({
    targetUser: dummyUser,
    penalties: [],
    page: 1,
    totalCount: 0,
    totalPoints: 0,
    filter: "all"
  });

  assert.ok(getV2Text(cleanPayload).includes("Sicil Kaydı Temiz"));
  assert.equal(cleanPayload.flags, 32768);

  const samplePenalties = [
    {
      caseId: 1,
      type: "MUTE",
      reason: "Spam",
      points: 10,
      active: true,
      executorId: "987654321",
      createdAt: new Date()
    }
  ];

  const filledPayload = ModerationUI.formatSicilPayload({
    targetUser: dummyUser,
    penalties: samplePenalties,
    page: 1,
    totalCount: 1,
    totalPoints: 10,
    filter: "all"
  });

  assert.ok(getV2Text(filledPayload).includes("Sicil Geçmişi"));
  assert.ok(filledPayload.components[0].components.length >= 3);
  assert.equal(filledPayload.flags, 32768);
});

test("ModerationUI formatCezaPayload generates action buttons based on active status", () => {
  const activePenalty = {
    caseId: 42,
    userId: "111",
    executorId: "222",
    type: "JAIL",
    reason: "Kural ihlali",
    points: 20,
    durationMs: 600000,
    active: true,
    createdAt: new Date()
  };

  const activePayload = ModerationUI.formatCezaPayload(activePenalty);
  assert.ok(getV2Text(activePayload).includes("Ceza #42"));
  assert.equal(activePayload.components[0].components.length, 2);

  const liftedPenalty = {
    ...activePenalty,
    active: false,
    liftedAt: new Date(),
    liftedBy: "333"
  };

  const liftedPayload = ModerationUI.formatCezaPayload(liftedPenalty);
  assert.ok(getV2Text(liftedPayload).includes("Kaldırıldı"));
});

test("ModerationUI builders produce valid ActionRows", () => {
  const punishRow = ModerationUI.buildPunishActionRow("BAN", "123", 5);
  assert.equal(punishRow.components.length, 2);
  assert.equal(punishRow.components[0].data.custom_id, "mod_unpunish:BAN:123:5");

  const lockRow = ModerationUI.buildLockActionRow(false);
  assert.equal(lockRow.components.length, 3);
  assert.equal(lockRow.components[0].data.custom_id, "mod_lock_toggle");

  const slowmodeRow = ModerationUI.buildSlowmodeActionRow(5);
  assert.equal(slowmodeRow.components.length, 5);
  assert.equal(slowmodeRow.components[1].data.custom_id, "mod_slowmode:5");

  const warnRow = ModerationUI.buildWarnActionRow("123", true);
  assert.equal(warnRow.components.length, 3);

  const snipePayload = ModerationUI.buildSnipePayload({ authorId: "123", content: "Test msg", timestamp: Date.now() }, "c1");
  assert.ok(getV2Text(snipePayload).includes("Son Silinen Mesaj"));
  assert.equal(snipePayload.components[0].components.length, 2);
});
