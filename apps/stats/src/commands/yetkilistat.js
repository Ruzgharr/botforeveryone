import { Stat, UserAccount, Penalty, StaffTask } from "@bot/database";
import { Embeds } from "@bot/core";

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0 dk";
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} dk`;
  return `${hours} sa ${remainingMinutes} dk`;
}

export default {
  name: "yetkilistat",
  aliases: ["ystat", "staffstat", "yetkilibilgi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Yetkili istatistiklerini görüntülemek için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetMember = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetMember || targetMember.user.bot) {
      return message.reply({ embeds: [Embeds.warn("Hata", "Geçerli bir yetkili üye belirtmelisiniz.", message.guild)] });
    }

    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    const year = now.getFullYear();

    const [stat, regCount, penaltyCount, task] = await Promise.all([
      Stat.findOne({ guildId: message.guild.id, userId: targetMember.id }),
      UserAccount.countDocuments({ guildId: message.guild.id, staffId: targetMember.id }),
      Penalty.countDocuments({ guildId: message.guild.id, staffId: targetMember.id }),
      StaffTask.findOne({ guildId: message.guild.id, userId: targetMember.id, weekNumber, year })
    ]);

    const voiceStr = formatDuration(stat?.totalVoiceMs || 0);
    const msgCount = (stat?.totalMessages || 0).toLocaleString("tr-TR");

    const taskVoice = formatDuration(task?.currentVoiceMs || 0);
    const taskMsg = (task?.currentMessages || 0).toLocaleString("tr-TR");
    const taskCompleted = task?.completed ? "✅ Tamamlandı" : "⏳ Devam Ediyor";

    const embed = Embeds.base(`Yetkili Performans Raporu: ${targetMember.displayName}`, null, message.guild)
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "Yetkili Üye", value: `${targetMember} (\`${targetMember.id}\`)`, inline: true },
        { name: "En Yüksek Yetki Rolü", value: `${targetMember.roles.highest}`, inline: true },
        { name: "Toplam Kayıt Sayısı", value: `📋 **${regCount} üye** teyit edildi`, inline: true },
        { name: "Toplam Ceza İşlemi", value: `⚖️ **${penaltyCount} adet** ceza verildi`, inline: true },
        { name: "Genel Ses Süresi", value: `🎙️ **${voiceStr}**`, inline: true },
        { name: "Genel Mesaj Sayısı", value: `💬 **${msgCount} mesaj**`, inline: true },
        {
          name: `Haftalık Görev Durumu (${year}/${weekNumber}. Hafta)`,
          value: `• Ses İlerlemesi: **${taskVoice}**\n• Mesaj İlerlemesi: **${taskMsg}**\n• Durum: **${taskCompleted}**`,
          inline: false
        }
      )
      .setFooter({ text: "Yetkili Denetim ve Performans Sistemi | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.reply({ embeds: [embed] });
  }
};
