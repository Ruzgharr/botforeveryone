import { InviteRecord } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { RegisterUI } from "../services/RegisterUI.js";

export default {
  name: "davet",
  aliases: ["invites", "davetlerim", "davetsayısı", "davetsayisi"],
  async execute({ client, message, args }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!targetUser) {
      return message.reply(MessageFormatter.warn("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı."));
    }

    const record = await InviteRecord.findOne({ guildId: message.guild.id, userId: targetUser.id });

    const regular = record?.regular || 0;
    const fake = record?.fake || 0;
    const bonus = record?.bonus || 0;
    const leaves = record?.leaves || 0;
    const total = Math.max(0, regular + bonus - leaves);

    const payload = RegisterUI.formatDavetPayload({
      targetUser,
      total,
      regular,
      fake,
      bonus,
      leaves
    });

    return message.reply(payload);
  }
};
