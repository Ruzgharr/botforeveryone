import test from "node:test";
import assert from "node:assert/strict";
import { PetService } from "../apps/economy/src/services/PetService.js";
import { DatabaseManager, Pet, Economy, GuildConfig } from "@bot/database";

await DatabaseManager.connect(":memory:", { provider: "SQLITE" });

test("PetService adoptPet validates funds and creates pet", async () => {
  const guildId = "test-pet-guild-1";
  const userId = "test-pet-user-1";

  await Economy.create({ guildId, userId, wallet: 10000 });

  const failResult = await PetService.adoptPet({
    guildId,
    userId,
    petType: "dragon"
  });
  assert.equal(failResult.success, false);
  assert.ok(failResult.message.includes("Yetersiz"));

  const successResult = await PetService.adoptPet({
    guildId,
    userId,
    petType: "kitsune",
    customName: "Kyuubi"
  });
  assert.equal(successResult.success, true);
  assert.equal(successResult.pet.petType, "kitsune");
  assert.equal(successResult.pet.name, "Kyuubi");
  assert.equal(successResult.pet.isActive, true);

  const ecoAfter = await Economy.findOne({ guildId, userId });
  assert.equal(ecoAfter.wallet, 2000);
});

test("PetService feedPet restores energy and trains pet for XP", async () => {
  const guildId = "test-pet-guild-2";
  const userId = "test-pet-user-2";

  await Economy.create({ guildId, userId, wallet: 50000 });
  const adoptRes = await PetService.adoptPet({
    guildId,
    userId,
    petType: "owl"
  });
  assert.equal(adoptRes.success, true);

  adoptRes.pet.energy = 15;
  await adoptRes.pet.save();

  const feedRes = await PetService.feedPet({ guildId, userId });
  assert.equal(feedRes.success, true);
  assert.equal(feedRes.pet.energy, 100);

  const trainRes = await PetService.trainPet({ guildId, userId });
  assert.equal(trainRes.success, true);
  assert.equal(trainRes.pet.xp, 50);
  assert.equal(trainRes.pet.energy, 80);
});

test("PetService calculateBonus returns active pet modifiers", async () => {
  const guildId = "test-pet-guild-3";
  const userId = "test-pet-user-3";

  await Economy.create({ guildId, userId, wallet: 30000 });
  await PetService.adoptPet({ guildId, userId, petType: "kitsune" });

  const bonus = await PetService.calculateBonus(guildId, userId, "gambling");
  assert.equal(bonus.active, true);
  assert.ok(bonus.bonusPct >= 10);

  const gatheringBonus = await PetService.calculateBonus(guildId, userId, "gathering");
  assert.equal(gatheringBonus.active, false);
});
