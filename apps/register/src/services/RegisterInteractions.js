import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { UserAccount, StaffTask, StaffKpi, InviteRecord } from "@bot/database";
import { RegisterUI } from "./RegisterUI.js";

export function registerRegisterInteractions(client) {
  client.registerInteraction("verify_human", async ({ interaction, config }) => {
    const unregRoles = config.roles?.unregistered || [];
    if (unregRoles.length > 0 && interaction.member) {
      await interaction.member.roles.add(unregRoles).catch(() => null);
    }
    await interaction.reply({
      content: "✅ İnsan doğrulamanız başarıyla tamamlandı! Kayıt odalarına ve sohbet kanallarına erişebilirsiniz.",
      ephemeral: true
    });
  });

  client.registerInteraction("reg_gender", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "registerStaff")) {
      return interaction.reply({ content: "Bu işlemi yapabilmek için yetkiniz bulunmuyor.", ephemeral: true });
    }

    const parts = interaction.customId.split(":");
    const genderType = parts[1];
    const targetId = parts[2];
    const name = parts[3];
    const age = parseInt(parts[4], 10);

    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ content: "Kullanıcı sunucuda bulunamadı.", ephemeral: true });
    }

    let rolesToAdd = [];
    let roleLabel = "";
    let genderEnum = "UNREGISTERED";

    if (genderType === "man") {
      rolesToAdd = config.roles?.man || [];
      roleLabel = "Erkek";
      genderEnum = "MAN";
    } else if (genderType === "woman") {
      rolesToAdd = config.roles?.woman || [];
      roleLabel = "Kadın";
      genderEnum = "WOMAN";
    } else {
      rolesToAdd = config.roles?.member || [];
      roleLabel = "Üye";
      genderEnum = "MEMBER";
    }

    const unregRoles = config.roles?.unregistered || [];
    if (unregRoles.length > 0) {
      await targetMember.roles.remove(unregRoles).catch(() => null);
    }

    if (rolesToAdd.length > 0) {
      await targetMember.roles.add(rolesToAdd).catch(() => null);
    }

    await UserAccount.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: targetMember.id },
      {
        $set: {
          name,
          age,
          gender: genderEnum,
          registeredBy: interaction.user.id,
          registeredAt: new Date()
        },
        $push: {
          namesHistory: {
            name,
            age,
            roleAssigned: roleLabel,
            staffId: interaction.user.id,
            date: new Date()
          }
        }
      },
      { upsert: true }
    );

    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    const year = now.getFullYear();

    await StaffTask.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: interaction.user.id, weekNumber, year },
      { $inc: { currentRegisters: 1, points: 5 } },
      { upsert: true }
    ).catch(() => null);

    await StaffKpi.findOneAndUpdate(
      { guildId: interaction.guild.id, staffId: interaction.user.id, period: "WEEKLY" },
      { $inc: { registers: 1, totalScore: 5 } },
      { upsert: true }
    ).catch(() => null);

    const regLogId = config.channels?.registerLog;
    if (regLogId) {
      const regLog = interaction.guild.channels.cache.get(regLogId);
      if (regLog) {
        regLog.send(MessageFormatter.success(
          "Kayıt İşlemi Başarılı",
          `**Kaydedilen:** ${targetMember} (\`${targetMember.id}\`)\n▫️ **Yetkili:** ${interaction.user} (\`${interaction.user.id}\`)\n▫️ **Cinsiyet / Rol:** \`${roleLabel}\`\n▫️ **İsim / Yaş:** \`${name} | ${age}\`\n-# Public Bot Ecosystem Kayıt Log Sistemi`
        )).catch(() => null);
      }
    }

    const payload = RegisterUI.formatRegisterSuccess({
      targetMember,
      staffUser: interaction.user,
      roleLabel,
      name,
      age
    });

    await interaction.update(payload);
  });

  client.registerInteraction("reg_unreg_quick", async ({ client: bot, interaction, config }) => {
    if (!bot.hasStaffPermission(interaction.member, config, "registerStaff")) {
      return interaction.reply({ content: "Bu işlemi yapabilmek için yetkiniz bulunmuyor.", ephemeral: true });
    }

    const targetId = interaction.customId.split(":")[1];
    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      return interaction.reply({ content: "Kullanıcı sunucuda bulunamadı.", ephemeral: true });
    }

    const allRegisteredRoles = [
      ...(config.roles?.man || []),
      ...(config.roles?.woman || []),
      ...(config.roles?.member || [])
    ];

    if (allRegisteredRoles.length > 0) {
      await targetMember.roles.remove(allRegisteredRoles).catch(() => null);
    }

    const unregRoles = config.roles?.unregistered || [];
    if (unregRoles.length > 0) {
      await targetMember.roles.add(unregRoles).catch(() => null);
    }

    const defaultUnregNick = config.unregisteredNick || "Kayıtsız";
    await targetMember.setNickname(defaultUnregNick).catch(() => null);

    await UserAccount.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: targetMember.id },
      { $set: { gender: "UNREGISTERED" } }
    ).catch(() => null);

    const content = `### ↩️ Kayıt Geri Alındı\n▫️ **Kullanıcı:** <@${targetMember.id}> kayıtsıza atıldı.\n▫️ **Yetkili:** <@${interaction.user.id}>\n-# Public Bot Ecosystem Kayıt Sistemi`;
    await interaction.reply(MessageFormatter.v2(content));
  });

  client.registerInteraction("reg_names_view", async ({ interaction }) => {
    const targetId = interaction.customId.split(":")[1];
    const targetUser = await interaction.guild.members.fetch(targetId).catch(() => null)
      || await interaction.client.users.fetch(targetId).catch(() => ({ id: targetId, tag: targetId }));

    const account = await UserAccount.findOne({ guildId: interaction.guild.id, userId: targetId });
    const namesHistory = account?.namesHistory || [];

    const payload = RegisterUI.formatNamesHistoryPayload({
      targetUser: targetUser.user || targetUser,
      namesHistory,
      page: 1
    });

    await interaction.reply({ ...payload, ephemeral: true });
  });

  client.registerInteraction("reg_names_nav", async ({ interaction }) => {
    const parts = interaction.customId.split(":");
    const targetId = parts[1];
    const targetPage = parseInt(parts[2], 10) || 1;

    const targetUser = await interaction.guild.members.fetch(targetId).catch(() => null)
      || await interaction.client.users.fetch(targetId).catch(() => ({ id: targetId, tag: targetId }));

    const account = await UserAccount.findOne({ guildId: interaction.guild.id, userId: targetId });
    const namesHistory = account?.namesHistory || [];

    const payload = RegisterUI.formatNamesHistoryPayload({
      targetUser: targetUser.user || targetUser,
      namesHistory,
      page: targetPage
    });

    await interaction.update(payload);
  });

  client.registerInteraction("reg_names_clear_prompt", async ({ interaction }) => {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "İsim geçmişini temizlemek için Yönetici yetkisi gereklidir.", ephemeral: true });
    }

    const targetId = interaction.customId.split(":")[1];
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reg_names_clear_confirm:${targetId}`)
        .setLabel("Evet, İsim Geçmişini Temizle")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("reg_names_clear_cancel")
        .setLabel("İptal")
        .setStyle(ButtonStyle.Secondary)
    );

    const content = `### ⚠️ İsim Geçmişini Temizleme\n<@${targetId}> kullanıcısının tüm geçmiş isim kayıtları silinecektir.\n-# Onaylıyor musunuz?`;
    await interaction.reply({ ...MessageFormatter.v2(content, [row]), ephemeral: true });
  });

  client.registerInteraction("reg_names_clear_confirm", async ({ interaction }) => {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "İsim geçmişini temizlemek için Yönetici yetkisi gereklidir.", ephemeral: true });
    }

    const targetId = interaction.customId.split(":")[1];
    await UserAccount.findOneAndUpdate(
      { guildId: interaction.guild.id, userId: targetId },
      { $set: { namesHistory: [] } }
    ).catch(() => null);

    const content = `### 🧹 İsim Geçmişi Temizlendi\n<@${targetId}> kullanıcısının tüm isim geçmişi başarıyla sıfırlandı.\n-# Yetkili: <@${interaction.user.id}>`;
    await interaction.update(MessageFormatter.v2(content));
  });

  client.registerInteraction("reg_names_clear_cancel", async ({ interaction }) => {
    await interaction.update({ content: "İşlem iptal edildi.", components: [] });
  });

  client.registerInteraction("reg_say_refresh", async ({ interaction, config }) => {
    const guild = interaction.guild;
    const totalMembers = guild.memberCount;
    const tag = config.tag;
    const tagCount = tag ? guild.members.cache.filter((m) => m.user.username.includes(tag) || m.displayName.includes(tag)).size : 0;
    const voiceCount = guild.members.cache.filter((m) => m.voice?.channelId).size;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const payload = RegisterUI.formatSayPayload({
      guild,
      total: totalMembers,
      tagged: tagCount,
      voice: voiceCount,
      boosts: boostCount
    });

    await interaction.update(payload);
  });

  client.registerInteraction("reg_davet_refresh", async ({ interaction }) => {
    const targetUserId = interaction.customId.split(":")[1];
    const record = await InviteRecord.findOne({ guildId: interaction.guildId, userId: targetUserId });
    const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => ({ id: targetUserId, username: targetUserId }));

    const regular = record?.regular || 0;
    const fake = record?.fake || 0;
    const bonus = record?.bonus || 0;
    const leaves = record?.leaves || 0;
    const total = Math.max(0, regular + bonus - leaves);

    const payload = RegisterUI.formatDavetPayload({
      targetUser,
      total,
      regular,
      fake,
      bonus,
      leaves
    });

    await interaction.update(payload);
  });
}
