import { MessageFormatter } from "@bot/core";
import { ClanService } from "../services/ClanService.js";

export default {
  name: "klantop",
  aliases: ["klan-top", "clantop", "loncatop", "klanlar"],
  async execute({ message, args, config }) {
    const topClans = await ClanService.getTopClans(message.guild.id, 10);

    if (!topClans || topClans.length === 0) {
      return message.reply(MessageFormatter.warn(
        "Klan Bulunmuyor",
        "Sunucuda henüz kurulmuş aktif bir klan bulunmuyor.\n▫️ Yeni bir klan kurmak için: `.klan kur <İsim> [Etiket]`"
      ));
    }

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const rows = topClans.map((clan, index) => {
      const medal = medals[index] || `#${index + 1}`;
      return `${medal} ${clan.badge} **${clan.name}** \`[${clan.tag}]\`\n  • Seviye: **Seviye ${clan.level}** (\`${(clan.xp || 0).toLocaleString("tr-TR")} XP\`)\n  • Kasa: **${(clan.vault || 0).toLocaleString("tr-TR")} Coin** | Üye: **${(clan.members || []).length}/${clan.maxMembers || 15}**`;
    }).join("\n\n");

    const content = [
      `# 🏆 Sunucu Klan Liderlik Tablosu`,
      `Sunucudaki en güçlü, en zengin ve en aktif klanların canlı sıralaması:`,
      "",
      rows,
      "",
      `-# 💡 Kendi klanınızı kurmak için: \`.klan kur <İsim>\`, klan detayları için: \`.klan bilgi <İsim>\``
    ].join("\n");

    return message.reply(MessageFormatter.v2(content, []));
  }
};
