import test from "node:test";
import assert from "node:assert/strict";
import { StatsUI } from "../apps/stats/src/services/StatsUI.js";

function getV2Text(payload) {
  return payload?.components?.[0]?.components?.[0]?.content || "";
}

test("StatsUI formatUserStatPayload renders correct period and buttons", () => {
  const dummyUser = { id: "101", tag: "user#0001" };
  const stat = {
    totalVoiceMs: 3600000,
    weeklyVoiceMs: 1800000,
    dailyVoiceMs: 600000,
    totalMessages: 100,
    weeklyMessages: 50,
    dailyMessages: 10,
    xp: 500,
    level: 2
  };

  const payload = StatsUI.formatUserStatPayload({
    targetUser: dummyUser,
    stat,
    period: "all"
  });

  assert.ok(getV2Text(payload).includes("Aktivite ve İstatistik"));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("StatsUI formatTopStatPayload switches categories", () => {
  const guild = { name: "TestSunucu" };
  const sampleVoice = [{ userId: "1", totalVoiceMs: 5000000, level: 3 }];
  const sampleMsgs = [{ userId: "2", totalMessages: 120, level: 2 }];

  const voicePayload = StatsUI.formatTopStatPayload({
    guild,
    topVoice: sampleVoice,
    topMessages: sampleMsgs,
    category: "voice"
  });

  assert.ok(getV2Text(voicePayload).includes("En Çok Seste Kalanlar"));

  const msgPayload = StatsUI.formatTopStatPayload({
    guild,
    topVoice: sampleVoice,
    topMessages: sampleMsgs,
    category: "messages"
  });

  assert.ok(getV2Text(msgPayload).includes("En Çok Mesaj Gönderenler"));
});

test("StatsUI formatLevelPayload and formatTaskPayload", () => {
  const member = { displayName: "Ahmet", id: "101" };
  const stat = { level: 3, xp: 950 };
  const nextReward = { level: 5, roleId: "999" };

  const levelPayload = StatsUI.formatLevelPayload({
    targetMember: member,
    stat,
    rank: 1,
    totalRanked: 10,
    nextReward
  });

  assert.ok(getV2Text(levelPayload).includes("Seviye ve Deneyim Kartı"));
  assert.ok(getV2Text(levelPayload).includes("<@&999>"));

  const taskPayload = StatsUI.formatTaskPayload({
    targetUser: { id: "101", tag: "user#0001" },
    task: { points: 15 },
    currentVoiceHours: 5,
    targetVoiceHours: 10,
    currentMsgs: 250,
    targetMsgs: 500,
    currentRegs: 2,
    targetRegs: 5
  });

  assert.ok(getV2Text(taskPayload).includes("Haftalık Görev Durumu"));
  assert.ok(getV2Text(taskPayload).includes("15 Puan"));
});
