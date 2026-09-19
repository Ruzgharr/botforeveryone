import { Stat, UserAccount, Penalty, StaffTask } from "@bot/database";
import { MessageFormatter } from "@bot/core";

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
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Yetkili istatistiklerini görüntülemek için yetkiniz bulunmuyor."));
    }

    const targetMember = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetMember || targetMember.user.bot) {
      return message.reply(MessageFormatter.warn("Hata", "Geçerli bir yetkili üye belirtmelisiniz."));
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

    const content = [
      `### 🛡️ Yetkili Performans Raporu: ${targetMember.displayName}`,
      `▫️ **Yetkili:** ${targetMember} (\`${targetMember.id}\`)`,
      `▫️ **En Yüksek Rol:** ${targetMember.roles.highest}`,
      `▫️ **Kayıt Sayısı:** 📋 **${regCount} üye** teyit edildi`,
      `▫️ **Ceza İşlemi:** ⚖️ **${penaltyCount} adet** ceza uygulandı`,
      `▫️ **Genel Ses Süresi:** 🎙️ **${voiceStr}**`,
      `▫️ **Genel Mesaj:** 💬 **${msgCount} mesaj**`,
      "",
      `▫️ **Haftalık Görev Durumu (${year}/${weekNumber}. Hafta):**`,
      `  • Ses: **${taskVoice}**`,
      `  • Mesaj: **${taskMsg}**`,
      `  • Görev Durumu: **${taskCompleted}**`,
      "",
      `-# Yetkili Denetim & Performans Sistemi | Public Bot Ecosystem`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

