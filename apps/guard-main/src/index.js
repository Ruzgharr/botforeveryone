import { BaseBot, WebhookLogger } from "@bot/core";
import { environment } from "@bot/config";
import { AuditLogEvent } from "discord.js";
import { PunishService } from "./services/PunishService.js";
import { BackupService } from "./services/BackupService.js";
import yedekalCmd from "./commands/yedekal.js";
import yedekyukleCmd from "./commands/yedekyukle.js";
import yedeklisteCmd from "./commands/yedekliste.js";
import korumabilgiCmd from "./commands/korumabilgi.js";

const client = new BaseBot({
  serviceName: "GUARD-MAIN",
  token: environment.tokens.guardMain
});

client.registerCommand(yedekalCmd);
client.registerCommand(yedekyukleCmd);
client.registerCommand(yedeklisteCmd);
client.registerCommand(korumabilgiCmd);

const incidentHistory = new Map();

async function checkPanicMode(guild, config) {
  if (!config.guardPanic?.enabled) return;

  const now = Date.now();
  const windowMs = config.guardPanic.timeWindowMs || 5000;
  const threshold = config.guardPanic.threshold || 5;

  const incidents = (incidentHistory.get(guild.id) || []).filter((t) => now - t < windowMs);
  incidents.push(now);
  incidentHistory.set(guild.id, incidents);

  if (incidents.length >= threshold) {
    client.logger.error(`[PANIC MODU TETİKLENDİ] ${guild.name} üzerinde yoğun saldırı tespit edildi.`);
    if (config.channels?.guardWebhook) {
      await WebhookLogger.sendAlert(config.channels.guardWebhook, {
        title: "ACİL DURUM: Sunucu Karantina Modu (Lockdown) Tetiklendi!",
        description: `Sunucuda ${windowMs / 1000} saniye içinde ${incidents.length} adet yetkisiz güvenlik ihlali algılandı.`,
        color: 0x991b1b
      }).catch(() => {});
    }
  }
}

client.on("ready", () => {
  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      await BackupService.createGuildBackup(guild, "AUTO").catch(() => null);
    }
  }, 1000 * 60 * 60);
});

client.on("roleDelete", async (role) => {
  const config = await client.getGuildConfig(role.guild.id);
  if (!config.guard?.active) return;

  const logs = await role.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleDelete }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry || !entry.executor) return;

  const member = await role.guild.members.fetch(entry.executor.id).catch(() => null);
  if (PunishService.isSafe(member, config)) return;

  await PunishService.punish(member, `İzinsiz Rol Silme: ${role.name}`, config, client);
  await BackupService.restoreRole(role.guild, role.name).catch(() => null);
  checkPanicMode(role.guild, config);
});

client.on("channelDelete", async (channel) => {
  const config = await client.getGuildConfig(channel.guild.id);
  if (!config.guard?.active) return;

  const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelDelete }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry || !entry.executor) return;

  const member = await channel.guild.members.fetch(entry.executor.id).catch(() => null);
  if (PunishService.isSafe(member, config)) return;

  await PunishService.punish(member, `İzinsiz Kanal Silme: ${channel.name}`, config, client);
  await BackupService.restoreChannel(channel.guild, channel.name).catch(() => null);
  checkPanicMode(channel.guild, config);
});

client.on("roleUpdate", async (oldRole, newRole) => {
  const config = await client.getGuildConfig(newRole.guild.id);
  if (!config.guard?.active) return;

  if (oldRole.rawPosition !== newRole.rawPosition) {
    const logs = await newRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate }).catch(() => null);
    const entry = logs?.entries?.first();
    if (entry?.executor) {
      const executorMember = await newRole.guild.members.fetch(entry.executor.id).catch(() => null);
      if (!PunishService.isSafe(executorMember, config)) {
        await newRole.setPosition(oldRole.rawPosition).catch(() => null);
        await PunishService.punish(executorMember, `Rol Sıralaması Koruması: ${newRole.name} rolünün sırası yetkisiz değiştirildi`, config, client);
        checkPanicMode(newRole.guild, config);
        return;
      }
    }
  }

  if (config.permissionAudit?.enabled) {
    const dangerous = config.permissionAudit.dangerousPermissions || ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "BanMembers", "KickMembers"];
    const hadDanger = dangerous.some((p) => oldRole.permissions.has(p));
    const hasDanger = dangerous.some((p) => newRole.permissions.has(p));

    if (!hadDanger && hasDanger) {
      const isSafeRole = config.roles?.staffRoles?.includes(newRole.id) || config.guard?.safeRoles?.includes(newRole.id);
      if (!isSafeRole) {
        const logs = await newRole.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.RoleUpdate }).catch(() => null);
        const entry = logs?.entries?.first();
        if (entry?.executor) {
          const executorMember = await newRole.guild.members.fetch(entry.executor.id).catch(() => null);
          if (!PunishService.isSafe(executorMember, config)) {
            await newRole.setPermissions(oldRole.permissions).catch(() => null);
            await PunishService.punish(executorMember, `Yetki Denetçisi: ${newRole.name} rolüne izinsiz tehlikeli yetki verildi`, config, client);
            checkPanicMode(newRole.guild, config);
          }
        }
      }
    }
  }
});

client.on("guildMemberAdd", async (member) => {
  const config = await client.getGuildConfig(member.guild.id);
  if (!config.guard?.active) return;

  if (member.user.bot) {
    if (!config.guard?.blockBots) return;
    const logs = await member.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.BotAdd }).catch(() => null);
    const entry = logs?.entries?.first();
    if (!entry || !entry.executor) return;

    const executorMember = await member.guild.members.fetch(entry.executor.id).catch(() => null);
    if (PunishService.isSafe(executorMember, config) || PunishService.isSafeBot(member.user, config)) return;

    await member.ban({ reason: "[GUARD] İzinsiz Bot Girişi" }).catch(() => null);
    await PunishService.punish(executorMember, `İzinsiz Bot Ekleme: ${member.user.tag}`, config, client);
    checkPanicMode(member.guild, config);
    return;
  }

  const accountAgeMs = Date.now() - member.user.createdTimestamp;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (accountAgeMs < sevenDaysMs) {
    const suspiciousRole = config.roles?.suspicious?.[0];
    if (suspiciousRole) {
      await member.roles.add(suspiciousRole).catch(() => null);
    }
    const unregRoles = config.roles?.unregistered || [];
    if (unregRoles.length > 0) {
      await member.roles.remove(unregRoles).catch(() => null);
    }
    if (config.channels?.guardLog) {
      const guardLogChannel = member.guild.channels.cache.get(config.channels.guardLog);
      if (guardLogChannel) {
        guardLogChannel.send({
          embeds: [Embeds.warn(
            "Şüpheli Yeni Hesap Koruması",
            `**Üye:** ${member} (${member.user.tag} - \`${member.id}\`)\n**Hesap Yaşı:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n**Durum:** 7 günden yeni hesap olduğu için otomatik tecrit uygulandı.`,
            member.guild
          )]
        }).catch(() => null);
      }
    }
  }
});

client.on("guildUpdate", async (oldGuild, newGuild) => {
  const config = await client.getGuildConfig(newGuild.id);
  if (!config.guard?.active) return;

  const logs = await newGuild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.GuildUpdate }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry || !entry.executor) return;

  const executorMember = await newGuild.members.fetch(entry.executor.id).catch(() => null);
  if (PunishService.isSafe(executorMember, config)) return;

  if (oldGuild.name !== newGuild.name) {
    await newGuild.setName(oldGuild.name).catch(() => null);
  }
  if (oldGuild.icon !== newGuild.icon) {
    await newGuild.setIcon(oldGuild.iconURL()).catch(() => null);
  }
  if (oldGuild.banner !== newGuild.banner) {
    await newGuild.setBanner(oldGuild.bannerURL()).catch(() => null);
  }
  if (oldGuild.vanityURLCode && oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
    await PunishService.punish(executorMember, `Sunucu Özel URL Değişimi: ${oldGuild.vanityURLCode}`, config, client);
    checkPanicMode(newGuild, config);
    return;
  }

  await PunishService.punish(executorMember, "İzinsiz Sunucu Ayarları Değişikliği", config, client);
  checkPanicMode(newGuild, config);
});

client.on("channelUpdate", async (oldChannel, newChannel) => {
  if (!newChannel.guild) return;
  const config = await client.getGuildConfig(newChannel.guild.id);
  if (!config.guard?.active) return;

  const logs = await newChannel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.ChannelUpdate }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry || !entry.executor) return;

  const executorMember = await newChannel.guild.members.fetch(entry.executor.id).catch(() => null);
  if (PunishService.isSafe(executorMember, config)) return;

  const oldOverwrites = Array.from(oldChannel.permissionOverwrites.cache.values());
  const newOverwrites = Array.from(newChannel.permissionOverwrites.cache.values());
  const hasOverwriteDiff = oldOverwrites.length !== newOverwrites.length
    || oldOverwrites.some((ow) => {
      const matching = newChannel.permissionOverwrites.cache.get(ow.id);
      return !matching || matching.allow.bitfield !== ow.allow.bitfield || matching.deny.bitfield !== ow.deny.bitfield;
    });

  if (hasOverwriteDiff) {
    await newChannel.permissionOverwrites.set(oldChannel.permissionOverwrites.cache).catch(() => null);
    await PunishService.punish(executorMember, `Kanal İzin Koruması: #${newChannel.name} izinleri yetkisiz değiştirildi`, config, client);
    checkPanicMode(newChannel.guild, config);
    return;
  }

  if (oldChannel.name !== newChannel.name) {
    await newChannel.setName(oldChannel.name).catch(() => null);
  }

  await PunishService.punish(executorMember, `İzinsiz Kanal Güncelleme: ${newChannel.name}`, config, client);
  checkPanicMode(newChannel.guild, config);
});

client.on("webhookUpdate", async (channel) => {
  if (!channel.guild) return;
  const config = await client.getGuildConfig(channel.guild.id);
  if (!config.guard?.active || !config.guard?.blockWebhooks) return;

  const logs = await channel.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.WebhookCreate }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry || !entry.executor) return;

  const executorMember = await channel.guild.members.fetch(entry.executor.id).catch(() => null);
  if (PunishService.isSafe(executorMember, config)) return;

  const webhooks = await channel.fetchWebhooks().catch(() => null);
  if (webhooks) {
    for (const hook of webhooks.values()) {
      if (hook.owner?.id === entry.executor.id) {
        await hook.delete().catch(() => null);
      }
    }
  }

  await PunishService.punish(executorMember, `İzinsiz Webhook Oluşturma: #${channel.name}`, config, client);
  checkPanicMode(channel.guild, config);
});

client.on("emojiDelete", async (emoji) => {
  const config = await client.getGuildConfig(emoji.guild.id);
  if (!config.guard?.active) return;

  const logs = await emoji.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.EmojiDelete }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry || !entry.executor) return;

  const executorMember = await emoji.guild.members.fetch(entry.executor.id).catch(() => null);
  if (PunishService.isSafe(executorMember, config)) return;

  await PunishService.punish(executorMember, `İzinsiz Emoji Silme: ${emoji.name}`, config, client);
  checkPanicMode(emoji.guild, config);
});

client.on("guildBanAdd", async (ban) => {
  const config = await client.getGuildConfig(ban.guild.id);
  if (!config.guard?.active) return;

  const logs = await ban.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberBanAdd }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry || !entry.executor) return;

  const executorMember = await ban.guild.members.fetch(entry.executor.id).catch(() => null);
  if (PunishService.isSafe(executorMember, config)) return;

  await ban.guild.members.unban(ban.user.id, "[GUARD] Yetkisiz ban geri alındı").catch(() => null);
  await PunishService.punish(executorMember, `İzinsiz Üye Yasaklama: ${ban.user.tag}`, config, client);
  checkPanicMode(ban.guild, config);
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const config = await client.getGuildConfig(newMember.guild.id);
  if (!config.guard?.active || !config.permissionAudit?.enabled) return;

  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;
  const addedRoles = newRoles.filter((r) => !oldRoles.has(r.id));
  if (addedRoles.size === 0) return;

  const dangerous = config.permissionAudit.dangerousPermissions || ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "BanMembers", "KickMembers"];
  const dangerousAdded = addedRoles.filter((r) => dangerous.some((perm) => r.permissions.has(perm)));
  if (dangerousAdded.size === 0) return;

  const logs = await newMember.guild.fetchAuditLogs({ limit: 1, type: AuditLogEvent.MemberRoleUpdate }).catch(() => null);
  const entry = logs?.entries?.first();
  if (!entry || !entry.executor) return;

  const executorMember = await newMember.guild.members.fetch(entry.executor.id).catch(() => null);
  if (PunishService.isSafe(executorMember, config)) return;

  await newMember.roles.remove(dangerousAdded).catch(() => null);
  await PunishService.punish(executorMember, `İzinsiz Yetki Verme: ${newMember.user.tag} kullanıcısına yetkili rolü verildi`, config, client);
  checkPanicMode(newMember.guild, config);
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  const config = await client.getGuildConfig(message.guild.id);
  if (!config.guard?.active) return;
  if (PunishService.isSafe(message.member, config)) return;

  const mentionCount = message.mentions.users.size;
  const hasEveryone = message.mentions.everyone;

  if (hasEveryone && !message.member.permissions.has("MentionEveryone")) {
    await message.delete().catch(() => null);
    await PunishService.punish(message.member, "İzinsiz Everyone/Here Etiketi Saldırısı", config, client);
    checkPanicMode(message.guild, config);
    return;
  }

  if (mentionCount >= 5) {
    await message.delete().catch(() => null);
    await PunishService.punish(message.member, `Toplu Etiket Saldırısı (${mentionCount} kişi)`, config, client);
    checkPanicMode(message.guild, config);
  }
});

export default client;

if (process.argv[1]?.endsWith("apps/guard-main/src/index.js") || process.argv[1]?.endsWith("apps\\guard-main\\src\\index.js")) {
  client.start();
}
