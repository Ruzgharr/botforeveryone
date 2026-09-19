import test from "node:test";
import assert from "node:assert/strict";
import { RegisterUI } from "../apps/register/src/services/RegisterUI.js";

function getV2Text(payload) {
  return payload?.components?.[0]?.components?.[0]?.content || "";
}

test("RegisterUI formatRegisterPrompt generates selection buttons", () => {
  const dummyMember = { id: "1001", user: { tag: "test#0001" } };
  const staff = { id: "2002", tag: "staff#0001" };

  const payload = RegisterUI.formatRegisterPrompt({
    targetMember: dummyMember,
    name: "Ahmet",
    age: 20,
    formattedNick: "Ahmet | 20",
    staffUser: staff
  });

  assert.ok(getV2Text(payload).includes("Cinsiyet Seçimi"));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("RegisterUI formatRegisterSuccess generates unregister and names buttons", () => {
  const dummyMember = { id: "1001" };
  const staff = { id: "2002" };

  const payload = RegisterUI.formatRegisterSuccess({
    targetMember: dummyMember,
    staffUser: staff,
    roleLabel: "Erkek",
    name: "Ahmet",
    age: 20
  });

  assert.ok(getV2Text(payload).includes("Kayıt Tamamlandı"));
  assert.equal(payload.components[0].components.length, 2);
});

test("RegisterUI formatNamesHistoryPayload handles empty and paginated states", () => {
  const dummyUser = { id: "1001", tag: "test#0001" };

  const emptyPayload = RegisterUI.formatNamesHistoryPayload({
    targetUser: dummyUser,
    namesHistory: [],
    page: 1
  });

  assert.ok(getV2Text(emptyPayload).includes("eski isim geçmişi bulunmuyor"));

  const sampleHistory = [
    { name: "Mehmet", age: 19, roleAssigned: "Erkek", staffId: "2002", date: new Date() },
    { name: "Mehmetcan", age: 20, roleAssigned: "Erkek", staffId: "2002", date: new Date() }
  ];

  const filledPayload = RegisterUI.formatNamesHistoryPayload({
    targetUser: dummyUser,
    namesHistory: sampleHistory,
    page: 1
  });

  assert.ok(getV2Text(filledPayload).includes("İsim Geçmişi"));
  assert.equal(filledPayload.components[0].components.length, 2);
});

test("RegisterUI formatSayPayload, formatDavetPayload and formatVerifyPanel", () => {
  const sayPayload = RegisterUI.formatSayPayload({
    guild: { name: "TestGuild" },
    total: 100,
    tagged: 20,
    voice: 15,
    boosts: 5
  });
  assert.ok(getV2Text(sayPayload).includes("Sunucu Genel İstatistikleri"));
  assert.equal(sayPayload.components[0].components.length, 2);

  const davetPayload = RegisterUI.formatDavetPayload({
    targetUser: { id: "1001", tag: "test#0001" },
    total: 10,
    regular: 8,
    fake: 1,
    bonus: 3,
    leaves: 1
  });
  assert.ok(getV2Text(davetPayload).includes("Davet İstatistikleri"));

  const verifyPayload = RegisterUI.formatVerifyPanel();
  assert.ok(getV2Text(verifyPayload).includes("Sunucu Güvenlik Doğrulaması"));
});
