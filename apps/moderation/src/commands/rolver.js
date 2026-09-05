import { Embeds } from "@bot/core";

export default {
  name: "rolver",
  aliases: ["rol-ver", "giverole", "addrole"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    const targetRole = message.mentions.roles.first() || (args[1] ? message.guild.roles.cache.get(args[1]) : null);

    if (!targetMember || !targetRole) {
      return message.reply({
        embeds: [Embeds.warn("Eksik Bilgi", `Kullanım formatı: \`${config.prefix || "."}rolver @üye @rol\``, message.guild)]
      });
    }

    if (targetRole.position >= message.member.roles.highest.position && !message.member.permissions.has("Administrator")) {
      return message.reply({
        embeds: [Embeds.error("Yetki Hatası", "Kendi en yüksek rolünüzden eşit veya daha üst bir rolü başkasına veremezsiniz.", message.guild)]
      });
    }

    const dangerous = ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "BanMembers", "KickMembers"];
    const isDangerousRole = dangerous.some((p) => targetRole.permissions.has(p));
    if (isDangerousRole && !message.member.permissions.has("Administrator")) {
      return message.reply({
        embeds: [Embeds.error("Güvenlik Engeli", "Yönetici izni olmayan yetkililer tehlikeli yönetim yetkilerine sahip rolleri veremez.", message.guild)]
      });
    }

    if (targetMember.roles.cache.has(targetRole.id)) {
      return message.reply({
        embeds: [Embeds.warn("Zaten Mevcut", `${targetMember} kullanıcısı zaten ${targetRole} rolüne sahip.`, message.guild)]
      });
    }

    await targetMember.roles.add(targetRole.id).catch(() => null);

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.info(
              "Rol Verildi",
              `• **Üye:** ${targetMember} (\`${targetMember.id}\`)\n• **Yetkili:** ${message.author} (\`${message.author.id}\`)\n• **Verilen Rol:** ${targetRole} (\`${targetRole.id}\`)`,
              message.guild
            )
          ]
        }).catch(() => null);
      }
    }

    message.reply({
      embeds: [
        Embeds.success("İşlem Başarılı", `${targetMember} kullanıcısına başarıyla ${targetRole} rolü verildi.`, message.guild)
      ]
    });
  }
};
