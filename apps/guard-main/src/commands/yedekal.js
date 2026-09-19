import { MessageFormatter } from "@bot/core";
import { BackupService } from "../services/BackupService.js";
import { GuardUI } from "../services/GuardUI.js";

export default {
  name: "yedekal",
  aliases: ["backup", "yedek-al", "snapshot"],
  async execute({ message }) {
    const isOwner = message.guild.ownerId === message.author.id;
    const isAdmin = message.member.permissions.has("Administrator");
    if (!isOwner && !isAdmin) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Yedek alma işlemini yalnızca sunucu sahibi veya Yönetici yetkisine sahip yetkililer gerçekleştirebilir."));
    }

    const waitMsg = await message.reply(MessageFormatter.info("Yedek Alınıyor", "Sunucunun tüm rolleri, kanalları ve izinleri taranarak veritabanına yedekleniyor, lütfen bekleyiniz..."));

    try {
      const backup = await BackupService.createGuildBackup(message.guild, "MANUAL");
      if (!backup) {
        return waitMsg.edit(MessageFormatter.error("Hata", "Yedekleme sırasında beklenmeyen bir sorun oluştu."));
      }

      const payload = GuardUI.formatBackupCreatedPayload(backup);
      await waitMsg.edit(payload);
    } catch (err) {
      await waitMsg.edit(MessageFormatter.error("Yedekleme Başarısız", `İşlem yürütülürken hata: ${err.message || err}`));
    }
  }
};

