import { Penalty } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "siciltemizle",
  aliases: ["sicil-temizle", "clearsicil"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu yalnızca sunucu yöneticileri kullanabilir.", message.guild)] });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen sicili temizlenecek kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    const result = await Penalty.updateMany(
      { guildId: message.guild.id, userId: targetUser.id, active: true },
      { $set: { active: false, liftedAt: new Date(), liftedBy: message.author.id } }
    );

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.success(
              "Sicil Temizlendi",
              `• **Kullanıcı:** ${targetUser} (\`${targetUser.id}\`)\n• **Yetkili:** ${message.author} (\`${message.author.id}\`)\n• **Temizlenen Aktif Ceza Sayısı:** ${result.modifiedCount}`,
              message.guild
            )
          ]
        });
      }
    }

    message.reply({
      embeds: [
        Embeds.success(
          "Sicil Temizleme Tamamlandı",
          `${targetUser} kullanıcısının tüm aktif cezaları (${result.modifiedCount} adet) başarıyla arşive alındı ve ceza puanları pasifleştirildi.`,
          message.guild
        )
      ]
    });
  }
};
