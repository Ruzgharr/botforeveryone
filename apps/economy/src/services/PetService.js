import { Pet, Economy } from "@bot/database";

export class PetService {
  static PET_CATALOG = [
    {
      type: "kitsune",
      name: "Mistik Kitsune",
      emoji: "🦊",
      price: 8000,
      desc: "Kumarhane ve şans oyunlarında +%10 kazanma şansı",
      bonusType: "gambling",
      bonusPct: 10
    },
    {
      type: "dragon",
      name: "Ateş Ejderhası",
      emoji: "🐉",
      price: 15000,
      desc: "Madencilik ve balıkçılıkta 2 kat kazanç",
      bonusType: "gathering",
      multiplier: 2
    },
    {
      type: "cat",
      name: "Siber Kedi",
      emoji: "🐈",
      price: 6000,
      desc: "Çalışma ve madende +250 Coin pasif kazanç",
      bonusType: "passive",
      bonusCoin: 250
    },
    {
      type: "owl",
      name: "Ruh Baykuşu",
      emoji: "🦉",
      price: 10000,
      desc: "Ses kanallarında kazanılan XP'yi %25 artırır",
      bonusType: "voice_xp",
      bonusPct: 25
    },
    {
      type: "wolf",
      name: "Gölge Kurdu",
      emoji: "🐺",
      price: 12000,
      desc: "Soygun başarı oranını %20 artırır",
      bonusType: "robbery",
      bonusPct: 20
    }
  ];

  static getCatalog(config = {}) {
    const basePrice = config.petSystem?.basePrice || null;
    return this.PET_CATALOG.map((p) => {
      const price = basePrice ? Math.round((p.price / 8000) * basePrice) : p.price;
      return { ...p, price };
    });
  }

  static getPetInfo(type) {
    return this.PET_CATALOG.find((p) => p.type.toLowerCase() === String(type).toLowerCase()) || null;
  }

  static async getUserPets(guildId, userId) {
    return await Pet.find({ guildId, userId }).sort({ level: -1 });
  }

  static async getActivePet(guildId, userId) {
    const pet = await Pet.findOne({ guildId, userId, isActive: true });
    if (!pet) return null;

    const now = Date.now();
    const lastFedTs = pet.lastFed ? new Date(pet.lastFed).getTime() : now;
    const hoursElapsed = Math.floor((now - lastFedTs) / (1000 * 60 * 60));
    if (hoursElapsed > 0) {
      const energyLoss = hoursElapsed * 5;
      pet.energy = Math.max(0, pet.energy - energyLoss);
      await pet.save();
    }

    return pet;
  }

  static async adoptPet({ guildId, userId, petType, customName = null, config = {} }) {
    const catalog = this.getCatalog(config);
    const petMeta = catalog.find((p) => p.type.toLowerCase() === String(petType).toLowerCase());
    if (!petMeta) {
      return { success: false, message: "Geçersiz pet türü. Türler: `kitsune`, `dragon`, `cat`, `owl`, `wolf`" };
    }

    let eco = await Economy.findOne({ guildId, userId }) || await Economy.create({ guildId, userId });
    if (eco.wallet < petMeta.price) {
      return {
        success: false,
        message: `Yetersiz bakiye! Bu evcil hayvan **${petMeta.price.toLocaleString("tr-TR")} Coin** gerektirir. (Cüzdan: ${eco.wallet.toLocaleString("tr-TR")} Coin)`
      };
    }

    const existingOfType = await Pet.findOne({ guildId, userId, petType: petMeta.type });
    if (existingOfType) {
      return { success: false, message: `Bu türde (**${petMeta.name}**) bir evcil hayvana zaten sahipsiniz!` };
    }

    eco.wallet -= petMeta.price;
    await eco.save();

    const activeCount = await Pet.countDocuments({ guildId, userId, isActive: true });
    const isFirst = activeCount === 0;

    const pet = await Pet.create({
      guildId,
      userId,
      petType: petMeta.type,
      name: customName || petMeta.name,
      level: 1,
      xp: 0,
      energy: 100,
      lastFed: new Date(),
      isActive: isFirst
    });

    return { success: true, pet, meta: petMeta };
  }

  static async feedPet({ guildId, userId, petId = null, config = {} }) {
    let pet = null;
    if (petId) {
      pet = await Pet.findById(petId);
    } else {
      pet = await this.getActivePet(guildId, userId);
    }

    if (!pet || pet.userId !== userId) {
      return { success: false, message: "Beslenecek evcil hayvan bulunamadı." };
    }

    const feedCost = config.petSystem?.feedCost || 200;
    let eco = await Economy.findOne({ guildId, userId }) || await Economy.create({ guildId, userId });
    if (eco.wallet < feedCost) {
      return { success: false, message: `Evcil hayvan yemi için **${feedCost} Coin** gereklidir.` };
    }

    if (pet.energy >= 100) {
      return { success: false, message: "Evcil hayvanınız zaten tamamen tok ve enerjisi dolu!" };
    }

    eco.wallet -= feedCost;
    await eco.save();

    pet.energy = 100;
    pet.lastFed = new Date();
    await pet.save();

    return { success: true, pet, feedCost };
  }

  static async trainPet({ guildId, userId, petId = null }) {
    let pet = null;
    if (petId) {
      pet = await Pet.findById(petId);
    } else {
      pet = await this.getActivePet(guildId, userId);
    }

    if (!pet || pet.userId !== userId) {
      return { success: false, message: "Eğitilecek evcil hayvan bulunamadı." };
    }

    if (pet.level >= 10) {
      return { success: false, message: "Evcil hayvanınız maksimum seviyeye (Seviye 10) ulaştı!" };
    }

    if (pet.energy < 20) {
      return { success: false, message: "Evcil hayvanınız çok yorgun (Enerji < 20). Önce `.pet besle` ile besleyin." };
    }

    pet.energy = Math.max(0, pet.energy - 20);
    const gainedXp = 50;
    pet.xp += gainedXp;
    const reqXp = pet.level * 150;
    let leveledUp = false;

    if (pet.xp >= reqXp) {
      pet.level += 1;
      pet.xp -= reqXp;
      leveledUp = true;
    }

    await pet.save();
    return { success: true, pet, gainedXp, leveledUp };
  }

  static async setActivePet({ guildId, userId, targetTypeOrId }) {
    const pets = await Pet.find({ guildId, userId });
    if (!pets || pets.length === 0) {
      return { success: false, message: "Henüz hiçbir evcil hayvana sahip değilsiniz. `.pet market` ile edinebilirsiniz." };
    }

    const selected = pets.find((p) => p.petType.toLowerCase() === targetTypeOrId.toLowerCase() || String(p._id) === targetTypeOrId);
    if (!selected) {
      return { success: false, message: "Belirtilen evcil hayvan bulunamadı." };
    }

    for (const p of pets) {
      p.isActive = String(p._id) === String(selected._id);
      await p.save();
    }

    return { success: true, pet: selected };
  }

  static async calculateBonus(guildId, userId, bonusCategory) {
    const activePet = await this.getActivePet(guildId, userId);
    if (!activePet || activePet.energy <= 0) return { active: false, multiplier: 1, bonusCoin: 0, bonusPct: 0 };

    const meta = this.getPetInfo(activePet.petType);
    if (!meta || meta.bonusType !== bonusCategory) return { active: false, multiplier: 1, bonusCoin: 0, bonusPct: 0 };

    const levelMultiplier = 1 + (activePet.level - 1) * 0.15;

    return {
      active: true,
      pet: activePet,
      meta,
      multiplier: meta.multiplier ? meta.multiplier * levelMultiplier : 1,
      bonusCoin: meta.bonusCoin ? Math.round(meta.bonusCoin * levelMultiplier) : 0,
      bonusPct: meta.bonusPct ? Math.round(meta.bonusPct * levelMultiplier) : 0
    };
  }
}
