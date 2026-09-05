import { Penalty } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "cezapuan",
  aliases: ["puan", "cp"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

    const penalties = await Penalty.find({ guildId: message.guild.id, userId: targetUser.id, active: true });
    const currentActivePoints = penalties.reduce((acc, p) => acc + (p.points || 0), 0);
    const limit = config.limits?.pointLimit || 100;

    const payload = MessageFormatter.render("penaltyPoints", {
      user: targetUser,
      points: currentActivePoints,
      limit,
      title: "Ceza Puanı Durumu"
    }, config, message.guild);

    message.reply(payload);
  }
};
