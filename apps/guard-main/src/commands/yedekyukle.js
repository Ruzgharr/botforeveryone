import { MessageFormatter } from "@bot/core";
import { BackupService } from "../services/BackupService.js";

export default {
  name: "yedekyukle",
  aliases: ["yedekyükle", "restore", "backup-restore"],
  async execute({ message, args }) {
    const isOwner = message.guild.ownerId === message.author.id;
    if (!isOwner && !message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Yedek yükleme işlemini sadece sunucu sahibi veya tam yetkili yöneticiler gerçekleştirebilir."));
    }

    const backupId = args[0] ? args[0].trim() : null;
    const waitMsg = await message.reply(MessageFormatter.info("Yedek Geri Yükleniyor", "Sunucu verileri taranıyor, eksik rol ve kanallar yeniden oluşturuluyor. Bu işlem birkaç saniye sürebilir..."));

    try {
      const result = await BackupService.restoreFullBackup(message.guild, backupId);
      if (!result.success) {
        return waitMsg.edit(MessageFormatter.error("Yükleme Başarısız", result.reason || "Yedek bulunamadı."));
      }

      const content = [
        `### 🔄 Yedek Geri Yükleme Tamamlandı`,
        `Sunucu yapısı başarıyla yedekten geri getirildi.`,
        "",
        `▫️ **Kullanılan Yedek ID:** \`${result.backupId}\``,
        `▫️ **Yedek Türü:** ${result.type || "Bilinmiyor"}`,
        `▫️ **Yedek Tarihi:** <t:${Math.floor(new Date(result.backupTime).getTime() / 1000)}:R>`,
        `▫️ **Kurtarılan Roller:** ${result.rolesRestored} adet rol oluşturuldu`,
        `▫️ **Kurtarılan Kanallar:** ${result.channelsRestored} adet kanal oluşturuldu`,
        "",
        `-# Güvenlik nedeniyle yetkiler kontrol edilmeli ve bot rol sıralaması gözden geçirilmelidir.`
      ].join("\n");

      await waitMsg.edit({ content, embeds: [], components: [] });
    } catch (err) {
      await waitMsg.edit(MessageFormatter.error("Hata Oluştu", `Yedek yükleme sırasında istisna: ${err.message || err}`));
    }
  }
};

