import { Embeds } from "@bot/core";

export default {
  name: "vip",
  aliases: ["vipver", "vipal", "özelüye"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const vipRoleId = config.roles?.vip;
    if (!vipRoleId) {
      return message.reply({ embeds: [Embeds.error("Ayar Hatası", "VIP rolü sistemde ayarlanmamış.", message.guild)] });
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetMember) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen VIP verilecek veya alınacak üyeyi etiketleyin.", message.guild)] });
    }

    const hasVip = targetMember.roles.cache.has(vipRoleId);

    if (hasVip) {
      await targetMember.roles.remove(vipRoleId).catch(() => null);

      const logChannelId = config.channels?.registerLog;
      if (logChannelId) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          logChannel.send({
            embeds: [
              Embeds.warn(
                "VIP Rolü Alındı",
                `• **Üye:** ${targetMember} (${targetMember.id})\n• **Yetkili:** ${message.author} (${message.author.id})\n• **İşlem:** VIP ayrıcalığı kaldırıldı.`,
                message.guild
              )
            ]
          });
        }
      }

      return message.reply({
        embeds: [Embeds.info("VIP Kaldırıldı", `${targetMember} kullanıcısından VIP rolü alındı.`, message.guild)]
      });
    } else {
      await targetMember.roles.add(vipRoleId).catch(() => null);

      const logChannelId = config.channels?.registerLog;
      if (logChannelId) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          logChannel.send({
            embeds: [
              Embeds.success(
                "VIP Rolü Verildi",
                `• **Üye:** ${targetMember} (${targetMember.id})\n• **Yetkili:** ${message.author} (${message.author.id})\n• **İşlem:** VIP ayrıcalığı tanımlandı.`,
                message.guild
              )
            ]
          });
        }
      }

      return message.reply({
        embeds: [Embeds.success("VIP Tanımlandı", `${targetMember} kullanıcısına başarıyla VIP rolü verildi.`, message.guild)]
      });
    }
  }
};
