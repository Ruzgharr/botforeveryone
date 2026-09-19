import test from "node:test";
import assert from "node:assert/strict";
import { UtilityUI } from "../apps/utility/src/services/UtilityUI.js";

function getV2Text(payload) {
  return payload?.components?.[0]?.components?.[0]?.content || "";
}

test("UtilityUI formatAvatarPayload renders avatar URL and navigation buttons", () => {
  const dummyUser = { id: "1001", tag: "tester#0001", username: "tester" };
  const avatarUrl = "https://cdn.discordapp.com/avatars/1001/avatar.png";

  const payload = UtilityUI.formatAvatarPayload({ targetUser: dummyUser, avatarUrl });
  assert.ok(getV2Text(payload).includes("Profil Fotoğrafı"));
  assert.ok(getV2Text(payload).includes(avatarUrl));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("UtilityUI formatBannerPayload renders banner URL and navigation buttons", () => {
  const dummyUser = { id: "1001", tag: "tester#0001", username: "tester" };
  const bannerUrl = "https://cdn.discordapp.com/banners/1001/banner.png";

  const payload = UtilityUI.formatBannerPayload({ targetUser: dummyUser, bannerUrl });
  assert.ok(getV2Text(payload).includes("Profil Afişi"));
  assert.ok(getV2Text(payload).includes(bannerUrl));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("UtilityUI formatServerPayload renders server details and action buttons", () => {
  const guild = {
    id: "9999",
    name: "Örnek Topluluk",
    channels: { cache: { size: 12 } },
    iconURL: () => "https://cdn.discordapp.com/icons/9999/icon.png",
    bannerURL: () => null
  };
  const owner = { id: "1001", displayName: "SunucuSahibi" };

  const payload = UtilityUI.formatServerPayload({
    guild,
    owner,
    totalMembers: 1500,
    humanCount: 1450,
    botCount: 50,
    textChannels: 8,
    voiceChannels: 3,
    categories: 1,
    roleCount: 25,
    emojiCount: 30,
    boostTier: 2,
    boostCount: 7,
    createdTimestamp: 1700000000
  });

  assert.ok(getV2Text(payload).includes("Örnek Topluluk - Sunucu Bilgileri"));
  assert.ok(getV2Text(payload).includes("1.500"));
  assert.ok(getV2Text(payload).includes("Seviye 2"));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("UtilityUI formatUserPayload renders member profile and detail buttons", () => {
  const user = { id: "2002", tag: "member#0001", username: "member", bot: false };
  const targetMember = {
    roles: { highest: "<@&8888>", size: 4 },
    premiumSince: null
  };

  const payload = UtilityUI.formatUserPayload({
    targetMember,
    user,
    joinedServerTs: 1710000000,
    createdAccountTs: 1690000000,
    roles: { size: 4 },
    rolesStr: "<@&8888> <@&8889>",
    voiceStatus: "Ses kanalında bulunmuyor",
    keyPermissions: ["Yönetici", "Rolleri Yönet"]
  });

  assert.ok(getV2Text(payload).includes("Kullanıcı Profili: member#0001"));
  assert.ok(getV2Text(payload).includes("Yönetici, Rolleri Yönet"));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});

test("UtilityUI formatPingPayload renders system metrics and refresh button", () => {
  const payload = UtilityUI.formatPingPayload({
    wsPing: 35,
    msgPing: 42,
    dbPing: 12,
    hours: 5,
    minutes: 30,
    statusText: "🟢 Mükemmel"
  });

  assert.ok(getV2Text(payload).includes("Sistem Gecikme & Performans Raporu"));
  assert.ok(getV2Text(payload).includes("35 ms"));
  assert.ok(getV2Text(payload).includes("5 saat 30 dakika"));
  assert.equal(payload.flags, 32768);
  assert.equal(payload.components[0].components.length, 2);
});
