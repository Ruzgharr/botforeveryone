import { MessageFormatter } from "@bot/core";
import { BackupService } from "../services/BackupService.js";
import { GuardUI } from "../services/GuardUI.js";

export default {
  name: "yedekliste",
  aliases: ["backups", "yedekler", "yedek-liste"],
  async execute({ message }) {
    const isOwner = message.guild.ownerId === message.author.id;
    if (!isOwner && !message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Yedek listesini görüntülemek için Yönetici yetkisine sahip olmalısınız."));
    }

    try {
      const list = await BackupService.listBackups(message.guild.id, 8);
      const payload = GuardUI.formatBackupListPayload(list);
      return message.reply(payload);
    } catch (err) {
      return message.reply(MessageFormatter.error("Hata", `Yedek listesi getirilemedi: ${err.message || err}`));
    }
  }
};

