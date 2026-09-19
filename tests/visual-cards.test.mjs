import test from "node:test";
import assert from "node:assert/strict";
import { VisualCard } from "../packages/core/src/VisualCard.js";

test("VisualCard renderTopCoinCard produces valid PNG buffer", async () => {
  const guild = { name: "Test Sunucusu" };
  const enrichedUsers = [
    { userId: "1001", tag: "Zengin#0001", total: 50000 },
    { userId: "1002", tag: "Orta#0002", total: 25000 }
  ];

  const buffer = await VisualCard.renderTopCoinCard({ guild, enrichedUsers });
  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
});

test("VisualCard renderUserStatCard produces valid PNG buffer", async () => {
  const user = { id: "1001", username: "AktifUye" };
  const buffer = await VisualCard.renderUserStatCard({
    user,
    periodText: "Haftalık",
    voiceHours: 12,
    messageCount: 450,
    level: 5,
    rank: 2
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
});

test("VisualCard renderTopStatCard produces valid PNG buffer for voice and message", async () => {
  const guild = { name: "Test Sunucusu" };
  const ranking = [
    { userId: "1001", tag: "SesKrali#0001", value: 30, formattedValue: "30 Saat" }
  ];

  const voiceBuffer = await VisualCard.renderTopStatCard({ guild, ranking, type: "voice" });
  assert.ok(Buffer.isBuffer(voiceBuffer));
  assert.ok(voiceBuffer.length > 5000);

  const msgBuffer = await VisualCard.renderTopStatCard({ guild, ranking, type: "message" });
  assert.ok(Buffer.isBuffer(msgBuffer));
  assert.ok(msgBuffer.length > 5000);
});

test("VisualCard renderCoinWalletCard produces valid PNG buffer", async () => {
  const user = { id: "1001", username: "CuzdanSahibi" };
  const buffer = await VisualCard.renderCoinWalletCard({ user, wallet: 15000, bank: 35000 });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
});

test("VisualCard renderLevelCard produces valid PNG buffer", async () => {
  const user = { id: "1001", username: "LevelUye" };
  const buffer = await VisualCard.renderLevelCard({
    user,
    level: 8,
    currentXp: 1400,
    requiredXp: 2000,
    rank: 3
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
});

test("VisualCard renderSayCard produces valid PNG buffer", async () => {
  const guild = { name: "Test Sunucusu" };
  const buffer = await VisualCard.renderSayCard({
    guild,
    totalMembers: 1250,
    voiceCount: 45,
    humanCount: 1200,
    botCount: 50,
    boostCount: 14,
    boostTier: 3
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
});

test("VisualCard renderLevelUpCard produces valid PNG buffer", async () => {
  const user = { id: "1001", username: "LevelUpUye" };
  const buffer = await VisualCard.renderLevelUpCard({
    user,
    newLevel: 10,
    rewardRole: "VIP Uye",
    theme: "sakura"
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
});

test("VisualCard renderBlackjackTable produces valid PNG buffer", () => {
  const buffer = VisualCard.renderBlackjackTable({
    playerHand: ["10♠", "A♥"],
    dealerHand: ["K♦", "8♣"],
    playerTotal: 21,
    dealerTotal: 18,
    bet: 500,
    status: "won",
    balance: 10000
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
});

test("VisualCard renderSlotMachine produces valid PNG buffer", () => {
  const buffer = VisualCard.renderSlotMachine({
    reel1: "7️⃣",
    reel2: "7️⃣",
    reel3: "7️⃣",
    won: true,
    multiplier: 10,
    amount: 5000,
    balance: 15000,
    bet: 500
  });

  assert.ok(Buffer.isBuffer(buffer));
  assert.ok(buffer.length > 5000);
});

test("VisualCard getThemeSetsList returns valid sets", () => {
  const sets = VisualCard.getThemeSetsList();
  assert.ok(Array.isArray(sets));
  assert.ok(sets.length >= 5);
});

test("VisualCard renderAnimatedUserStatCard produces valid GIF and MP4 buffers", async () => {
  const user = { id: "1001", username: "AnimUser" };
  const gifBuffer = await VisualCard.renderAnimatedUserStatCard({
    user,
    periodText: "Haftalık",
    voiceHours: 20,
    messageCount: 500,
    level: 10,
    rank: 1,
    theme: "sakura",
    format: "gif"
  });

  assert.ok(Buffer.isBuffer(gifBuffer));
  assert.ok(gifBuffer.length > 20000);

  const mp4Buffer = await VisualCard.renderAnimatedUserStatCard({
    user,
    periodText: "Haftalık",
    voiceHours: 20,
    messageCount: 500,
    level: 10,
    rank: 1,
    theme: "sakura",
    format: "mp4"
  });

  assert.ok(Buffer.isBuffer(mp4Buffer));
  assert.ok(mp4Buffer.length > 20000);
});

test("VisualCard renderAnimatedLevelCard produces valid looping GIF buffer", async () => {
  const user = { id: "1001", username: "LevelAnim" };
  const gifBuffer = await VisualCard.renderAnimatedLevelCard({
    user,
    level: 7,
    currentXp: 2400,
    requiredXp: 4900,
    rank: 3,
    theme: "cyberpunk",
    format: "gif"
  });

  assert.ok(Buffer.isBuffer(gifBuffer));
  assert.ok(gifBuffer.length > 20000);
});

test("VisualCard renderAnimatedCoinCard produces valid looping GIF buffer", async () => {
  const user = { id: "1001", username: "CoinAnim" };
  const gifBuffer = await VisualCard.renderAnimatedCoinCard({
    user,
    wallet: 45000,
    bank: 120000,
    theme: "sunset",
    format: "gif"
  });

  assert.ok(Buffer.isBuffer(gifBuffer));
  assert.ok(gifBuffer.length > 20000);
});

test("VisualCard renderAnimatedCard router dispatches correctly", async () => {
  const user = { id: "1001", username: "RouterUser" };
  const buf = await VisualCard.renderAnimatedCard({
    type: "coin",
    data: { user, wallet: 1000, bank: 2000 },
    theme: "sakura",
    format: "gif"
  });
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 10000);
});

test("VisualCard drawThemeAnimatedBackground renders distinctive anime background effects", async () => {
  const user = { id: "1001", username: "RainUser" };
  const buf = await VisualCard.renderAnimatedCard({
    type: "level",
    data: { user, level: 5, currentXp: 1200, requiredXp: 2500, rank: 1 },
    theme: "lofi-rain",
    format: "gif"
  });
  assert.ok(Buffer.isBuffer(buf));
  assert.ok(buf.length > 15000);
});
