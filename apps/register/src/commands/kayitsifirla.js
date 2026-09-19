import { UserAccount } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "kayitsifirla",
  aliases: ["kayıt-sıfırla", "isimler-sıfırla", "kayitsıfırla"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator") && !client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Kayıt verilerini sıfırlamak için Yönetici yetkisine sahip olmalısınız."));
    }

    const targetUser = message.mentions.users.first()
      || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);

    if (!targetUser) {
      return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen kayıt geçmişi sıfırlanacak kullanıcıyı etiketleyin veya ID girin."));
    }

    const account = await UserAccount.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!account) {
      return message.reply(MessageFormatter.warn("Kayıt Yok", "Bu kullanıcının veritabanında herhangi bir kayıt geçmişi bulunmuyor."));
    }

    const deletedNamesCount = account.namesHistory ? account.namesHistory.length : 0;

    await UserAccount.updateOne(
      { guildId: message.guild.id, userId: targetUser.id },
      {
        $set: {
          name: "",
          age: 0,
          gender: "UNREGISTERED",
          registeredBy: null,
          registeredAt: null,
          namesHistory: []
        }
      }
    );

    message.reply(MessageFormatter.success(
      "Kayıt Verileri Sıfırlandı",
      `${targetUser} kullanıcısının isim geçmişi (${deletedNamesCount} adet eski isim) ve kayıt sicili başarıyla temizlendi.`
    ));
  }
};
