import { Stat } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "topseviye",
  aliases: ["topxp", "toplevel", "seviyelider"],
  async execute({ message }) {
    const topStats = await Stat.find({ guildId: message.guild.id })
      .sort({ level: -1, xp: -1 })
      .limit(10);

    if (!topStats || topStats.length === 0) {
      return message.reply(MessageFormatter.warn("Kayıt Yok", "Sunucuda henüz seviye kaydı bulunan üye bulunmuyor."));
    }

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const lines = topStats.map((s, idx) => {
      const badge = medals[idx] || `${idx + 1}.`;
      return `▫️ ${badge} <@${s.userId}> : **Seviye ${s.level || 1}** (${(s.xp || 0).toLocaleString("tr-TR")} XP)`;
    });

    const content = [
      `### 🏆 ${message.guild.name} - Seviye Lider Tablosu`,
      `Sunucunun en yüksek seviyeye ulaşmış ilk 10 üyesi:`,
      "",
      lines.join("\n"),
      "",
      `-# Aktif olarak mesaj yazarak ve seste vakit geçirerek XP kazanabilirsiniz.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

