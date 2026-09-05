import { Penalty } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "sicil",
  aliases: ["cezalar", "geçmiş", "gecmis"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

    const penalties = await Penalty.find({ guildId: message.guild.id, userId: targetUser.id }).sort({ createdAt: -1 }).limit(10);
    const totalPoints = penalties.reduce((acc, p) => acc + (p.points || 0), 0);

    if (penalties.length === 0) {
      const payload = MessageFormatter.render("sicilClean", {
        user: targetUser,
        title: "Sicil Kaydı Temiz"
      }, config, message.guild);
      return message.reply(payload);
    }

    const records = penalties.map((p) => {
      const statusText = p.active ? "Aktif" : "Sonlandı";
      const dateStr = p.createdAt.toISOString().substring(0, 10);
      return `**#${p.caseId} [${p.type}]** - ${p.reason} | Ceza Puanı: ${p.points} | ${dateStr} (${statusText})`;
    }).join("\n");

    const payload = MessageFormatter.render("sicilRecord", {
      user: targetUser,
      points: totalPoints,
      records,
      title: `${targetUser.tag} - Sicil Geçmişi`
    }, config, message.guild);

    message.reply(payload);
  }
};
