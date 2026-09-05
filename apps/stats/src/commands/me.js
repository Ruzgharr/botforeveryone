import { Embeds } from "@bot/core";
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
    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);
    if (!targetMember) {
      return message.reply({ embeds: [Embeds.warn("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı.", message.guild)] });
    }

    const stat = await Stat.findOne({ guildId: message.guild.id, userId: targetMember.id });

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
      .first(3)
      .map((r) => `<@&${r.id}>`)
      .join(" ") || "Rol yok";

    const description = [
      `### 👤 ${targetMember.displayName}`,
      `**Seviye:** ${level} | **XP:** ${xp} / ${requiredXp}`,
      `\`[${progressBar}]\` %${percentNum}`,
      "",
      "**📊 Aktivite Özeti**",
      `• **Toplam Mesaj:** \`${totalMsgs}\` mesaj`,
      `• **Toplam Ses:** \`${voiceHours} saat ${voiceMinutes} dakika\``,
      "",
      "**📅 Tarih Bilgileri**",
      `• **Sunucuya Katılım:** \`${joinedDate}\``,
      `• **Hesap Kuruluşu:** \`${createdDate}\``,
      "",
      "**🏷️ Başlıca Roller**",
      topRoles
    ].join("\n");

    message.reply({
      embeds: [
        Embeds.info(`${targetMember.user.username} - Kullanıcı Profili`, description, message.guild)
      ]
    });
  }
};
