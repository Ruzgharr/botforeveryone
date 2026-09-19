import { MessageFormatter } from "@bot/core";

export default {
  name: "rolver",
  aliases: ["rol-ver", "giverole", "addrole"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    const targetRole = message.mentions.roles.first() || (args[1] ? message.guild.roles.cache.get(args[1]) : null);

    if (!targetMember || !targetRole) {
      return message.reply(MessageFormatter.warn(
        "Eksik Bilgi",
        `Kullanım formatı: \`${config.prefix || "."}rolver @üye @rol\``
      ));
    }

    if (targetRole.position >= message.member.roles.highest.position && !message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error(
        "Yetki Hatası",
        "Kendi en yüksek rolünüzden eşit veya daha üst bir rolü başkasına veremezsiniz."
      ));
    }

    const dangerous = ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "BanMembers", "KickMembers"];
    const isDangerousRole = dangerous.some((p) => targetRole.permissions.has(p));
    if (isDangerousRole && !message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error(
        "Güvenlik Engeli",
        "Yönetici izni olmayan yetkililer tehlikeli yönetim yetkilerine sahip rolleri veremez."
      ));
    }

    if (targetMember.roles.cache.has(targetRole.id)) {
      return message.reply(MessageFormatter.warn(
        "Zaten Mevcut",
        `${targetMember} kullanıcısı zaten ${targetRole} rolüne sahip.`
      ));
    }

    await targetMember.roles.add(targetRole.id).catch(() => null);

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send(MessageFormatter.info(
          "Rol Verildi",
          `**Üye:** ${targetMember} (\`${targetMember.id}\`)\n▫️ **Yetkili:** ${message.author} (\`${message.author.id}\`)\n▫️ **Verilen Rol:** ${targetRole} (\`${targetRole.id}\`)\n-# Ecosystem Rol Yönetim Sistemi`
        )).catch(() => null);
      }
    }

    message.reply(MessageFormatter.success(
      "İşlem Başarılı",
      `${targetMember} kullanıcısına başarıyla ${targetRole} rolü verildi.`
    ));
  }
};
