import { Penalty } from "@bot/database";
import { ModerationUI } from "../services/ModerationUI.js";

export default {
  name: "sicil",
  aliases: ["cezalar", "geçmiş", "gecmis"],
  async execute({ client, message, args }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!targetUser) return message.reply("Kullanıcı bulunamadı.");

    const pageSize = 5;
    const page = 1;
    const totalCount = await Penalty.countDocuments({ guildId: message.guild.id, userId: targetUser.id });
    const allPenalties = await Penalty.find({ guildId: message.guild.id, userId: targetUser.id });
    const totalPoints = allPenalties.reduce((acc, p) => acc + (p.points || 0), 0);

    const penalties = await Penalty.find({ guildId: message.guild.id, userId: targetUser.id })
      .sort({ createdAt: -1 })
      .limit(pageSize);

    const payload = ModerationUI.formatSicilPayload({
      targetUser,
      penalties,
      page,
      totalCount,
      totalPoints,
      filter: "all"
    });

    return message.reply(payload);
  }
};
