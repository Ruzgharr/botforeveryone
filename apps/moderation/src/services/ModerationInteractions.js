import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";
import { Penalty, ChatMessage } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { ModerationUI } from "./ModerationUI.js";

export function registerModerationInteractions(client) {
  client.registerInteraction("mod_sicil_nav", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Bu işlem için yetkiniz bulunmuyor.", [], true));
    }

    const parts = interaction.customId.split(":");
    const targetUserId = parts[1];
    const targetPage = Math.max(1, parseInt(parts[2], 10) || 1);
    const filter = parts[3] || "all";

    const query = { guildId: interaction.guildId, userId: targetUserId };
    if (filter === "active") query.active = true;

    const totalCount = await Penalty.countDocuments(query);
    const pageSize = 5;
    const skip = (targetPage - 1) * pageSize;
    const penalties = await Penalty.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize);

    const allUserPenalties = await Penalty.find({ guildId: interaction.guildId, userId: targetUserId });
    const totalPoints = allUserPenalties.reduce((acc, p) => acc + (p.points || 0), 0);

    const targetUser = await bot.users.fetch(targetUserId).catch(() => ({ id: targetUserId, tag: targetUserId }));
    const payload = ModerationUI.formatSicilPayload({
      targetUser,
      penalties,
      page: targetPage,
      totalCount,
      totalPoints,
      filter
    });

    await interaction.update(payload);
  });

  client.registerInteraction("mod_sicil_filter", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Bu işlem için yetkiniz bulunmuyor.", [], true));
    }

    const parts = interaction.customId.split(":");
    const targetUserId = parts[1];
    const filter = parts[3] || "all";

    const query = { guildId: interaction.guildId, userId: targetUserId };
    if (filter === "active") query.active = true;

    const totalCount = await Penalty.countDocuments(query);
    const penalties = await Penalty.find(query).sort({ createdAt: -1 }).limit(5);

    const allUserPenalties = await Penalty.find({ guildId: interaction.guildId, userId: targetUserId });
    const totalPoints = allUserPenalties.reduce((acc, p) => acc + (p.points || 0), 0);

    const targetUser = await bot.users.fetch(targetUserId).catch(() => ({ id: targetUserId, tag: targetUserId }));
    const payload = ModerationUI.formatSicilPayload({
      targetUser,
      penalties,
      page: 1,
      totalCount,
      totalPoints,
      filter
    });

    await interaction.update(payload);
  });

  client.registerInteraction("mod_sicil_clear_prompt", async ({ client: bot, interaction, config }) => {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Sicil temizlemek için Yönetici yetkisi gereklidir.", [], true));
    }

    const targetUserId = interaction.customId.split(":")[1];
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mod_sicil_clear_confirm:${targetUserId}`)
        .setLabel("Evet, Tüm Sicili Temizle")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("mod_sicil_clear_cancel")
        .setLabel("İptal")
        .setStyle(ButtonStyle.Secondary)
    );

    const content = `### ⚠️ Sicil Temizleme Onayı\n<@${targetUserId}> kullanıcısının tüm ceza ve sicil geçmişini kalıcı olarak silmek üzeresiniz. Bu işlem geri alınamaz.\n-# Onaylıyor musunuz?`;
    await interaction.reply({ ...MessageFormatter.v2(content, [row]), ephemeral: true });
  });

  client.registerInteraction("mod_sicil_clear_confirm", async ({ client: bot, interaction }) => {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Bu işlem için Yönetici yetkisi gereklidir.", [], true));
    }

    const targetUserId = interaction.customId.split(":")[1];
    await Penalty.deleteMany({ guildId: interaction.guildId, userId: targetUserId });

    const content = `### 🗑️ Sicil Temizlendi\n<@${targetUserId}> kullanıcısının tüm sicil ve ceza kayıtları başarıyla silindi.\n-# İşlem Yetkilisi: <@${interaction.user.id}>`;
    await interaction.update({ ...MessageFormatter.v2(content), components: [] });
  });

  client.registerInteraction("mod_sicil_clear_cancel", async ({ interaction }) => {
    await interaction.update({ ...MessageFormatter.v2("### ❌ İşlem İptal Edildi\nSicil temizleme işlemi iptal edildi."), components: [] });
  });

  client.registerInteraction("mod_sicil_view", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Bu işlem için yetkiniz bulunmuyor.", [], true));
    }

    const targetUserId = interaction.customId.split(":")[1];
    const penalties = await Penalty.find({ guildId: interaction.guildId, userId: targetUserId }).sort({ createdAt: -1 }).limit(5);
    const totalCount = await Penalty.countDocuments({ guildId: interaction.guildId, userId: targetUserId });
    const allUserPenalties = await Penalty.find({ guildId: interaction.guildId, userId: targetUserId });
    const totalPoints = allUserPenalties.reduce((acc, p) => acc + (p.points || 0), 0);

    const targetUser = await bot.users.fetch(targetUserId).catch(() => ({ id: targetUserId, tag: targetUserId }));
    const payload = ModerationUI.formatSicilPayload({
      targetUser,
      penalties,
      page: 1,
      totalCount,
      totalPoints,
      filter: "all"
    });

    await interaction.reply({ ...payload, ephemeral: true });
  });

  client.registerInteraction("mod_penalty_lift", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Ceza kaldırmak için yetkiniz bulunmuyor.", [], true));
    }

    const caseId = parseInt(interaction.customId.split(":")[1], 10);
    const penalty = await Penalty.findOne({ guildId: interaction.guildId, caseId });

    if (!penalty || !penalty.active) {
      return interaction.reply(MessageFormatter.warn("İşlem Geçersiz", "Bu ceza zaten aktif değil veya bulunamadı.", [], true));
    }

    const member = await interaction.guild.members.fetch(penalty.userId).catch(() => null);

    if (penalty.type === "JAIL") {
      const jailRoleId = config.roles?.jail;
      const unregRoleId = config.roles?.unregistered?.[0];
      if (member && jailRoleId) {
        await member.roles.remove(jailRoleId).catch(() => null);
        if (unregRoleId) await member.roles.add(unregRoleId).catch(() => null);
      }
    } else if (penalty.type === "MUTE") {
      const muteRoleId = config.roles?.chatMute;
      if (member) {
        if (member.isCommunicationDisabled()) await member.timeout(null).catch(() => null);
        if (muteRoleId) await member.roles.remove(muteRoleId).catch(() => null);
      }
    } else if (penalty.type === "VMUTE") {
      const vmuteRoleId = config.roles?.voiceMute;
      if (member) {
        if (member.voice?.channel) await member.voice.setMute(false).catch(() => null);
        if (vmuteRoleId) await member.roles.remove(vmuteRoleId).catch(() => null);
      }
    } else if (penalty.type === "BAN") {
      await interaction.guild.bans.remove(penalty.userId, "Yetkili butonu ile kaldırıldı").catch(() => null);
    }

    penalty.active = false;
    penalty.liftedAt = new Date();
    penalty.liftedBy = interaction.user.id;
    await penalty.save();

    const content = `### 🔓 Ceza Kaldırıldı\n▫️ **Ceza Numarası:** \`#${caseId}\` (${penalty.type})\n▫️ **Kullanıcı:** <@${penalty.userId}>\n▫️ **Kaldıran Yetkili:** <@${interaction.user.id}>\n-# Ceza Takip Sistemi`;
    await interaction.reply(MessageFormatter.v2(content));
  });

  client.registerInteraction("mod_unpunish", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Bu işlem için yetkiniz bulunmuyor.", [], true));
    }

    const parts = interaction.customId.split(":");
    const type = parts[1];
    const targetUserId = parts[2];
    const caseId = parseInt(parts[3], 10);

    const penalty = await Penalty.findOne({ guildId: interaction.guildId, caseId });
    if (penalty && penalty.active) {
      penalty.active = false;
      penalty.liftedAt = new Date();
      penalty.liftedBy = interaction.user.id;
      await penalty.save();
    }

    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    if (type === "JAIL") {
      const jailRoleId = config.roles?.jail;
      if (member && jailRoleId) await member.roles.remove(jailRoleId).catch(() => null);
    } else if (type === "MUTE") {
      const muteRoleId = config.roles?.chatMute;
      if (member) {
        if (member.isCommunicationDisabled()) await member.timeout(null).catch(() => null);
        if (muteRoleId) await member.roles.remove(muteRoleId).catch(() => null);
      }
    } else if (type === "VMUTE") {
      if (member?.voice?.channel) await member.voice.setMute(false).catch(() => null);
      const vmuteRoleId = config.roles?.voiceMute;
      if (member && vmuteRoleId) await member.roles.remove(vmuteRoleId).catch(() => null);
    } else if (type === "BAN") {
      await interaction.guild.bans.remove(targetUserId, "Hızlı geri alma butonu").catch(() => null);
    }

    const content = `### ↩️ Ceza Geri Alındı\n▫️ **Ceza:** #${caseId} [${type}]\n▫️ **Kullanıcı:** <@${targetUserId}>\n▫️ **Geri Alan:** <@${interaction.user.id}>\n-# Ceza başarıyla iptal edildi.`;
    await interaction.reply(MessageFormatter.v2(content));
  });

  client.registerInteraction("mod_lock_toggle", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Kanal kilitlemek için yetkiniz bulunmuyor.", [], true));
    }

    const currentOverwrites = interaction.channel.permissionOverwrites.cache.get(interaction.guildId);
    const isLocked = Boolean(currentOverwrites?.deny.has(PermissionFlagsBits.SendMessages));

    if (isLocked) {
      await interaction.channel.permissionOverwrites.edit(interaction.guildId, { SendMessages: null }).catch(() => null);
      const row = ModerationUI.buildLockActionRow(false);
      const content = `### 🔓 Kanal Kilidi Açıldı\nBu kanal yeniden mesaj gönderimine açıldı.\n▫️ **Yetkili:** <@${interaction.user.id}>`;
      await interaction.reply(MessageFormatter.v2(content, [row]));
    } else {
      await interaction.channel.permissionOverwrites.edit(interaction.guildId, { SendMessages: false }).catch(() => null);
      const row = ModerationUI.buildLockActionRow(true);
      const content = `### 🔒 Kanal Kilitlendi\nBu kanal geçici olarak mesaj gönderimine kapatıldı.\n▫️ **Yetkili:** <@${interaction.user.id}>`;
      await interaction.reply(MessageFormatter.v2(content, [row]));
    }
  });

  client.registerInteraction("mod_lock_timed", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Kanal kilitlemek için yetkiniz bulunmuyor.", [], true));
    }

    const durationMs = parseInt(interaction.customId.split(":")[1], 10) || 300000;
    await interaction.channel.permissionOverwrites.edit(interaction.guildId, { SendMessages: false }).catch(() => null);

    const unlockTs = Math.floor((Date.now() + durationMs) / 1000);
    const row = ModerationUI.buildLockActionRow(true);
    const content = `### ⏱️ Süreli Kanal Kilidi\nBu kanal <t:${unlockTs}:R> (<t:${unlockTs}:t>) otomatik olarak açılacaktır.\n▫️ **Yetkili:** <@${interaction.user.id}>`;
    await interaction.reply(MessageFormatter.v2(content, [row]));

    setTimeout(async () => {
      const check = interaction.channel.permissionOverwrites.cache.get(interaction.guildId);
      if (check?.deny.has(PermissionFlagsBits.SendMessages)) {
        await interaction.channel.permissionOverwrites.edit(interaction.guildId, { SendMessages: null }).catch(() => null);
        const openContent = `### 🔓 Kanal Kilidi Açıldı\nSüre sona erdiği için kanal yeniden mesaj gönderimine açıldı.`;
        interaction.channel.send(MessageFormatter.v2(openContent)).catch(() => null);
      }
    }, durationMs);
  });

  client.registerInteraction("mod_slowmode", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Yavaş mod ayarlamak için yetkiniz bulunmuyor.", [], true));
    }

    const seconds = parseInt(interaction.customId.split(":")[1], 10) || 0;
    await interaction.channel.setRateLimitPerUser(seconds).catch(() => null);

    const row = ModerationUI.buildSlowmodeActionRow(seconds);
    const desc = seconds === 0
      ? "Bu kanal için yavaş mod süresi kaldırıldı."
      : `Bu kanal için kullanıcı başına bekleme süresi **${seconds} saniye** olarak ayarlandı.`;

    const content = `### ⏱️ Yavaş Mod Güncellendi\n▫️ ${desc}\n▫️ **Yetkili:** <@${interaction.user.id}>`;
    await interaction.reply(MessageFormatter.v2(content, [row]));
  });

  client.registerInteraction("mod_warn_del_last", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Bu işlem için yetkiniz bulunmuyor.", [], true));
    }

    const targetUserId = interaction.customId.split(":")[1];
    const latestWarn = await Penalty.findOne({ guildId: interaction.guildId, userId: targetUserId, type: "WARN", active: true }).sort({ createdAt: -1 });

    if (!latestWarn) {
      return interaction.reply(MessageFormatter.warn("Bulunamadı", "Bu kullanıcıya ait aktif bir uyarı bulunamadı.", [], true));
    }

    latestWarn.active = false;
    latestWarn.liftedAt = new Date();
    latestWarn.liftedBy = interaction.user.id;
    await latestWarn.save();

    const content = `### 🗑️ Son Uyarı Silindi\n▫️ **Kullanıcı:** <@${targetUserId}>\n▫️ **Silinen Uyarı:** #${latestWarn.caseId} (*${latestWarn.reason}*)\n▫️ **Yetkili:** <@${interaction.user.id}>`;
    await interaction.reply(MessageFormatter.v2(content));
  });

  client.registerInteraction("mod_warn_del_all", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Bu işlem için yetkiniz bulunmuyor.", [], true));
    }

    const targetUserId = interaction.customId.split(":")[1];
    await Penalty.updateMany(
      { guildId: interaction.guildId, userId: targetUserId, type: "WARN", active: true },
      { $set: { active: false, liftedAt: new Date(), liftedBy: interaction.user.id } }
    );

    const content = `### 🧹 Tüm Uyarılar Temizlendi\n▫️ **Kullanıcı:** <@${targetUserId}>\n▫️ Kullanıcının tüm aktif uyarıları kaldırıldı.\n▫️ **Yetkili:** <@${interaction.user.id}>`;
    await interaction.reply(MessageFormatter.v2(content));
  });

  client.registerInteraction("mod_snipe_nav", async ({ interaction }) => {
    const parts = interaction.customId.split(":");
    const type = parts[1] || "delete";
    const channelId = parts[2];
    const targetIndex = parseInt(parts[3], 10) || 0;

    const filter = type === "edit"
      ? { channelId, isEdited: true }
      : { channelId, isDeleted: true };

    const records = await ChatMessage.find(filter)
      .sort(type === "edit" ? { editedAt: -1, timestamp: -1 } : { deletedAt: -1, timestamp: -1 })
      .limit(10)
      .catch(() => []);

    const payload = ModerationUI.buildSnipePayload({
      type,
      records,
      index: targetIndex,
      channelId
    });

    await interaction.update(payload);
  });

  client.registerInteraction("mod_snipe_toggle", async ({ interaction }) => {
    const parts = interaction.customId.split(":");
    const nextType = parts[1] || "delete";
    const channelId = parts[2];

    const filter = nextType === "edit"
      ? { channelId, isEdited: true }
      : { channelId, isDeleted: true };

    const records = await ChatMessage.find(filter)
      .sort(nextType === "edit" ? { editedAt: -1, timestamp: -1 } : { deletedAt: -1, timestamp: -1 })
      .limit(10)
      .catch(() => []);

    const payload = ModerationUI.buildSnipePayload({
      type: nextType,
      records,
      index: 0,
      channelId
    });

    await interaction.update(payload);
  });

  client.registerInteraction("mod_snipe_clear", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "moderationStaff")) {
      return interaction.reply(MessageFormatter.error("Yetki Yetersiz", "Bu işlem için yetkiniz bulunmuyor.", [], true));
    }

    const channelId = interaction.customId.split(":")[1];
    bot.snipes?.delete(channelId);

    await ChatMessage.updateMany(
      { channelId },
      { $set: { isDeleted: false, isEdited: false } }
    ).catch(() => null);

    const content = `### 🗑️ Snipe Hafızası Temizlendi\nBu kanalın silinen ve düzenlenen tüm mesaj geçmişi başarıyla temizlendi.\n▫️ **Yetkili:** <@${interaction.user.id}>`;
    await interaction.reply({ ...MessageFormatter.v2(content), ephemeral: true });
  });
}
