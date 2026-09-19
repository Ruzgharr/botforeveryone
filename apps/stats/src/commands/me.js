import { ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } from "discord.js";
import { MessageFormatter, VisualCard } from "@bot/core";
import { Stat } from "@bot/database";

function createProgressBar(current, max, length = 10) {
  const percentage = Math.min(Math.max(current / max, 0), 1);
  const filled = Math.round(length * percentage);
  const empty = length - filled;
  return "█".repeat(filled) + "░".repeat(empty);
}

export default {
  name: "me",
  aliases: ["profil", "ben"],
  async execute({ client, message, args, config }) {
    const isExplicitAnimated = args.some((a) => ["video", "anim", "hareketli", "--video", "gif", "mp4"].includes(a.toLowerCase()));
    const format = args.some((a) => a.toLowerCase() === "mp4") ? "mp4" : "gif";

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);
    if (!targetMember) {
      return message.reply(MessageFormatter.warn("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı."));
    }

    const stat = await Stat.findOne({ guildId: message.guild.id, userId: targetMember.id });
    const isAnimated = isExplicitAnimated || Boolean(stat?.cardAnimated);
    const theme = stat?.cardTheme || "sakura";

    const totalMsgs = stat?.totalMessages || 0;
    const totalVoiceMs = stat?.totalVoiceMs || 0;
    const voiceHours = Math.floor(totalVoiceMs / 3600000);
    const voiceMinutes = Math.floor((totalVoiceMs % 3600000) / 60000);

    const level = stat?.level || 1;
    const xp = stat?.xp || 0;
    const requiredXp = level * level * 100;
    const prevLevelXp = (level - 1) * (level - 1) * 100;
    const currentProgressXp = Math.max(0, xp - prevLevelXp);
    const currentGoalXp = Math.max(1, requiredXp - prevLevelXp);
    const progressBar = createProgressBar(currentProgressXp, currentGoalXp, 12);
    const percentNum = Math.floor((currentProgressXp / currentGoalXp) * 100);

    const joinedDate = targetMember.joinedAt ? targetMember.joinedAt.toLocaleDateString("tr-TR") : "Bilinmiyor";
    const createdDate = targetMember.user.createdAt ? targetMember.user.createdAt.toLocaleDateString("tr-TR") : "Bilinmiyor";

    const topRoles = targetMember.roles.cache
      .filter((r) => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .first(4)
      .map((r) => `<@&${r.id}>`)
      .join(" ") || "Rol yok";

    const activeTitle = stat?.title ? ` ${stat.title}` : "";
    const activeBadgesList = (stat?.activeBadges && stat.activeBadges.length > 0)
      ? stat.activeBadges.map((b) => `\`${b}\``).join(" ")
      : "";

    const content = [
      `### 👤 ${targetMember.displayName}${activeTitle} Profili`,
      `▫️ **Seviye:** ⭐ Seviye ${level} | **XP:** ${xp.toLocaleString("tr-TR")} / ${requiredXp.toLocaleString("tr-TR")}`,
      `▫️ **İlerleme:** \`[${progressBar}]\` %${percentNum}`,
      `▫️ **Aktif Kart Teması:** \`${theme.toUpperCase()}\`${isAnimated ? " 🌸 (Canlı Video / Hareketli)" : ""}`,
      activeBadgesList ? `▫️ **Kuşanılan Rozetler:** ${activeBadgesList}` : null,
      "",
      `▫️ **Aktivite Verileri:**`,
      `  • Toplam Mesaj: **${totalMsgs.toLocaleString("tr-TR")} mesaj**`,
      `  • Toplam Ses: **${voiceHours} saat ${voiceMinutes} dakika**`,
      "",
      `▫️ **Tarih Bilgileri:**`,
      `  • Sunucuya Katılım: \`${joinedDate}\``,
      `  • Hesap Oluşturma: \`${createdDate}\``,
      "",
      `▫️ **Öne Çıkan Roller:**`,
      `  ${topRoles}`,
      "",
      `-# Veriler sunucu veri tabanından anlık olarak derlenmiştir.`
    ].filter((l) => l !== null && l !== undefined).join("\n");

    let attachment = null;
    let fileName = null;
    try {
      if (isAnimated) {
        const ext = format === "mp4" ? "mp4" : "gif";
        fileName = `profile-card.${ext}`;
        const animBuffer = await VisualCard.renderAnimatedUserStatCard({
          user: targetMember.user,
          periodText: "Profil",
          voiceHours,
          messageCount: totalMsgs,
          level,
          rank: 1,
          theme,
          format,
          title: stat?.title || "",
          badges: stat?.activeBadges || []
        });
        attachment = new AttachmentBuilder(animBuffer, { name: fileName });
      } else {
        fileName = "profile-card.png";
        const cardBuffer = await VisualCard.renderUserStatCard({
          user: targetMember.user,
          periodText: "Profil",
          voiceHours,
          messageCount: totalMsgs,
          level,
          rank: 1,
          theme,
          title: stat?.title || "",
          badges: stat?.activeBadges || []
        });
        attachment = new AttachmentBuilder(cardBuffer, { name: fileName });
      }
    } catch {}

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_user_period:${targetMember.id}:all`)
        .setLabel("📊 İstatistik")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`stats_level_view:${targetMember.id}`)
        .setLabel("⭐ Seviye Detayı")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_anim_view:${targetMember.id}`)
        .setLabel("🎬 Canlı Kart")
        .setStyle(ButtonStyle.Success)
    );

    const payload = MessageFormatter.v2(
      content,
      [row],
      false,
      attachment && fileName ? `attachment://${fileName}` : null
    );

    return message.reply({
      ...payload,
      files: attachment ? [attachment] : []
    });
  }
};

