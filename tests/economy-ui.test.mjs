import test from "node:test";
import assert from "node:assert/strict";
import { EconomyUI } from "../apps/economy/src/services/EconomyUI.js";

function getV2Text(payload) {
  return payload?.components?.[0]?.components?.[0]?.content || "";
}

test("EconomyUI formatCoinPayload renders wallet, bank and quick action buttons", () => {
  const dummyUser = { id: "1001", tag: "user#0001" };
  const profile = { wallet: 5000, bank: 15000 };

  const payload = EconomyUI.formatCoinPayload({ targetUser: dummyUser, profile });
  assert.ok(getV2Text(payload).includes("Bakiye & Finansal Durum"));
  assert.ok(getV2Text(payload).includes("5.000 Coin"));
  assert.ok(getV2Text(payload).includes("15.000 Coin"));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("EconomyUI formatTopCoinPayload handles leaderboard rows and buttons", () => {
  const guild = { name: "TestGuild" };
  const enriched = [
    { userId: "1", total: 100000 },
    { userId: "2", total: 75000 }
  ];

  const payload = EconomyUI.formatTopCoinPayload({ guild, enriched });
  assert.ok(getV2Text(payload).includes("Sunucu En Zenginleri"));
  assert.ok(getV2Text(payload).includes("100.000 Coin"));
  assert.equal(payload.components[0].components.length, 2);
});

test("EconomyUI formatBlackjackTablePayload handles active and finished state", () => {
  const activePayload = EconomyUI.formatBlackjackTablePayload({
    bet: 100,
    playerCards: ["K", "8"],
    playerTotal: 18,
    dealerCards: ["10", "7"],
    isFinished: false
  });

  assert.ok(getV2Text(activePayload).includes("Blackjack"));
  assert.ok(getV2Text(activePayload).includes("K • 8"));
  assert.equal(activePayload.components[0].components.length, 2);

  const finishedPayload = EconomyUI.formatBlackjackTablePayload({
    bet: 100,
    playerCards: ["K", "8"],
    playerTotal: 18,
    dealerCards: ["10", "7"],
    isFinished: true,
    resultText: "Kazandınız!"
  });

  assert.ok(getV2Text(finishedPayload).includes("Kazandınız!"));
  assert.equal(finishedPayload.components[0].components.length, 1);
});

test("EconomyUI formatDailySuccessPayload renders reward and buttons", () => {
  const dummyUser = { id: "1001" };
  const payload = EconomyUI.formatDailySuccessPayload({
    targetUser: dummyUser,
    reward: 250,
    balance: 5250
  });

  assert.ok(getV2Text(payload).includes("Günlük Ödül Alındı"));
  assert.ok(getV2Text(payload).includes("+250 Coin"));
  assert.equal(payload.components[0].components.length, 2);
});

test("ItemMarketCatalog resolves tools and defense equipment accurately", async () => {
  const { getItemByKey, MARKET_ITEMS } = await import("../apps/economy/src/services/ItemMarketCatalog.js");
  assert.ok(MARKET_ITEMS.length >= 6);

  const olta = getItemByKey("item_olta");
  assert.equal(olta?.name, "Titanyum Olta");
  assert.equal(olta?.type, "TOOL");

  const kazma = getItemByKey("kazma");
  assert.equal(kazma?.name, "Elmas Madenci Kazması");
  assert.equal(kazma?.price, 3500);

  const kalkan = getItemByKey("item_kalkan");
  assert.equal(kalkan?.name, "Çelik Güvenlik Kalkanı");
  assert.equal(kalkan?.type, "DEFENSE");

  const kutu = getItemByKey("kutu");
  assert.equal(kutu?.name, "Gizemli Şans Sandığı");
  assert.equal(kutu?.type, "CHEST");

  const maymuncuk = getItemByKey("item_maymuncuk");
  assert.equal(maymuncuk?.name, "Usta Hırsız Maymuncuğu");

  assert.ok(MARKET_ITEMS.length >= 10);

  const notFound = getItemByKey("olmayan_esya");
  assert.equal(notFound, undefined);
});

test("ItemMarketCatalog applies custom guild prices, discounts and disabled states", async () => {
  const { getItemByKey, getItemsForGuild } = await import("../apps/economy/src/services/ItemMarketCatalog.js");

  const dummyGuildConfig = {
    itemPrices: { item_olta: 1200 },
    disabledItems: ["item_kalkan"],
    economyMarket: { discountPercent: 10 }
  };

  const olta = getItemByKey("item_olta", dummyGuildConfig);
  assert.equal(olta?.price, 1080);
  assert.equal(olta?.disabled, false);

  const kalkan = getItemByKey("item_kalkan", dummyGuildConfig);
  assert.equal(kalkan?.disabled, true);

  const activeItems = getItemsForGuild(dummyGuildConfig, false);
  assert.ok(!activeItems.some(i => i.itemKey === "item_kalkan"));

  const allItems = getItemsForGuild(dummyGuildConfig, true);
  assert.ok(allItems.some(i => i.itemKey === "item_kalkan"));
});
