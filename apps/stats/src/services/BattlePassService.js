import { BattlePass, UserBattlePass, Economy, Stat } from "@bot/database";

export class BattlePassService {
  static async getOrCreateSeason(guildId) {
    let season = await BattlePass.findOne({ guildId, active: true });
    if (!season) {
      const defaultTiers = [
        { level: 1, requiredXp: 100, freeReward: { type: "COIN", name: "1.000 Coin", amount: 1000 }, vipReward: { type: "COIN", name: "3.000 Coin + Enerji İksiri", amount: 3000, itemId: "item_enerji" } },
        { level: 2, requiredXp: 250, freeReward: { type: "COIN", name: "1.500 Coin", amount: 1500 }, vipReward: { type: "COIN", name: "4.000 Coin + Titanyum Olta", amount: 4000, itemId: "item_olta" } },
        { level: 3, requiredXp: 450, freeReward: { type: "COIN", name: "2.000 Coin", amount: 2000 }, vipReward: { type: "COIN", name: "5.000 Coin + Kadim XP İksiri", amount: 5000, itemId: "item_xppot" } },
        { level: 4, requiredXp: 700, freeReward: { type: "COIN", name: "2.500 Coin", amount: 2500 }, vipReward: { type: "COIN", name: "6.000 Coin + Elmas Kazma", amount: 6000, itemId: "item_kazma" } },
        { level: 5, requiredXp: 1000, freeReward: { type: "COIN", name: "3.000 Coin", amount: 3000 }, vipReward: { type: "COIN", name: "8.000 Coin + Şans Sandığı", amount: 8000, itemId: "item_kutu" } },
        { level: 6, requiredXp: 1350, freeReward: { type: "COIN", name: "3.500 Coin", amount: 3500 }, vipReward: { type: "COIN", name: "10.000 Coin + Güvenlik Kalkanı", amount: 10000, itemId: "item_kalkan" } },
        { level: 7, requiredXp: 1750, freeReward: { type: "COIN", name: "4.000 Coin", amount: 4000 }, vipReward: { type: "COIN", name: "12.000 Coin + Çift XP Parşömeni", amount: 12000, itemId: "item_x2xp" } },
        { level: 8, requiredXp: 2200, freeReward: { type: "COIN", name: "4.500 Coin", amount: 4500 }, vipReward: { type: "COIN", name: "15.000 Coin + Safir Mücevher", amount: 15000, itemId: "item_mucehver" } },
        { level: 9, requiredXp: 2700, freeReward: { type: "COIN", name: "5.000 Coin", amount: 5000 }, vipReward: { type: "COIN", name: "20.000 Coin + Hırsızlık Sigortası", amount: 20000, itemId: "item_sigorta" } },
        { level: 10, requiredXp: 3500, freeReward: { type: "THEME", name: "10.000 Coin + Sakura Teması", amount: 10000, itemId: "tema_sakura" }, vipReward: { type: "THEME", name: "35.000 Coin + Sunset Teması", amount: 35000, itemId: "tema_sunset" } }
      ];

      const defaultDaily = [
        { id: "daily_msg", title: "Sohbet Kuşu", description: "Genel sohbette 25 mesaj gönder", targetType: "message", targetCount: 25, xpReward: 100, coinReward: 500 },
        { id: "daily_voice", title: "Muhabbet Ustası", description: "Ses kanallarında 30 dakika geçir", targetType: "voice_minute", targetCount: 30, xpReward: 150, coinReward: 750 },
        { id: "daily_work", title: "Emekçi", description: "2 kez .calis komutuyla meslek icra et", targetType: "work", targetCount: 2, xpReward: 100, coinReward: 400 },
        { id: "daily_game", title: "Maceracı", description: "1 kez balık tut veya madene in", targetType: "game", targetCount: 1, xpReward: 100, coinReward: 500 }
      ];

      const defaultWeekly = [
        { id: "weekly_msgs", title: "Topluluk Lideri", description: "Hafta boyunca 150 mesaj gönder", targetType: "message", targetCount: 150, xpReward: 400, coinReward: 2500 },
        { id: "weekly_voice", title: "Gece Nöbetçisi", description: "Hafta boyunca seste 3 saat geçir", targetType: "voice_minute", targetCount: 180, xpReward: 500, coinReward: 3500 },
        { id: "weekly_chest", title: "Kasa Avcısı", description: "1 adet Gizemli Şans Sandığı aç", targetType: "chest", targetCount: 1, xpReward: 350, coinReward: 2000 }
      ];

      season = await BattlePass.create({
        guildId,
        season: 1,
        seasonName: "1. Sezon: Kiraz Çiçeği Festivali",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        active: true,
        tiers: defaultTiers,
        dailyQuestsConfig: defaultDaily,
        weeklyQuestsConfig: defaultWeekly
      });
    }
    return season;
  }

  static async getUserProgress(guildId, userId) {
    const season = await this.getOrCreateSeason(guildId);
    let userProgress = await UserBattlePass.findOne({ guildId, userId, season: season.season });

    const eco = await Economy.findOne({ guildId, userId });
    const hasVipItem = (eco?.inventory || []).some((i) => i.itemId === "item_vippass" || i.itemId === "vip");

    const todayStr = new Date().toISOString().slice(0, 10);
    const d = new Date();
    const weekNum = Math.ceil((((d - new Date(d.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
    const weekStr = `${d.getFullYear()}-W${weekNum}`;

    if (!userProgress) {
      const initDaily = (season.dailyQuestsConfig || []).map((q) => ({
        questId: q.id,
        current: 0,
        target: q.targetCount,
        completed: false,
        claimed: false,
        date: todayStr
      }));

      const initWeekly = (season.weeklyQuestsConfig || []).map((q) => ({
        questId: q.id,
        current: 0,
        target: q.targetCount,
        completed: false,
        claimed: false,
        week: weekStr
      }));

      userProgress = await UserBattlePass.create({
        guildId,
        userId,
        season: season.season,
        passXp: 0,
        passLevel: 1,
        hasVipPass: hasVipItem,
        claimedFreeTiers: [],
        claimedVipTiers: [],
        dailyQuests: initDaily,
        weeklyQuests: initWeekly
      });
    } else {
      let needsSave = false;
      if (hasVipItem && !userProgress.hasVipPass) {
        userProgress.hasVipPass = true;
        needsSave = true;
      }

      const isNewDay = !userProgress.dailyQuests || userProgress.dailyQuests.length === 0 || userProgress.dailyQuests[0]?.date !== todayStr;
      if (isNewDay) {
        userProgress.dailyQuests = (season.dailyQuestsConfig || []).map((q) => ({
          questId: q.id,
          current: 0,
          target: q.targetCount,
          completed: false,
          claimed: false,
          date: todayStr
        }));
        needsSave = true;
      }

      const isNewWeek = !userProgress.weeklyQuests || userProgress.weeklyQuests.length === 0 || userProgress.weeklyQuests[0]?.week !== weekStr;
      if (isNewWeek) {
        userProgress.weeklyQuests = (season.weeklyQuestsConfig || []).map((q) => ({
          questId: q.id,
          current: 0,
          target: q.targetCount,
          completed: false,
          claimed: false,
          week: weekStr
        }));
        needsSave = true;
      }

      if (needsSave) {
        await UserBattlePass.updateOne(
          { _id: userProgress._id },
          {
            $set: {
              hasVipPass: userProgress.hasVipPass,
              dailyQuests: userProgress.dailyQuests,
              weeklyQuests: userProgress.weeklyQuests
            }
          }
        );
        userProgress = await UserBattlePass.findById(userProgress._id);
      }
    }

    return { season, userProgress };
  }

  static async recordProgress(guildId, userId, targetType, amount = 1) {
    try {
      const { season, userProgress } = await this.getUserProgress(guildId, userId);
      let changed = false;

      const dailyCfgMap = new Map((season.dailyQuestsConfig || []).map((q) => [q.id, q]));
      for (const dq of userProgress.dailyQuests || []) {
        const cfg = dailyCfgMap.get(dq.questId);
        if (cfg && cfg.targetType === targetType && !dq.completed) {
          dq.current = Math.min(dq.target, dq.current + amount);
          if (dq.current >= dq.target) {
            dq.completed = true;
          }
          changed = true;
        }
      }

      const weeklyCfgMap = new Map((season.weeklyQuestsConfig || []).map((q) => [q.id, q]));
      for (const wq of userProgress.weeklyQuests || []) {
        const cfg = weeklyCfgMap.get(wq.questId);
        if (cfg && cfg.targetType === targetType && !wq.completed) {
          wq.current = Math.min(wq.target, wq.current + amount);
          if (wq.current >= wq.target) {
            wq.completed = true;
          }
          changed = true;
        }
      }

      if (changed) {
        await UserBattlePass.updateOne(
          { _id: userProgress._id },
          {
            $set: {
              dailyQuests: userProgress.dailyQuests,
              weeklyQuests: userProgress.weeklyQuests
            }
          }
        );
      }
    } catch {}
  }

  static async claimQuestReward(guildId, userId, questId, isWeekly = false) {
    const { season, userProgress } = await this.getUserProgress(guildId, userId);
    const questsList = isWeekly ? userProgress.weeklyQuests : userProgress.dailyQuests;
    const configsList = isWeekly ? season.weeklyQuestsConfig : season.dailyQuestsConfig;

    const quest = (questsList || []).find((q) => q.questId === questId);
    if (!quest || !quest.completed || quest.claimed) {
      return { success: false, reason: "Görev tamamlanmamış veya ödülü zaten alınmış." };
    }

    const cfg = (configsList || []).find((c) => c.id === questId);
    if (!cfg) return { success: false, reason: "Görev tanımı bulunamadı." };

    quest.claimed = true;
    const gainedXp = cfg.xpReward || 0;
    const gainedCoin = cfg.coinReward || 0;

    userProgress.passXp = (userProgress.passXp || 0) + gainedXp;

    let newLevel = userProgress.passLevel || 1;
    for (const tier of season.tiers || []) {
      if (userProgress.passXp >= tier.requiredXp && tier.level > newLevel) {
        newLevel = tier.level;
      }
    }
    userProgress.passLevel = newLevel;

    await UserBattlePass.updateOne(
      { _id: userProgress._id },
      {
        $set: {
          dailyQuests: userProgress.dailyQuests,
          weeklyQuests: userProgress.weeklyQuests,
          passXp: userProgress.passXp,
          passLevel: userProgress.passLevel
        }
      }
    );

    if (gainedCoin > 0) {
      await Economy.updateOne({ guildId, userId }, { $inc: { wallet: gainedCoin } }, { upsert: true });
    }

    return {
      success: true,
      title: cfg.title,
      gainedXp,
      gainedCoin,
      newPassLevel: userProgress.passLevel,
      currentPassXp: userProgress.passXp
    };
  }

  static async claimTierRewards(guildId, userId) {
    const { season, userProgress } = await this.getUserProgress(guildId, userId);
    const claimedFree = new Set(userProgress.claimedFreeTiers || []);
    const claimedVip = new Set(userProgress.claimedVipTiers || []);
    const hasVip = userProgress.hasVipPass;

    let totalCoins = 0;
    const awardedItems = [];
    const unlockedTiers = (season.tiers || []).filter((t) => t.level <= (userProgress.passLevel || 1));

    for (const t of unlockedTiers) {
      if (!claimedFree.has(t.level)) {
        claimedFree.add(t.level);
        if (t.freeReward?.amount) totalCoins += t.freeReward.amount;
        if (t.freeReward?.itemId) awardedItems.push({ itemId: t.freeReward.itemId, name: t.freeReward.name });
      }

      if (hasVip && !claimedVip.has(t.level)) {
        claimedVip.add(t.level);
        if (t.vipReward?.amount) totalCoins += t.vipReward.amount;
        if (t.vipReward?.itemId) awardedItems.push({ itemId: t.vipReward.itemId, name: t.vipReward.name });
      }
    }

    const freeArr = [...claimedFree];
    const vipArr = [...claimedVip];

    if (freeArr.length === (userProgress.claimedFreeTiers || []).length && vipArr.length === (userProgress.claimedVipTiers || []).length) {
      return { success: false, reason: "Toplanacak yeni kademe ödülü bulunmuyor." };
    }

    await UserBattlePass.updateOne(
      { _id: userProgress._id },
      {
        $set: {
          claimedFreeTiers: freeArr,
          claimedVipTiers: vipArr
        }
      }
    );

    if (totalCoins > 0) {
      await Economy.updateOne({ guildId, userId }, { $inc: { wallet: totalCoins } }, { upsert: true });
    }

    if (awardedItems.length > 0) {
      let eco = await Economy.findOne({ guildId, userId });
      const currentInv = eco?.inventory || [];
      for (const it of awardedItems) {
        if (!currentInv.some((i) => i.itemId === it.itemId)) {
          currentInv.push({
            itemId: it.itemId,
            name: it.name,
            type: it.itemId.startsWith("tema_") ? "THEME" : "ITEM",
            purchasedAt: new Date()
          });
        }
      }
      await Economy.updateOne({ guildId, userId }, { $set: { inventory: currentInv } });
    }

    return {
      success: true,
      totalCoins,
      awardedItems,
      unlockedCount: unlockedTiers.length
    };
  }
}
