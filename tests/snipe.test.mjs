import test from "node:test";
import assert from "node:assert/strict";
import { ModerationUI } from "../apps/moderation/src/services/ModerationUI.js";

function getV2Text(payload) {
  return payload?.components?.[0]?.components?.[0]?.content || "";
}

test("ModerationUI buildSnipePayload handles single deleted message", () => {
  const sniped = { authorId: "1001", content: "Silinen deneme mesaji", timestamp: 1710000000000 };
  const payload = ModerationUI.buildSnipePayload(sniped, "ch123");

  assert.ok(getV2Text(payload).includes("Son Silinen Mesaj"));
  assert.ok(getV2Text(payload).includes("Silinen deneme mesaji"));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("ModerationUI buildSnipePayload handles multiple records with pagination buttons", () => {
  const records = [
    { authorId: "1001", content: "Son silinen", deletedAt: new Date(1710001000000) },
    { authorId: "1002", content: "Daha once silinen", deletedAt: new Date(1710000000000) }
  ];

  const payloadFirstPage = ModerationUI.buildSnipePayload({
    type: "delete",
    records,
    index: 0,
    channelId: "ch123"
  });

  assert.ok(getV2Text(payloadFirstPage).includes("1/2"));
  assert.ok(getV2Text(payloadFirstPage).includes("Son silinen"));

  const actionRow = payloadFirstPage.components[0].components[1];
  assert.equal(actionRow.components.length, 4);
  assert.equal(Boolean(actionRow.components[0].disabled), true);
  assert.equal(Boolean(actionRow.components[1].disabled), false);

  const payloadSecondPage = ModerationUI.buildSnipePayload({
    type: "delete",
    records,
    index: 1,
    channelId: "ch123"
  });

  assert.ok(getV2Text(payloadSecondPage).includes("2/2"));
  assert.ok(getV2Text(payloadSecondPage).includes("Daha once silinen"));

  const row2 = payloadSecondPage.components[0].components[1];
  assert.equal(Boolean(row2.components[0].disabled), false);
  assert.equal(Boolean(row2.components[1].disabled), true);
});

test("ModerationUI buildSnipePayload handles edited message records", () => {
  const records = [
    {
      authorId: "1001",
      content: "Yeni duzenlenmis mesaj",
      previousContent: "Eski orijinal mesaj",
      editedAt: new Date(1710002000000)
    }
  ];

  const payload = ModerationUI.buildSnipePayload({
    type: "edit",
    records,
    index: 0,
    channelId: "ch123"
  });

  assert.ok(getV2Text(payload).includes("Düzenlenen Mesaj Kayıtları"));
  assert.ok(getV2Text(payload).includes("Eski orijinal mesaj"));
  assert.ok(getV2Text(payload).includes("Yeni duzenlenmis mesaj"));
});

test("ModerationUI buildSnipePayload handles empty records with toggle button", () => {
  const emptyDeletePayload = ModerationUI.buildSnipePayload({
    type: "delete",
    records: [],
    channelId: "ch123"
  });

  assert.ok(getV2Text(emptyDeletePayload).includes("Silinen Mesaj Kaydı Yok"));

  const emptyEditPayload = ModerationUI.buildSnipePayload({
    type: "edit",
    records: [],
    channelId: "ch123"
  });

  assert.ok(getV2Text(emptyEditPayload).includes("Düzenlenen Mesaj Kaydı Yok"));
});
