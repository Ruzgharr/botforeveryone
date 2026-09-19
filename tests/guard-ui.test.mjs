import test from "node:test";
import assert from "node:assert/strict";
import { GuardUI } from "../apps/guard-main/src/services/GuardUI.js";

function getV2Text(payload) {
  return payload?.components?.[0]?.components?.[0]?.content || "";
}

test("GuardUI formatStatusPayload renders security shields and action buttons", () => {
  const config = {
    guard: { active: true, blockBots: true, blockWebhooks: true, safeUsers: ["1"], safeRoles: ["2"], safeBots: ["3"] },
    guardPanic: { enabled: true, threshold: 5, timeWindowMs: 5000 },
    permissionAudit: { enabled: true }
  };

  const backup = {
    _id: "65abc1234567890123456789",
    type: "MANUAL",
    createdAt: new Date()
  };

  const payload = GuardUI.formatStatusPayload({ config, latestBackup: backup });
  assert.ok(getV2Text(payload).includes("Sunucu Güvenlik & Guard Durumu"));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("GuardUI formatBackupListPayload handles empty and filled backup lists", () => {
  const emptyPayload = GuardUI.formatBackupListPayload([]);
  assert.ok(getV2Text(emptyPayload).includes("kayıtlı bir yedek bulunmuyor"));
  assert.equal(emptyPayload.components[0].components.length, 2);

  const sampleList = [
    {
      _id: "65abc1234567890123456789",
      type: "MANUAL",
      roles: [{ id: "r1" }],
      channels: [{ id: "c1" }],
      createdAt: new Date()
    }
  ];

  const filledPayload = GuardUI.formatBackupListPayload(sampleList);
  assert.ok(getV2Text(filledPayload).includes("Sunucu Yedek Listesi"));
  assert.ok(getV2Text(filledPayload).includes("65abc1234567890123456789"));
});

test("GuardUI formatBackupCreatedPayload generates restore and list buttons", () => {
  const backup = {
    _id: "65abc1234567890123456789",
    type: "MANUAL",
    roles: [{ id: "r1" }, { id: "r2" }],
    channels: [{ id: "c1" }],
    createdAt: new Date()
  };

  const payload = GuardUI.formatBackupCreatedPayload(backup);
  assert.ok(getV2Text(payload).includes("Sunucu Yedekleme Tamamlandı"));
  assert.equal(payload.components[0].components.length, 2);
});
