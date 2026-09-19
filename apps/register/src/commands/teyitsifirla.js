import { UserAccount, StaffKpi } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "teyitsifirla",
  aliases: ["teyit-sıfırla", "kayitpuan-sıfırla", "teyitsıfırla"],
  async execute({ message, args }) {
    if (!message.member.permissions.has("Administrator") && message.guild.ownerId !== message.author.id) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Yetkili teyit puanlarını sıfırlamak için Yönetici yetkisine sahip olmalısınız."));
    }

    const targetUser = message.mentions.users.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).then((m) => m.user).catch(() => null) : null);

    if (!targetUser) {
      return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen teyit puanı sıfırlanacak yetkiliyi etiketleyin veya ID girin."));
    }

    const regResult = await UserAccount.updateMany(
      { guildId: message.guild.id, registeredBy: targetUser.id },
      { $set: { registeredBy: null } }
    );

    await StaffKpi.updateMany(
      { guildId: message.guild.id, staffId: targetUser.id },
      { $set: { registrationsCount: 0 } }
    );

    message.reply(MessageFormatter.success(
      "Yetkili Teyit Puanı Sıfırlandı",
      `${targetUser} yetkilisinin hanesindeki **${regResult.modifiedCount} adet kayıt** başarıyla sıfırlandı.`
    ));
  }
};
