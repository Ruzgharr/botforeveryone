import { Embeds } from "@bot/core";
import { BackupService } from "../services/BackupService.js";

export default {
  name: "yedekal",
  aliases: ["backup", "yedek-al", "snapshot"],
  async execute({ message }) {
    const isOwner = message.guild.ownerId === message.author.id;
    const isAdmin = message.member.permissions.has("Administrator");
    if (!isOwner && !isAdmin) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Yedek alma işlemini yalnızca sunucu sahibi veya Yönetici yetkisine sahip yetkililer gerçekleştirebilir.", message.guild)] });
    }

    const waitMsg = await message.reply({ embeds: [Embeds.info("Yedek Alınıyor", "Sunucunun tüm rolleri, kanalları ve izinleri taranarak veritabanına yedekleniyor, lütfen bekleyiniz...", message.guild)] });

    try {
      const backup = await BackupService.createGuildBackup(message.guild, "MANUAL");
      if (!backup) {
        return waitMsg.edit({ embeds: [Embeds.error("Hata", "Yedekleme sırasında beklenmeyen bir sorun oluştu.", message.guild)] });
      }

      const roleCount = backup.roles ? backup.roles.length : 0;
      const channelCount = backup.channels ? backup.channels.length : 0;

      const embed = Embeds.success("Manuel Yedekleme Tamamlandı", "Sunucu verileri başarıyla MongoDB kalıcı hafızasına kaydedildi.", message.guild)
        .addFields(
          { name: "Yedek Kodu (ID)", value: `\`${backup._id.toString()}\``, inline: true },
          { name: "Yedek Tipi", value: "MANUEL", inline: true },
          { name: "Kayıt Tarihi", value: `<t:${Math.floor(new Date(backup.createdAt).getTime() / 1000)}:F>`, inline: false },
          { name: "Yedeklenen Roller", value: `${roleCount} adet rol`, inline: true },
          { name: "Yedeklenen Kanallar", value: `${channelCount} adet kanal`, inline: true },
          { name: "Geri Yükleme Komutu", value: `\`.yedekyükle ${backup._id.toString()}\``, inline: false }
        );

      await waitMsg.edit({ embeds: [embed] });
    } catch (err) {
      await waitMsg.edit({ embeds: [Embeds.error("Yedekleme Başarısız", `İşlem yürütülürken hata: ${err.message || err}`, message.guild)] });
    }
  }
};
