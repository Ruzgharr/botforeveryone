import { InviteRecord } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "davetekle",
  aliases: ["davet-ekle", "addinvites", "bonusdavet"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu yalnızca sunucu yöneticileri kullanabilir."));
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const amount = parseInt(args[1], 10);

    if (!targetUser || isNaN(amount)) {
      return message.reply(MessageFormatter.warn(
        "Eksik Bilgi",
        `Lütfen formatı doğru kullanın: \`${config.prefix || "."}davetekle @kullanıcı 5\``
      ));
    }

    const updated = await InviteRecord.findOneAndUpdate(
      { guildId: message.guild.id, userId: targetUser.id },
      { $inc: { bonus: amount } },
      { upsert: true, new: true }
    );

    message.reply(MessageFormatter.success(
      "Bonus Davet Güncellendi",
      `${targetUser} kullanıcısına **${amount}** adet bonus davet tanımlandı.\n▫️ **Güncel Bonus:** \`${updated.bonus}\``
    ));
  }
};
