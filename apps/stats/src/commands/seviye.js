import { Stat } from "@bot/database";
import { Embeds } from "@bot/core";

function createProgressBar(percent, length = 12) {
  const filled = Math.round((percent / 100) * length);
  const empty = length - filled;
  return "█".repeat(Math.max(0, filled)) + "░".repeat(Math.max(0, empty));
}

export default {
  name: "seviye",
  aliases: ["rank", "level", "xp"],
  async execute({ message, args, config }) {
    const targetMember = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetMember || targetMember.user.bot) {
      return message.reply({ embeds: [Embeds.warn("Uyarı", "Botların veya bulunamayan kullanıcıların seviye bilgisi görüntülenemez.", message.guild)] });
    }

    const stat = await Stat.findOne({ guildId: message.guild.id, userId: targetMember.id });
    const currentLvl = stat?.level || 1;
    const currentXp = stat?.xp || 0;

    const prevLvlXp = currentLvl === 1 ? 0 : (currentLvl - 1) * (currentLvl - 1) * 100;
    const nextLvlXp = currentLvl * currentLvl * 100;
    const levelRange = Math.max(1, nextLvlXp - prevLvlXp);
    const progressInLevel = Math.max(0, currentXp - prevLvlXp);
    const percent = Math.min(100, Math.floor((progressInLevel / levelRange) * 100));
    const progressBar = createProgressBar(percent, 14);

    const rank = await Stat.countDocuments({ guildId: message.guild.id, xp: { $gt: currentXp } }) + 1;
    const totalRanked = await Stat.countDocuments({ guildId: message.guild.id });

    const rewards = config.leveling?.roleRewards || [];
    const nextReward = rewards.find((r) => r.level > currentLvl);
    let rewardInfo = "Sıradaki ödül bulunmuyor.";
    if (nextReward) {
      rewardInfo = `Seviye **${nextReward.level}** olduğunuzda <@&${nextReward.roleId}> rolü verilecek.`;
    }

    const embed = Embeds.base(`Seviye Kartı: ${targetMember.displayName}`, null, message.guild)
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "Mevcut Seviye", value: `⭐ **Seviye ${currentLvl}**`, inline: true },
        { name: "Sunucu Sıralaması", value: `🏆 **#${rank}** / ${totalRanked}`, inline: true },
        { name: "Toplam Deneyim (XP)", value: `✨ **${currentXp.toLocaleString("tr-TR")} XP**`, inline: true },
        {
          name: `İlerleme Durumu: %${percent}`,
          value: `\`${progressBar}\` (${progressInLevel.toLocaleString("tr-TR")} / ${levelRange.toLocaleString("tr-TR")} XP)`,
          inline: false
        },
        { name: "Sıradaki Rol Ödülü", value: rewardInfo, inline: false }
      )
      .setFooter({ text: "Seviye & XP Sistemi | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.reply({ embeds: [embed] });
  }
};
