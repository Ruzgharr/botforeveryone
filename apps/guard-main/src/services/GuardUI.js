import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

export class GuardUI {
  static formatStatusPayload({ config, latestBackup }) {
    const guardActive = config.guard?.active !== false;
    const panicActive = config.guardPanic?.enabled !== false;
    const blockBots = config.guard?.blockBots !== false;
    const blockWebhooks = config.guard?.blockWebhooks !== false;
    const permAudit = config.permissionAudit?.enabled !== false;

    const safeUsersCount = (config.guard?.safeUsers || []).length;
    const safeRolesCount = (config.guard?.safeRoles || []).length;
    const safeBotsCount = (config.guard?.safeBots || []).length;

    let backupInfo = "Henüz yedek alınmamış.";
    if (latestBackup) {
      const bTime = `<t:${Math.floor(new Date(latestBackup.createdAt).getTime() / 1000)}:R>`;
      backupInfo = `Son Yedek: ${bTime} • Tür: **${latestBackup.type}** • ID: \`${latestBackup._id.toString()}\``;
    }

    const content = `### 🛡️ Sunucu Güvenlik & Guard Durumu\n▫️ **Guard Kalkanı:** ${guardActive ? "🟢 **Aktif**" : "🔴 **Devre Dışı**"}\n▫️ **Otomatik Panik Modu:** ${panicActive ? `🟢 **Aktif** (${config.guardPanic?.threshold || 5} işlem / ${(config.guardPanic?.timeWindowMs || 5000) / 1000}s)` : "🔴 **Devre Dışı**"}\n▫️ **Yetki Denetçisi:** ${permAudit ? "🟢 **Aktif**" : "🔴 **Devre Dışı**"}\n▫️ **Bot Giriş Engeli:** ${blockBots ? "🔒 **Açık (İzinsiz botlar engellenir)**" : "🔓 **Kapalı**"}\n▫️ **Webhook Engeli:** ${blockWebhooks ? "🔒 **Açık (İzinsiz webhooklar silinir)**" : "🔓 **Kapalı**"}\n\n▫️ **Güvenli Beyaz Liste:**\n  • Üyeler: **${safeUsersCount}** | Roller: **${safeRolesCount}** | Botlar: **${safeBotsCount}**\n\n▫️ **Yedekleme Durumu:**\n  ${backupInfo}\n-# Guard sistemi sunucu güvenliğini 7/24 kesintisiz denetler.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("guard_quick_backup")
        .setLabel("💾 Şimdi Yedek Al")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("guard_backup_list")
        .setLabel("📋 Yedek Listesi")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("guard_panic_toggle")
        .setLabel("🚨 Acil Durum Kilidi")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("guard_status_refresh")
        .setLabel("🔄 Yenile")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatBackupListPayload(list = []) {
    if (!list || list.length === 0) {
      const content = `### 🗄️ Sunucu Yedekleri\n▫️ Bu sunucu için veritabanında henüz kayıtlı bir yedek bulunmuyor.\n▫️ Aşağıdaki butonla hemen tam bir sistem yedeği oluşturabilirsiniz.\n-# Public Bot Ecosystem Guard`;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("guard_quick_backup")
          .setLabel("💾 İlk Yedeği Al")
          .setStyle(ButtonStyle.Primary)
      );
      return MessageFormatter.v2(content, [row]);
    }

    const rows = list.map((item, index) => {
      const timeStr = `<t:${Math.floor(new Date(item.createdAt).getTime() / 1000)}:d>`;
      const rCount = item.roles ? item.roles.length : 0;
      const cCount = item.channels ? item.channels.length : 0;
      return `▫️ **#${index + 1} [${item.type}]** • \`${item._id.toString()}\` (${timeStr})\n  └ Roller: **${rCount}** adet | Kanallar: **${cCount}** adet`;
    }).join("\n");

    const content = `### 🗄️ Sunucu Yedek Listesi\nSon alınan ${list.length} adet sunucu yedeği aşağıda listelenmiştir:\n\n${rows}\n-# Geri yükleme için: .yedekyükle <YedekID>`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("guard_quick_backup")
        .setLabel("💾 Yeni Yedek Al")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("guard_status_refresh")
        .setLabel("🛡️ Güvenlik Durumu")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatBackupCreatedPayload(backup) {
    const roleCount = backup.roles ? backup.roles.length : 0;
    const channelCount = backup.channels ? backup.channels.length : 0;
    const timeStr = `<t:${Math.floor(new Date(backup.createdAt).getTime() / 1000)}:F>`;

    const content = `### 💾 Sunucu Yedekleme Tamamlandı\n▫️ **Yedek Kodu (ID):** \`${backup._id.toString()}\`\n▫️ **Yedek Tipi:** \`${backup.type || "MANUAL"}\`\n▫️ **Kayıt Tarihi:** ${timeStr}\n▫️ **Yedeklenen Roller:** \`${roleCount} adet\`\n▫️ **Yedeklenen Kanallar:** \`${channelCount} adet\`\n\n▫️ Geri yükleme komutu: \`.yedekyükle ${backup._id.toString()}\`\n-# Public Bot Ecosystem Guard`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("guard_backup_list")
        .setLabel("📋 Yedek Listesi")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`guard_restore_prompt:${backup._id.toString()}`)
        .setLabel("🔄 Bu Yedeği Geri Yükle")
        .setStyle(ButtonStyle.Danger)
    );

    return MessageFormatter.v2(content, [row]);
  }
}
