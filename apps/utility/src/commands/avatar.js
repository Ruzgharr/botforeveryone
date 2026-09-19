import { MessageFormatter } from "@bot/core";
import { UtilityUI } from "../services/UtilityUI.js";

export default {
  name: "avatar",
  aliases: ["av", "pp"],
  async execute({ client, message, args }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!targetUser) {
      return message.reply(MessageFormatter.error("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı."));
    }

    const avatarUrl = targetUser.displayAvatarURL({ size: 2048, dynamic: true });
    const payload = UtilityUI.formatAvatarPayload({ targetUser, avatarUrl });
    return message.reply(payload);
  }
};

