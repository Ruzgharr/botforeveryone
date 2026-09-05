import { Embeds } from "@bot/core";

export default {
  name: "rolal",
  aliases: ["rol-al", "takerole", "removerole"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    const targetRole = message.mentions.roles.first() || (args[1] ? message.guild.roles.cache.get(args[1]) : null);

    if (!targetMember || !targetRole) {
      return message.reply({
        embeds: [Embeds.warn("Eksik Bilgi", `Kullanım formatı: \`${config.prefix || "."}rolal @üye @rol\``, message.guild)]
      });
    }

    if (targetRole.position >= message.member.roles.highest.position && !message.member.permissions.has("Administrator")) {
      return message.reply({
        embeds: [Embeds.error("Yetki Hatası", "Kendi en yüksek rolünüzden eşit veya daha üst bir rolü başkasından alamazsınız.", message.guild)]
      });
    }

    if (!targetMember.roles.cache.has(targetRole.id)) {
      return message.reply({
        embeds: [Embeds.warn("Rol Yok", `${targetMember} kullanıcısı zaten ${targetRole} rolüne sahip değil.`, message.guild)]
      });
    }

    await targetMember.roles.remove(targetRole.id).catch(() => null);

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.warn(
              "Rol Alındı",
              `• **Üye:** ${targetMember} (\`${targetMember.id}\`)\n• **Yetkili:** ${message.author} (\`${message.author.id}\`)\n• **Alınan Rol:** ${targetRole} (\`${targetRole.id}\`)`,
              message.guild
            )
          ]
        }).catch(() => null);
      }
    }

    message.reply({
      embeds: [
        Embeds.success("İşlem Başarılı", `${targetMember} kullanıcısından başarıyla ${targetRole} rolü alındı.`, message.guild)
      ]
    });
  }
};
