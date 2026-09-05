import { Embeds } from "@bot/core";
import { BackupService } from "../services/BackupService.js";

export default {
  name: "yedekliste",
  aliases: ["backups", "yedekler", "yedek-liste"],
  async execute({ message }) {
    const isOwner = message.guild.ownerId === message.author.id;
    if (!isOwner && !message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Yedek listesini görüntülemek için Yönetici yetkisine sahip olmalısınız.", message.guild)] });
    }

    try {
      const list = await BackupService.listBackups(message.guild.id, 8);
      if (!list || list.length === 0) {
        return message.reply({ embeds: [Embeds.warn("Yedek Bulunamadı", "Bu sunucu için henüz kayıtlı bir yedek bulunmuyor. `.yedekal` komutu ile ilk yedeği oluşturabilirsiniz.", message.guild)] });
      }

      const embed = Embeds.base("Sunucu Yedekleri Listesi", "Aşağıda sunucunuz için alınmış son yedekler listelenmektedir. Herhangi birini geri yüklemek için `.yedekyükle <YedekID>` komutunu kullanabilirsiniz.", message.guild);

      for (const item of list) {
        const timeStr = `<t:${Math.floor(new Date(item.createdAt).getTime() / 1000)}:F>`;
        const rCount = item.roles ? item.roles.length : 0;
        const cCount = item.channels ? item.channels.length : 0;
        embed.addFields({
          name: `ID: ${item._id.toString()} (${item.type})`,
          value: `Tarih: ${timeStr}\nRoller: ${rCount} adet | Kanallar: ${cCount} adet`,
          inline: false
        });
      }

      await message.reply({ embeds: [embed] });
    } catch (err) {
      await message.reply({ embeds: [Embeds.error("Hata", `Yedek listesi getirilemedi: ${err.message || err}`, message.guild)] });
    }
  }
};
