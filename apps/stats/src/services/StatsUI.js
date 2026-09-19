import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0 dk";
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} dk`;
  return `${hours} sa ${remainingMinutes} dk`;
}

export class StatsUI {
  static formatUserStatPayload({ targetUser, stat, period = "all", mediaUrl = null, extraText = null }) {
    let voiceMs = stat?.totalVoiceMs || 0;
    let msgs = stat?.totalMessages || 0;
    let periodLabel = "Tüm Zamanlar";

    if (period === "weekly") {
      voiceMs = stat?.weeklyVoiceMs || 0;
      msgs = stat?.weeklyMessages || 0;
      periodLabel = "Haftalık";
    } else if (period === "daily") {
      voiceMs = stat?.dailyVoiceMs || 0;
      msgs = stat?.dailyMessages || 0;
      periodLabel = "Günlük";
    }

    const voiceDuration = formatDuration(voiceMs);
    const xp = stat?.xp || 0;
    const level = stat?.level || 1;

    const activeTitle = stat?.title ? ` ${stat.title}` : "";
    const badgesStr = (stat?.activeBadges && stat.activeBadges.length > 0)
      ? `\n▫️ **Rozetler:** ${stat.activeBadges.map((b) => `\`${b}\``).join(" ")}`
      : "";

    let content = `### 📊 Aktivite ve İstatistik: ${targetUser.tag || targetUser.username}${activeTitle}\n▫️ **Kullanıcı:** <@${targetUser.id}> (\`${targetUser.id}\`)\n▫️ **Filtre:** \`${periodLabel}\`${badgesStr}\n\n▫️ **Ses Kanalı Süresi:** \`${voiceDuration}\`\n▫️ **Gönderilen Mesaj:** \`${msgs.toLocaleString("tr-TR")} mesaj\`\n▫️ **Mevcut Seviye:** Seviye **${level}** (\`${xp.toLocaleString("tr-TR")} XP\`)\n-# Public Bot Ecosystem İstatistik Sistemi`;

    if (extraText && String(extraText).trim()) {
      content = `${String(extraText).trim()}\n\n${content}`;
    }

    const filterRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_user_period:${targetUser.id}:all`)
        .setLabel("Genel")
        .setStyle(period === "all" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_user_period:${targetUser.id}:weekly`)
        .setLabel("Haftalık")
        .setStyle(period === "weekly" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_user_period:${targetUser.id}:daily`)
        .setLabel("Günlük")
        .setStyle(period === "daily" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_level_view:${targetUser.id}`)
        .setLabel("⭐ Seviye Detayı")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_anim_view:${targetUser.id}`)
        .setLabel("📹 Hareketli")
        .setStyle(ButtonStyle.Success)
    );

    return MessageFormatter.v2(content, [filterRow], false, mediaUrl);
  }

  static formatTopStatPayload({ guild, topVoice = [], topMessages = [], category = "voice", mediaUrl = null }) {
    const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."];
    let listContent = "";
    let headerTitle = "";

    if (category === "voice") {
      headerTitle = "🎙️ En Çok Seste Kalanlar (Top 10)";
      listContent = topVoice.map((s, idx) => {
        const badge = medals[idx] || `${idx + 1}.`;
        return `▫️ ${badge} <@${s.userId}> • **${formatDuration(s.totalVoiceMs)}** (Seviye ${s.level || 1})`;
      }).join("\n") || "Veri bulunmuyor.";
    } else {
      headerTitle = "💬 En Çok Mesaj Gönderenler (Top 10)";
      listContent = topMessages.map((s, idx) => {
        const badge = medals[idx] || `${idx + 1}.`;
        return `▫️ ${badge} <@${s.userId}> • **${(s.totalMessages || 0).toLocaleString("tr-TR")} mesaj** (Seviye ${s.level || 1})`;
      }).join("\n") || "Veri bulunmuyor.";
    }

    const content = `### 🏆 Sunucu Liderlik Tablosu: ${guild.name}\n**${headerTitle}**\n\n${listContent}\n-# Güncel İstatistik Sıralaması • Public Bot Ecosystem`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_top_tab:voice`)
        .setLabel("🎙️ Ses Sıralaması")
        .setStyle(category === "voice" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_top_tab:messages`)
        .setLabel("💬 Mesaj Sıralaması")
        .setStyle(category === "messages" ? ButtonStyle.Primary : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_top_tab:refresh:${category}`)
        .setLabel("🔄 Yenile")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row], false, mediaUrl);
  }

  static formatLevelPayload({ targetMember, stat, rank, totalRanked, nextReward, mediaUrl = null }) {
    const currentLvl = stat?.level || 1;
    const currentXp = stat?.xp || 0;

    const prevLvlXp = currentLvl === 1 ? 0 : (currentLvl - 1) * (currentLvl - 1) * 100;
    const nextLvlXp = currentLvl * currentLvl * 100;
    const levelRange = Math.max(1, nextLvlXp - prevLvlXp);
    const progressInLevel = Math.max(0, currentXp - prevLvlXp);
    const percent = Math.min(100, Math.floor((progressInLevel / levelRange) * 100));

    const filled = Math.round((percent / 100) * 12);
    const empty = 12 - filled;
    const progressBar = "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty));

    let rewardInfo = "Sıradaki rol ödülü tanımlanmamış.";
    if (nextReward) {
      rewardInfo = `Seviye **${nextReward.level}** olduğunda <@&${nextReward.roleId}> rolü verilecek.`;
    }

    const content = `### ⭐ Seviye ve Deneyim Kartı: ${targetMember.displayName || targetMember.user?.username}\n▫️ **Mevcut Seviye:** Seviye **${currentLvl}**\n▫️ **Sunucu Sıralaması:** 🏆 **#${rank}** / ${totalRanked}\n▫️ **Toplam Deneyim:** ✨ \`${currentXp.toLocaleString("tr-TR")} XP\`\n\n▫️ **İlerleme: %${percent}**\n  \`[${progressBar}]\` (${progressInLevel.toLocaleString("tr-TR")} / ${levelRange.toLocaleString("tr-TR")} XP)\n\n▫️ **Sıradaki Rol:**\n  ${rewardInfo}\n-# Seviye & Deneyim Sistemi • Public Bot Ecosystem`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_user_period:${targetMember.id}:all`)
        .setLabel("📊 Genel İstatistikler")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("stats_top_tab:voice")
        .setLabel("🏆 Liderlik Tablosu")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_level_anim:${targetMember.id}`)
        .setLabel("🎬 Canlı Seviye Kartı")
        .setStyle(ButtonStyle.Success)
    );

    return MessageFormatter.v2(content, [row], false, mediaUrl);
  }

  static formatTaskPayload({ targetUser, task, currentVoiceHours, targetVoiceHours, currentMsgs, targetMsgs, currentRegs, targetRegs }) {
    function makeBar(current, target) {
      const pct = Math.min(Math.max(current / (target || 1), 0), 1);
      const f = Math.round(10 * pct);
      const e = 10 - f;
      return `[${"█".repeat(f)}${"░".repeat(e)}] %${Math.round(pct * 100)}`;
    }

    const voiceBar = makeBar(currentVoiceHours, targetVoiceHours);
    const msgBar = makeBar(currentMsgs, targetMsgs);
    const regBar = makeBar(currentRegs, targetRegs);

    const content = `### 📋 Haftalık Görev Durumu: ${targetUser.tag || targetUser.username}\n▫️ **Kullanıcı:** <@${targetUser.id}>\n▫️ **Kazanılan Puan:** \`${task?.points || 0} Puan\`\n\n▫️ **Ses Görevi:** \`${currentVoiceHours}/${targetVoiceHours} Saat\` • \`${voiceBar}\`\n▫️ **Mesaj Görevi:** \`${currentMsgs}/${targetMsgs} Mesaj\` • \`${msgBar}\`\n▫️ **Kayıt Görevi:** \`${currentRegs}/${targetRegs} Kayıt\` • \`${regBar}\`\n-# Görev Takip Sistemi • Public Bot Ecosystem`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_user_period:${targetUser.id}:weekly`)
        .setLabel("📊 Haftalık Veriler")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`stats_task_refresh:${targetUser.id}`)
        .setLabel("🔄 Yenile")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }
}
