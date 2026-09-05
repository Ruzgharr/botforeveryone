import { Stat } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "topseviye",
  aliases: ["topxp", "toplevel", "seviyelider"],
  async execute({ message }) {
    const topStats = await Stat.find({ guildId: message.guild.id })
      .sort({ level: -1, xp: -1 })
      .limit(10);

    if (!topStats || topStats.length === 0) {
      return message.reply({ embeds: [Embeds.warn("Kayıt Yok", "Sunucuda henüz seviye kaydı bulunan üye bulunmuyor.", message.guild)] });
    }

    const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."];
    const lines = topStats.map((s, idx) => {
      const badge = medals[idx] || `${idx + 1}.`;
      return `${badge} <@${s.userId}> : **Seviye ${s.level || 1}** (${(s.xp || 0).toLocaleString("tr-TR")} XP)`;
    });

    const embed = Embeds.base(
      "🏆 Seviye ve Deneyim Lider Tablosu",
      `Aşağıda sunucunun en yüksek seviyeye ulaşmış ilk 10 üyesi listelenmektedir:\n\n${lines.join("\n")}`,
      message.guild
    ).setFooter({ text: "Seviye Sıralaması | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.reply({ embeds: [embed] });
  }
};
