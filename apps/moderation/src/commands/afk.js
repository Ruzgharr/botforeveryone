import { MessageFormatter } from "@bot/core";

export default {
  name: "afk",
  aliases: ["away"],
  async execute({ client, message, args, config }) {
    const reason = args.join(" ") || "Şu anda uzaktayım";

    if (!client.afkUsers) {
      client.afkUsers = new Map();
    }

    client.afkUsers.set(message.author.id, {
      reason,
      timestamp: Date.now()
    });

    if (message.member?.manageable && !message.member.displayName.startsWith("[AFK]")) {
      await message.member.setNickname(`[AFK] ${message.member.displayName}`).catch(() => null);
    }

    const payload = MessageFormatter.render("afkSet", {
      user: message.author,
      reason,
      title: "AFK Moduna Geçildi"
    }, config, message.guild);

    message.reply(payload);
  }
};
