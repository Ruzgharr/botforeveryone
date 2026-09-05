import { Backup } from "@bot/database";

export class BackupService {
  static async createGuildBackup(guild, type = "AUTO") {
    if (!guild) return null;

    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id && !r.managed)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        position: r.position,
        permissions: r.permissions.bitfield.toString(),
        mentionable: r.mentionable,
        members: r.members.map((m) => m.id)
      }));

    const channels = guild.channels.cache.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      parentId: c.parentId,
      position: c.position,
      permissionOverwrites: Array.from(c.permissionOverwrites.cache.values()).map((p) => ({
        id: p.id,
        type: p.type,
        allow: p.allow.bitfield.toString(),
        deny: p.deny.bitfield.toString()
      }))
    }));

    const backup = await Backup.create({
      guildId: guild.id,
      type,
      roles,
      channels
    });

    return backup;
  }

  static async restoreRole(guild, roleName) {
    if (!guild || !roleName) return null;
    const backup = await Backup.findOne({ guildId: guild.id }).sort({ createdAt: -1 });
    if (!backup || !backup.roles) return null;

    const roleData = backup.roles.find((r) => r.name === roleName);
    if (!roleData) return null;

    try {
      const recreated = await guild.roles.create({
        name: roleData.name,
        color: roleData.color,
        hoist: roleData.hoist,
        permissions: BigInt(roleData.permissions || "0"),
        mentionable: roleData.mentionable
      });
      return recreated;
    } catch {
      return null;
    }
  }

  static async restoreChannel(guild, channelName) {
    if (!guild || !channelName) return null;
    const backup = await Backup.findOne({ guildId: guild.id }).sort({ createdAt: -1 });
    if (!backup || !backup.channels) return null;

    const channelData = backup.channels.find((c) => c.name === channelName);
    if (!channelData) return null;

    try {
      const recreated = await guild.channels.create({
        name: channelData.name,
        type: channelData.type,
        parent: channelData.parentId || null
      });
      return recreated;
    } catch {
      return null;
    }
  }

  static async listBackups(guildId, limit = 5) {
    if (!guildId) return [];
    return Backup.find({ guildId }).sort({ createdAt: -1 }).limit(limit);
  }

  static async restoreFullBackup(guild, backupId = null) {
    if (!guild) return { success: false, reason: "Sunucu bulunamadı" };
    let backup;
    if (backupId) {
      if (backupId.match(/^[0-9a-fA-F]{24}$/)) {
        backup = await Backup.findById(backupId);
      } else {
        backup = await Backup.findOne({ _id: backupId, guildId: guild.id });
      }
    } else {
      backup = await Backup.findOne({ guildId: guild.id }).sort({ createdAt: -1 });
    }

    if (!backup) {
      return { success: false, reason: "Yedek kaydı bulunamadı." };
    }

    let rolesRestored = 0;
    const existingRoles = guild.roles.cache;
    if (Array.isArray(backup.roles)) {
      for (const r of backup.roles) {
        const found = existingRoles.find((ex) => ex.id === r.id || ex.name.toLowerCase() === r.name.toLowerCase());
        if (!found) {
          try {
            await guild.roles.create({
              name: r.name,
              color: r.color,
              hoist: r.hoist,
              permissions: BigInt(r.permissions || "0"),
              mentionable: r.mentionable
            });
            rolesRestored++;
          } catch {}
        }
      }
    }

    let channelsRestored = 0;
    const existingChannels = guild.channels.cache;
    if (Array.isArray(backup.channels)) {
      const categories = backup.channels.filter((c) => c.type === 4);
      const otherChannels = backup.channels.filter((c) => c.type !== 4);
      const categoryMap = new Map();

      for (const cat of categories) {
        let currentCat = existingChannels.find((c) => c.id === cat.id || (c.type === 4 && c.name.toLowerCase() === cat.name.toLowerCase()));
        if (!currentCat) {
          try {
            currentCat = await guild.channels.create({
              name: cat.name,
              type: 4
            });
            channelsRestored++;
          } catch {}
        }
        if (currentCat) {
          categoryMap.set(cat.id, currentCat.id);
        }
      }

      for (const ch of otherChannels) {
        const found = existingChannels.find((c) => c.id === ch.id || (c.name.toLowerCase() === ch.name.toLowerCase() && c.type === ch.type));
        if (!found) {
          try {
            const parentId = ch.parentId ? (categoryMap.get(ch.parentId) || ch.parentId) : null;
            await guild.channels.create({
              name: ch.name,
              type: ch.type,
              parent: parentId
            });
            channelsRestored++;
          } catch {}
        }
      }
    }

    return {
      success: true,
      backupId: backup._id.toString(),
      backupTime: backup.createdAt,
      type: backup.type,
      rolesRestored,
      channelsRestored
    };
  }
}

