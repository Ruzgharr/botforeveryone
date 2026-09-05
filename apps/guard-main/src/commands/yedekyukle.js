import { Embeds } from "@bot/core";
import { BackupService } from "../services/BackupService.js";

export default {
  name: "yedekyukle",
  aliases: ["yedekyükle", "restore", "backup-restore"],
  async execute({ message, args }) {
    const isOwner = message.guild.ownerId === message.author.id;
    if (!isOwner && !message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Yedek yükleme işlemini sadece sunucu sahibi veya tam yetkili yöneticiler gerçekleştirebilir.", message.guild)] });
    }

    const backupId = args[0] ? args[0].trim() : null;
    const waitMsg = await message.reply({ embeds: [Embeds.info("Yedek Geri Yükleniyor", "Sunucu verileri taranıyor, eksik rol ve kanallar yeniden oluşturuluyor. Bu işlem birkaç saniye sürebilir...", message.guild)] });

    try {
      const result = await BackupService.restoreFullBackup(message.guild, backupId);
      if (!result.success) {
        return waitMsg.edit({ embeds: [Embeds.error("Yükleme Başarısız", result.reason || "Yedek bulunamadı.", message.guild)] });
      }

      const embed = Embeds.success("Yedek Geri Yükleme Tamamlandı", "Sunucu yapısı başarıyla yedekten geri getirildi.", message.guild)
        .addFields(
          { name: "Kullanılan Yedek ID", value: `\`${result.backupId}\``, inline: true },
          { name: "Yedek Türü", value: result.type || "Bilinmiyor", inline: true },
          { name: "Yedek Tarihi", value: `<t:${Math.floor(new Date(result.backupTime).getTime() / 1000)}:R>`, inline: false },
          { name: "Kurtarılan Roller", value: `${result.rolesRestored} adet rol oluşturuldu`, inline: true },
          { name: "Kurtarılan Kanallar", value: `${result.channelsRestored} adet kanal oluşturuldu`, inline: true }
        );

      await waitMsg.edit({ embeds: [embed] });
    } catch (err) {
      await waitMsg.edit({ embeds: [Embeds.error("Hata Oluştu", `Yedek yükleme sırasında istisna: ${err.message || err}`, message.guild)] });
    }
  }
};
