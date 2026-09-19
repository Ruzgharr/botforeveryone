import { Stat, Economy } from "@bot/database";

export class BadgeService {
  static BUILTIN_BADGES = [
    { id: "milyarder", name: "Milyarder", emoji: "👑", desc: "Cüzdanda 100.000+ Coin", check: (stat, eco) => (eco?.wallet || 0) >= 100000 },
    { id: "ses_sampiyonu", name: "Ses Şampiyonu", emoji: "🎙️", desc: "50+ Saat ses süresi", check: (stat) => (stat?.totalVoiceMs || 0) >= 50 * 3600000 },
    { id: "mesaj_ustasi", name: "Sohbet Ustası", emoji: "💬", desc: "1.000+ Mesaj", check: (stat) => (stat?.totalMessages || 0) >= 1000 },
    { id: "seviye_zirvesi", name: "Zirve Savaşçısı", emoji: "⭐", desc: "20+ Seviye", check: (stat) => (stat?.level || 1) >= 20 },
    { id: "sakura_ustasi", name: "Sakura Hayranı", emoji: "🌸", desc: "Sakura kart temasına sahip", check: (stat) => stat?.cardTheme === "sakura" },
    { id: "klan_lideri", name: "Lonca Efendisi", emoji: "⚔️", desc: "Bir klan kurucusu", check: null },
    { id: "kumar_krali", name: "Zar Ustası", emoji: "🎲", desc: "Kumarhane şampiyonu", check: null },
    { id: "efsanevi_pet", name: "Canavar Terbiyecisi", emoji: "🐉", desc: "5+ Seviye evcil hayvan", check: null }
  ];

  static BUILTIN_TITLES = [
    { id: "sakura_efendisi", name: "[🌸 Sakura Efendisi]", cost: 5000 },
    { id: "sunucu_agasi", name: "[👑 Sunucu Ağası]", cost: 25000 },
    { id: "duello_krali", name: "[⚔️ Düello Şampiyonu]", cost: 10000 },
    { id: "ejderha_terbiyecisi", name: "[🐉 Ejderha Terbiyecisi]", cost: 15000 },
    { id: "kripto_baronu", name: "[💎 Kripto Baronu]", cost: 20000 },
    { id: "gece_yargici", name: "[🌙 Gece Yargıcı]", cost: 7500 }
  ];

  static getAllBadges(config = {}) {
    const custom = Array.isArray(config.badgeSystem?.customBadges) ? config.badgeSystem.customBadges : [];
    return [...this.BUILTIN_BADGES, ...custom];
  }

  static async checkAndAwardBadges({ guildId, userId, stat = null, eco = null, config = {} }) {
    if (!stat) {
      stat = await Stat.findOne({ guildId, userId });
    }
    if (!eco) {
      eco = await Economy.findOne({ guildId, userId });
    }
    if (!stat) return [];

    const existingBadges = new Set(stat.badges || []);
    const newlyAwarded = [];

    for (const b of this.BUILTIN_BADGES) {
      if (typeof b.check === "function" && !existingBadges.has(b.id)) {
        if (b.check(stat, eco)) {
          existingBadges.add(b.id);
          newlyAwarded.push(b);
        }
      }
    }

    if (newlyAwarded.length > 0) {
      stat.badges = Array.from(existingBadges);
      if (!stat.activeBadges || stat.activeBadges.length === 0) {
        stat.activeBadges = stat.badges.slice(0, 5);
      }
      await stat.save();
    }

    return newlyAwarded;
  }

  static async awardBadge(guildId, userId, badgeId) {
    const stat = await Stat.findOne({ guildId, userId }) || await Stat.create({ guildId, userId });
    const badges = new Set(stat.badges || []);
    badges.add(badgeId);
    stat.badges = Array.from(badges);
    if (!stat.activeBadges || stat.activeBadges.length < 5) {
      const active = new Set(stat.activeBadges || []);
      active.add(badgeId);
      stat.activeBadges = Array.from(active).slice(0, 5);
    }
    await stat.save();
    return stat;
  }

  static async removeBadge(guildId, userId, badgeId) {
    const stat = await Stat.findOne({ guildId, userId });
    if (!stat) return null;
    stat.badges = (stat.badges || []).filter((b) => b !== badgeId);
    stat.activeBadges = (stat.activeBadges || []).filter((b) => b !== badgeId);
    await stat.save();
    return stat;
  }

  static async setActiveBadges(guildId, userId, badgeIds = []) {
    const stat = await Stat.findOne({ guildId, userId }) || await Stat.create({ guildId, userId });
    const userBadges = new Set(stat.badges || []);
    const filtered = badgeIds.filter((b) => userBadges.has(b)).slice(0, 5);
    stat.activeBadges = filtered;
    await stat.save();
    return stat;
  }

  static async setActiveTitle(guildId, userId, titleStr) {
    const stat = await Stat.findOne({ guildId, userId }) || await Stat.create({ guildId, userId });
    stat.title = titleStr || "";
    await stat.save();
    return stat;
  }

  static async unlockTitle(guildId, userId, titleStr) {
    const stat = await Stat.findOne({ guildId, userId }) || await Stat.create({ guildId, userId });
    const titles = new Set(stat.unlockedTitles || []);
    titles.add(titleStr);
    stat.unlockedTitles = Array.from(titles);
    if (!stat.title) {
      stat.title = titleStr;
    }
    await stat.save();
    return stat;
  }
}
