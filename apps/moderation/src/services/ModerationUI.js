import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

export class ModerationUI {
  static formatSicilPayload({ targetUser, penalties, page = 1, totalCount = 0, totalPoints = 0, filter = "all" }) {
    const pageSize = 5;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    if (totalCount === 0) {
      const content = `### 📋 Sicil Kaydı Temiz\n▫️ **Kullanıcı:** <@${targetUser.id}> (\`${targetUser.id}\`)\n▫️ Bu kullanıcının veritabanında kayıtlı herhangi bir cezası bulunmuyor.\n-# Moderasyon Sicil Takip Sistemi`;
      return MessageFormatter.v2(content);
    }

    const lines = penalties.map((p) => {
      const ts = Math.floor(new Date(p.createdAt).getTime() / 1000);
      const statusBadge = p.active ? "🔴 Aktif" : "🟢 Tamamlandı";
      return `▫️ **#${p.caseId} [${p.type}]** • <t:${ts}:d> • Yetkili: <@${p.executorId}>\n  └ Sebep: *${p.reason}* | Puan: \`+${p.points || 0}\` | ${statusBadge}`;
    }).join("\n");

    const filterText = filter === "active" ? "Sadece Aktif Cezalar" : "Tüm Cezalar";
    const content = `### 📋 Sicil Geçmişi: ${targetUser.tag || targetUser.username}\n▫️ **Kullanıcı:** <@${targetUser.id}> (\`${targetUser.id}\`)\n▫️ **Toplam Ceza Puanı:** \`${totalPoints}\` | **Kayıt Sayısı:** \`${totalCount}\` (${filterText})\n\n${lines}\n-# Sayfa ${page} / ${totalPages} • Moderasyon Sistemi`;

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mod_sicil_nav:${targetUser.id}:${page - 1}:${filter}`)
        .setLabel("◀ Önceki")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 1),
      new ButtonBuilder()
        .setCustomId("mod_sicil_noop")
        .setLabel(`${page} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`mod_sicil_nav:${targetUser.id}:${page + 1}:${filter}`)
        .setLabel("Sonraki ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages),
      new ButtonBuilder()
        .setCustomId(`mod_sicil_filter:${targetUser.id}:${page}:${filter === "active" ? "all" : "active"}`)
        .setLabel(filter === "active" ? "Tümünü Göster" : "Sadece Aktifler")
        .setStyle(ButtonStyle.Primary)
    );

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mod_sicil_clear_prompt:${targetUser.id}`)
        .setLabel("🗑️ Sicili Temizle")
        .setStyle(ButtonStyle.Danger)
    );

    return MessageFormatter.v2(content, [navRow, actionRow]);
  }

  static formatCezaPayload(penalty) {
    const createdTs = penalty.createdAt ? Math.floor(new Date(penalty.createdAt).getTime() / 1000) : null;
    const timeStr = createdTs ? `<t:${createdTs}:F>` : "Bilinmiyor";
    const statusText = penalty.active ? "🔴 Aktif Devam Ediyor" : "🟢 Kaldırıldı / Tamamlandı";
    const durationText = penalty.durationMs ? `${Math.round(penalty.durationMs / 60000)} dakika` : "Süresiz / Belirtilmemiş";

    const lines = [
      `### ⚖️ Ceza #${penalty.caseId} Detayları`,
      `▫️ **Cezalandırılan:** <@${penalty.userId}> (\`${penalty.userId}\`)`,
      `▫️ **Uygulayan Yetkili:** <@${penalty.executorId}> (\`${penalty.executorId}\`)`,
      `▫️ **Ceza Türü:** \`${penalty.type}\``,
      `▫️ **Sebep:** ${penalty.reason || "Sebep belirtilmemiş"}`,
      `▫️ **Ceza Puanı:** \`+${penalty.points || 0}\``,
      `▫️ **Ceza Süresi:** ${durationText}`,
      `▫️ **Tarih:** ${timeStr}`,
      `▫️ **Durum:** ${statusText}`
    ];

    if (!penalty.active && penalty.liftedAt) {
      const liftedTs = Math.floor(new Date(penalty.liftedAt).getTime() / 1000);
      lines.push(`▫️ **Kaldırılma Tarihi:** <t:${liftedTs}:F>`);
      lines.push(`▫️ **Kaldıran:** ${penalty.liftedBy === "AUTO_EXPIRY" ? "Otomatik Süre Sonu" : `<@${penalty.liftedBy}>`}`);
    }

    lines.push("-# Ecosystem Moderasyon ve Ceza Takip Sistemi");

    const buttons = [];
    if (penalty.active) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`mod_penalty_lift:${penalty.caseId}`)
          .setLabel("🔓 Cezayı Kaldır")
          .setStyle(ButtonStyle.Success)
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`mod_sicil_view:${penalty.userId}`)
        .setLabel("📋 Kullanıcı Sicili")
        .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    return MessageFormatter.v2(lines.join("\n"), [row]);
  }

  static buildPunishActionRow(type, userId, caseId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`mod_unpunish:${type}:${userId}:${caseId}`)
        .setLabel("↩️ Cezayı Geri Al")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`mod_sicil_view:${userId}`)
        .setLabel("📋 Sicil Görüntüle")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  static buildLockActionRow(isLocked) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mod_lock_toggle")
        .setLabel(isLocked ? "🔓 Kanal Kilidini Aç" : "🔒 Kanalı Kilitle")
        .setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("mod_lock_timed:300000")
        .setLabel("⏱️ 5 Dakika Kilit")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("mod_lock_timed:900000")
        .setLabel("⏱️ 15 Dakika Kilit")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  static buildSlowmodeActionRow(currentSeconds = 0) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("mod_slowmode:0")
        .setLabel("Kapat (0s)")
        .setStyle(currentSeconds === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("mod_slowmode:5")
        .setLabel("5sn")
        .setStyle(currentSeconds === 5 ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("mod_slowmode:15")
        .setLabel("15sn")
        .setStyle(currentSeconds === 15 ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("mod_slowmode:60")
        .setLabel("1dk")
        .setStyle(currentSeconds === 60 ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("mod_slowmode:300")
        .setLabel("5dk")
        .setStyle(currentSeconds === 300 ? ButtonStyle.Primary : ButtonStyle.Secondary)
    );
  }

  static buildWarnActionRow(targetUserId, hasActiveWarns = false) {
    const buttons = [];
    if (hasActiveWarns) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`mod_warn_del_last:${targetUserId}`)
          .setLabel("🗑️ Son Uyarıyı Sil")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`mod_warn_del_all:${targetUserId}`)
          .setLabel("🧹 Tümünü Temizle")
          .setStyle(ButtonStyle.Danger)
      );
    }
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`mod_sicil_view:${targetUserId}`)
        .setLabel("📋 Sicili Görüntüle")
        .setStyle(ButtonStyle.Secondary)
    );
    return new ActionRowBuilder().addComponents(buttons);
  }

  static buildSnipePayload(optionsOrSniped, maybeChannelId) {
    let type = "delete";
    let records = [];
    let index = 0;
    let channelId = maybeChannelId;

    if (optionsOrSniped && Array.isArray(optionsOrSniped.records)) {
      type = optionsOrSniped.type || "delete";
      records = optionsOrSniped.records;
      index = optionsOrSniped.index || 0;
      channelId = optionsOrSniped.channelId || maybeChannelId;
    } else if (optionsOrSniped && optionsOrSniped.authorId) {
      records = [optionsOrSniped];
      channelId = maybeChannelId || optionsOrSniped.channelId;
    }

    if (records.length === 0) {
      const emptyText = type === "edit"
        ? "### ✏️ Düzenlenen Mesaj Kaydı Yok\n▫️ Bu kanalda yakın zamanda düzenlenmiş bir mesaj bulunmuyor.\n-# 🕒 Veri Hafızası : Yalnızca son düzenlenen mesajlar tutulur"
        : "### 🗑️ Silinen Mesaj Kaydı Yok\n▫️ Bu kanalda yakın zamanda silinmiş bir mesaj bulunmuyor.\n-# 🕒 Veri Hafızası : Yalnızca son silinen mesajlar tutulur";

      const toggleRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`mod_snipe_toggle:${type === "delete" ? "edit" : "delete"}:${channelId}`)
          .setLabel(type === "delete" ? "✏️ Düzenlenenleri Göster" : "🗑️ Silinenleri Göster")
          .setStyle(ButtonStyle.Secondary)
      );

      return MessageFormatter.v2(emptyText, [toggleRow]);
    }

    const safeIndex = Math.max(0, Math.min(index, records.length - 1));
    const item = records[safeIndex];

    const rawTime = type === "edit"
      ? (item.editedAt || item.timestamp || Date.now())
      : (item.deletedAt || item.timestamp || Date.now());
    const timeMs = rawTime instanceof Date ? rawTime.getTime() : (typeof rawTime === "number" ? rawTime : new Date(rawTime).getTime());
    const timeStr = !isNaN(timeMs) ? `<t:${Math.floor(timeMs / 1000)}:R>` : "Az önce";

    let content = "";
    if (type === "edit") {
      content = [
        `### ✏️ Düzenlenen Mesaj Kayıtları (${safeIndex + 1}/${records.length})`,
        `▫️ **Yazar:** <@${item.authorId}> (\`${item.authorId}\`)`,
        `▫️ **Düzenlenme Zamanı:** ${timeStr}`,
        "",
        `▫️ **Önceki İçerik:**`,
        `\`\`\``,
        `${item.previousContent || "Kayıt bulunamadı"}`,
        `\`\`\``,
        `▫️ **Yeni İçerik:**`,
        `\`\`\``,
        `${item.content || "Boş içerik"}`,
        `\`\`\``,
        `-# Snipe Takipçisi : Kanal düzenleme geçmişi`
      ].join("\n");
    } else {
      const titleStr = records.length > 1 ? `### 🗑️ Son Silinen Mesaj (${safeIndex + 1}/${records.length})` : `### 🗑️ Son Silinen Mesaj`;
      content = [
        titleStr,
        `▫️ **Yazar:** <@${item.authorId}> (\`${item.authorId}\`)`,
        `▫️ **Silinme Zamanı:** ${timeStr}`,
        "",
        `▫️ **İçerik:**`,
        `\`\`\``,
        `${item.content || "Görsel veya Dosya Eki"}`,
        `\`\`\``,
        `-# Snipe Takipçisi : Kanal silinme geçmişi`
      ].join("\n");
    }

    const buttons = [];
    if (records.length > 1) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`mod_snipe_nav:${type}:${channelId}:${safeIndex - 1}`)
          .setLabel("◀️ Önceki")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(safeIndex <= 0),
        new ButtonBuilder()
          .setCustomId(`mod_snipe_nav:${type}:${channelId}:${safeIndex + 1}`)
          .setLabel("▶️ Sonraki")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(safeIndex >= records.length - 1)
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`mod_snipe_toggle:${type === "delete" ? "edit" : "delete"}:${channelId}`)
        .setLabel(type === "delete" ? "✏️ Düzenlenenler" : "🗑️ Silinenler")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`mod_snipe_clear:${channelId}`)
        .setLabel("🧹 Hafızayı Temizle")
        .setStyle(ButtonStyle.Danger)
    );

    const row = new ActionRowBuilder().addComponents(buttons);
    return MessageFormatter.v2(content, [row]);
  }
}
