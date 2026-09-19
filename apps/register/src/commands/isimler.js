import { UserAccount } from "@bot/database";
import { RegisterUI } from "../services/RegisterUI.js";

export default {
  name: "isimler",
  aliases: ["geçmişisimler", "gecmisisimler", "names"],
  async execute({ client, message, args }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!targetUser) return message.reply("Kullanıcı bulunamadı.");

    const account = await UserAccount.findOne({ guildId: message.guild.id, userId: targetUser.id });
    const namesHistory = account?.namesHistory || [];

    const payload = RegisterUI.formatNamesHistoryPayload({
      targetUser,
      namesHistory,
      page: 1
    });

    return message.reply(payload);
  }
};
