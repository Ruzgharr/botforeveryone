import { Clan, Economy, GuildConfig } from "@bot/database";

export class ClanService {
  static async getClanSettings(guildId) {
    const cfg = await GuildConfig.findOne({ guildId });
    return {
      enabled: cfg?.clanSystem?.enabled ?? true,
      createCost: cfg?.clanSystem?.createCost ?? 10000,
      maxMembersBase: cfg?.clanSystem?.maxMembersBase ?? 15,
      requireApproval: cfg?.clanSystem?.requireApproval ?? false,
      minNameLength: cfg?.clanSystem?.minNameLength ?? 3,
      maxNameLength: cfg?.clanSystem?.maxNameLength ?? 24,
      minTagLength: cfg?.clanSystem?.minTagLength ?? 2,
      maxTagLength: cfg?.clanSystem?.maxTagLength ?? 6,
      channels: cfg?.clanSystem?.channels || []
    };
  }

  static async setClanSettings(guildId, newSettings = {}) {
    let cfg = await GuildConfig.findOne({ guildId });
    if (!cfg) {
      cfg = await GuildConfig.create({ guildId });
    }
    const current = cfg.clanSystem || {};
    const updated = {
      enabled: newSettings.enabled !== undefined ? Boolean(newSettings.enabled) : (current.enabled ?? true),
      createCost: Number(newSettings.createCost) >= 0 ? Number(newSettings.createCost) : (current.createCost ?? 10000),
      maxMembersBase: Number(newSettings.maxMembersBase) > 0 ? Number(newSettings.maxMembersBase) : (current.maxMembersBase ?? 15),
      requireApproval: newSettings.requireApproval !== undefined ? Boolean(newSettings.requireApproval) : (current.requireApproval ?? false),
      minNameLength: Number(newSettings.minNameLength) > 0 ? Number(newSettings.minNameLength) : (current.minNameLength ?? 3),
      maxNameLength: Number(newSettings.maxNameLength) > 0 ? Number(newSettings.maxNameLength) : (current.maxNameLength ?? 24),
      minTagLength: Number(newSettings.minTagLength) > 0 ? Number(newSettings.minTagLength) : (current.minTagLength ?? 2),
      maxTagLength: Number(newSettings.maxTagLength) > 0 ? Number(newSettings.maxTagLength) : (current.maxTagLength ?? 6),
      channels: Array.isArray(newSettings.channels) ? newSettings.channels : (current.channels || [])
    };

    await GuildConfig.updateOne({ guildId }, { $set: { clanSystem: updated } });
    return updated;
  }

  static async createClan(guildId, userId, name, tag, description = "") {
    const settings = await this.getClanSettings(guildId);
    if (!settings.enabled) {
      return { success: false, reason: "Sunucuda klan sistemi yönetici tarafından devre dışı bırakılmıştır." };
    }

    const cleanName = String(name || "").trim();
    const cleanTag = String(tag || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

    const minName = settings.minNameLength || 3;
    const maxName = settings.maxNameLength || 24;
    const minTag = settings.minTagLength || 2;
    const maxTag = settings.maxTagLength || 6;

    if (cleanName.length < minName || cleanName.length > maxName) {
      return { success: false, reason: `Klan adı ${minName} ile ${maxName} karakter arasında olmalıdır.` };
    }
    if (cleanTag.length < minTag || cleanTag.length > maxTag) {
      return { success: false, reason: `Klan etiketi ${minTag} ile ${maxTag} alfanümerik karakter olmalıdır.` };
    }

    const existingClanUser = await Clan.findOne({ guildId, members: userId });
    if (existingClanUser) {
      return { success: false, reason: `Zaten **${existingClanUser.name}** klanının bir üyesisiniz. Yeni klan kurmak için önce mevcut klanınızdan ayrılmalısınız.` };
    }

    const nameExists = await Clan.findOne({ guildId, name: { $regex: new RegExp(`^${cleanName}$`, "i") } });
    if (nameExists) {
      return { success: false, reason: `\`${cleanName}\` isimli bir klan zaten mevcut.` };
    }

    const tagExists = await Clan.findOne({ guildId, tag: cleanTag });
    if (tagExists) {
      return { success: false, reason: `\`[${cleanTag}]\` etiketi başka bir klan tarafından kullanılıyor.` };
    }

    const eco = await Economy.findOne({ guildId, userId });
    if (!eco || (eco.wallet || 0) < settings.createCost) {
      return { success: false, reason: `Klan kurmak için en az **${settings.createCost.toLocaleString("tr-TR")} Coin** gereklidir. (Cüzdanınız: **${(eco?.wallet || 0).toLocaleString("tr-TR")} Coin**)` };
    }

    await Economy.updateOne({ guildId, userId }, { $inc: { wallet: -settings.createCost } });

    const newClan = await Clan.create({
      guildId,
      name: cleanName,
      tag: cleanTag,
      description: description || "Kudretli bir sunucu klanı.",
      leaderId: userId,
      deputies: [],
      members: [userId],
      level: 1,
      xp: 0,
      vault: 0,
      badge: "⚔️",
      maxMembers: settings.maxMembersBase,
      approved: !settings.requireApproval
    });

    return {
      success: true,
      clan: newClan,
      cost: settings.createCost
    };
  }

  static async getClanByUser(guildId, userId) {
    return await Clan.findOne({ guildId, members: userId });
  }

  static async getClanByName(guildId, query) {
    const clean = String(query || "").trim();
    return await Clan.findOne({
      guildId,
      $or: [
        { name: { $regex: new RegExp(`^${clean}$`, "i") } },
        { tag: clean.toUpperCase() }
      ]
    });
  }

  static async depositToVault(guildId, userId, amount) {
    const clan = await this.getClanByUser(guildId, userId);
    if (!clan) {
      return { success: false, reason: "Herhangi bir klana üye değilsiniz." };
    }

    const num = Math.floor(Number(amount));
    if (isNaN(num) || num < 100) {
      return { success: false, reason: "Bağış miktarı en az 100 Coin olmalıdır." };
    }

    const eco = await Economy.findOne({ guildId, userId });
    if (!eco || (eco.wallet || 0) < num) {
      return { success: false, reason: `Cüzdanınızda yeterli bakiye bulunmuyor. (Cüzdan: **${(eco?.wallet || 0).toLocaleString("tr-TR")} Coin**)` };
    }

    await Economy.updateOne({ guildId, userId }, { $inc: { wallet: -num } });

    const gainedXp = Math.round(num / 4);
    const newXp = (clan.xp || 0) + gainedXp;
    const newVault = (clan.vault || 0) + num;
    const newLevel = Math.max(1, Math.floor(Math.sqrt(newXp / 400)) + 1);

    await Clan.updateOne(
      { _id: clan._id },
      {
        $set: {
          vault: newVault,
          xp: newXp,
          level: newLevel
        }
      }
    );

    return {
      success: true,
      clanName: clan.name,
      amount: num,
      gainedXp,
      newLevel,
      newVault
    };
  }

  static async joinClan(guildId, userId, clanQuery) {
    const existing = await this.getClanByUser(guildId, userId);
    if (existing) {
      return { success: false, reason: `Zaten **${existing.name}** klanındasınız.` };
    }

    const clan = await this.getClanByName(guildId, clanQuery);
    if (!clan) {
      return { success: false, reason: "Belirtilen klan bulunamadı." };
    }

    if ((clan.members || []).length >= (clan.maxMembers || 15)) {
      return { success: false, reason: "Bu klanın üye kapasitesi dolmuştur." };
    }

    await Clan.updateOne({ _id: clan._id }, { $push: { members: userId } });

    return {
      success: true,
      clanName: clan.name,
      tag: clan.tag
    };
  }

  static async leaveClan(guildId, userId) {
    const clan = await this.getClanByUser(guildId, userId);
    if (!clan) {
      return { success: false, reason: "Herhangi bir klana üye değilsiniz." };
    }

    const isLeader = clan.leaderId === userId;
    const remainingMembers = (clan.members || []).filter((id) => id !== userId);

    if (isLeader) {
      if (remainingMembers.length === 0) {
        await Clan.deleteOne({ _id: clan._id });
        return { success: true, disbanded: true, clanName: clan.name };
      }

      const nextLeader = clan.deputies && clan.deputies.length > 0
        ? clan.deputies.find((d) => remainingMembers.includes(d)) || remainingMembers[0]
        : remainingMembers[0];

      await Clan.updateOne(
        { _id: clan._id },
        {
          $set: {
            leaderId: nextLeader,
            members: remainingMembers,
            deputies: (clan.deputies || []).filter((d) => d !== userId && d !== nextLeader)
          }
        }
      );

      return { success: true, disbanded: false, newLeaderId: nextLeader, clanName: clan.name };
    }

    await Clan.updateOne(
      { _id: clan._id },
      {
        $set: {
          members: remainingMembers,
          deputies: (clan.deputies || []).filter((d) => d !== userId)
        }
      }
    );

    return { success: true, disbanded: false, clanName: clan.name };
  }

  static async getTopClans(guildId, limit = 10) {
    return await Clan.find({ guildId, approved: true })
      .sort({ level: -1, vault: -1, xp: -1 })
      .limit(limit);
  }
}
