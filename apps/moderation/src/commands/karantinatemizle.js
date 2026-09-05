import { Penalty } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "karantinatemizle",
  aliases: ["karantina-temizle", "topluunjail", "massunjail"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu yalnızca sunucu yöneticileri kullanabilir.", message.guild)] });
    }

    const jailRoleId = config.roles?.jail;
    const memberRoles = config.roles?.member || [];

    const activeJails = await Penalty.find({ guildId: message.guild.id, type: "JAIL", active: true });
    if (activeJails.length === 0) {
      return message.reply({
        embeds: [Embeds.info("Kayıt Yok", "Sunucuda aktif karantina (jail) cezası bulunan üye yok.", message.guild)]
      });
    }

    const sent = await message.reply({
      embeds: [Embeds.info("İşlem Başlatıldı", `${activeJails.length} adet aktif karantina kaydı temizleniyor...`, message.guild)]
    });

    let liftedCount = 0;
    for (const pen of activeJails) {
      const member = await message.guild.members.fetch(pen.userId).catch(() => null);
      if (member) {
        if (jailRoleId) await member.roles.remove(jailRoleId).catch(() => null);
        if (memberRoles.length > 0) await member.roles.add(memberRoles).catch(() => null);
      }
      pen.active = false;
      pen.liftedAt = new Date();
      pen.liftedBy = message.author.id;
      await pen.save();
      liftedCount++;
    }

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.warn(
              "Toplu Karantina Tahliyesi",
              `• **Yetkili:** ${message.author} (\`${message.author.id}\`)\n• **Tahliye Edilen Üye:** ${liftedCount} kişi`,
              message.guild
            )
          ]
        });
      }
    }

    sent.edit({
      embeds: [
        Embeds.success("Toplu Tahliye Tamamlandı", `Toplam **${liftedCount}** üyenin karantina cezası kaldırıldı ve rolleri iade edildi.`, message.guild)
      ]
    });
  }
};
