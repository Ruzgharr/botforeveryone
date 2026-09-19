import { MessageFormatter } from "@bot/core";

export default {
  name: "rolal",
  aliases: ["rol-al", "takerole", "removerole"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    const targetRole = message.mentions.roles.first() || (args[1] ? message.guild.roles.cache.get(args[1]) : null);

    if (!targetMember || !targetRole) {
      return message.reply(MessageFormatter.warn(
        "Eksik Bilgi",
        `Kullanım formatı: \`${config.prefix || "."}rolal @üye @rol\``
      ));
    }

    if (targetRole.position >= message.member.roles.highest.position && !message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error(
        "Yetki Hatası",
        "Kendi en yüksek rolünüzden eşit veya daha üst bir rolü başkasından alamazsınız."
      ));
    }

    if (!targetMember.roles.cache.has(targetRole.id)) {
      return message.reply(MessageFormatter.warn(
        "Rol Yok",
        `${targetMember} kullanıcısı zaten ${targetRole} rolüne sahip değil.`
      ));
    }

    await targetMember.roles.remove(targetRole.id).catch(() => null);

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send(MessageFormatter.warn(
          "Rol Alındı",
          `**Üye:** ${targetMember} (\`${targetMember.id}\`)\n▫️ **Yetkili:** ${message.author} (\`${message.author.id}\`)\n▫️ **Alınan Rol:** ${targetRole} (\`${targetRole.id}\`)\n-# Ecosystem Rol Yönetim Sistemi`
        )).catch(() => null);
      }
    }

    message.reply(MessageFormatter.success(
      "İşlem Başarılı",
      `${targetMember} kullanıcısından başarıyla ${targetRole} rolü alındı.`
    ));
  }
};
