import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { Backup } from "@bot/database";
import { BackupService } from "./BackupService.js";
import { GuardUI } from "./GuardUI.js";

export function registerGuardInteractions(client) {
  client.registerInteraction("guard_quick_backup", async ({ interaction }) => {
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "Bu işlem için Yönetici yetkisi gereklidir.", ephemeral: true });
    }

    await interaction.deferReply();
    try {
      const backup = await BackupService.createGuildBackup(interaction.guild, "MANUAL");
      if (!backup) {
        return interaction.editReply(MessageFormatter.error("Hata", "Yedek oluşturulamadı."));
      }
      const payload = GuardUI.formatBackupCreatedPayload(backup);
      await interaction.editReply(payload);
    } catch (err) {
      await interaction.editReply(MessageFormatter.error("Hata", `Yedekleme hatası: ${err.message || err}`));
    }
  });

  client.registerInteraction("guard_backup_list", async ({ interaction }) => {
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "Yedekleri görüntülemek için yetkiniz bulunmuyor.", ephemeral: true });
    }

    const list = await BackupService.listBackups(interaction.guildId, 6);
    const payload = GuardUI.formatBackupListPayload(list);
    await interaction.reply({ ...payload, ephemeral: true });
  });

  client.registerInteraction("guard_status_refresh", async ({ client: bot, interaction }) => {
    const config = await bot.getGuildConfig(interaction.guildId);
    const latestBackup = await Backup.findOne({ guildId: interaction.guildId }).sort({ createdAt: -1 });

    const payload = GuardUI.formatStatusPayload({ config, latestBackup });
    await interaction.update(payload);
  });

  client.registerInteraction("guard_panic_toggle", async ({ interaction }) => {
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "Panik modunu kontrol etmek için Yönetici yetkisi gereklidir.", ephemeral: true });
    }

    const channels = interaction.guild.channels.cache.filter((c) => c.isTextBased() && !c.isThread());
    let lockedCount = 0;

    for (const channel of channels.values()) {
      const current = channel.permissionOverwrites.cache.get(interaction.guild.id);
      const isLocked = current?.deny.has(PermissionFlagsBits.SendMessages);
      if (!isLocked) {
        await channel.permissionOverwrites.edit(interaction.guild.id, {
          SendMessages: false
        }).catch(() => null);
        lockedCount++;
      }
    }

    const content = `### 🚨 Panik Kilidi Uygulandı\n▫️ **İşlem Yapan:** <@${interaction.user.id}>\n▫️ **Kilitlenen Kanal:** \`${lockedCount} kanal\`\n▫️ Sunucu güvenliği sağlanana kadar metin kanallarına mesaj gönderimi engellendi.\n-# Public Bot Ecosystem Guard`;
    await interaction.reply(MessageFormatter.v2(content));
  });

  client.registerInteraction("guard_restore_prompt", async ({ interaction }) => {
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "Geri yükleme yapmak için sunucu sahibi veya yönetici olmalısınız.", ephemeral: true });
    }

    const backupId = interaction.customId.split(":")[1];
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`guard_restore_confirm:${backupId}`)
        .setLabel("Evet, Bu Yedeği Geri Yükle")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("guard_restore_cancel")
        .setLabel("İptal")
        .setStyle(ButtonStyle.Secondary)
    );

    const content = `### ⚠️ Yedek Geri Yükleme Onayı\n▫️ **Yedek ID:** \`${backupId}\`\n▫️ Bu işlem sunucudaki eksik rol ve kanalları tekrar oluşturacaktır. Devam etmek istiyor musunuz?\n-# Onayınız bekleniyor.`;
    await interaction.reply({ ...MessageFormatter.v2(content, [row]), ephemeral: true });
  });

  client.registerInteraction("guard_restore_confirm", async ({ interaction }) => {
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    if (!isOwner && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "Yetki yetersiz.", ephemeral: true });
    }

    const backupId = interaction.customId.split(":")[1];
    await interaction.update({ content: "🔄 Geri yükleme işlemi başlatıldı, lütfen bekleyin...", components: [] });

    const result = await BackupService.restoreFullBackup(interaction.guild, backupId);
    if (!result.success) {
      return interaction.followUp({ content: `❌ Yükleme başarısız: ${result.reason || "Bilinmeyen hata"}`, ephemeral: true });
    }

    const content = `### 🔄 Yedek Geri Yükleme Tamamlandı\n▫️ **Kullanılan Yedek:** \`${backupId}\`\n▫️ **Kurtarılan Roller:** \`${result.rolesRestored} adet\`\n▫️ **Kurtarılan Kanallar:** \`${result.channelsRestored} adet\`\n-# Public Bot Ecosystem Guard`;
    await interaction.followUp(MessageFormatter.v2(content));
  });

  client.registerInteraction("guard_restore_cancel", async ({ interaction }) => {
    await interaction.update({ content: "Geri yükleme işlemi iptal edildi.", components: [] });
  });
}
