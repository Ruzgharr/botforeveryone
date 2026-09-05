import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "coin",
  aliases: ["bakiye", "para", "c"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!profile) {
      profile = await Economy.create({ guildId: message.guild.id, userId: targetUser.id });
    }

    const payload = MessageFormatter.render("coinBalance", {
      user: targetUser,
      wallet: profile.wallet,
      bank: profile.bank,
      title: `${targetUser.tag} - Bakiye Durumu`
    }, config, message.guild);

    message.reply(payload);
  }
};
