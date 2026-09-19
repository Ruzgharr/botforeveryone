import { MessageFormatter } from "@bot/core";

export default {
  name: "vip",
  aliases: ["vipver", "vipal", "özelüye"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const vipRoleId = config.roles?.vip;
    if (!vipRoleId) {
      return message.reply(MessageFormatter.error("Ayar Hatası", "VIP rolü sistemde ayarlanmamış."));
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetMember) {
      return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen VIP verilecek veya alınacak üyeyi etiketleyin."));
    }

    const hasVip = targetMember.roles.cache.has(vipRoleId);

    if (hasVip) {
      await targetMember.roles.remove(vipRoleId).catch(() => null);

      const logChannelId = config.channels?.registerLog;
      if (logChannelId) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          logChannel.send(MessageFormatter.warn(
            "VIP Rolü Alındı",
            `**Üye:** ${targetMember} (\`${targetMember.id}\`)\n▫️ **Yetkili:** ${message.author} (\`${message.author.id}\`)\n▫️ **İşlem:** VIP ayrıcalığı kaldırıldı.\n-# Ecosystem Kayıt Log Sistemi`
          ));
        }
      }

      return message.reply(MessageFormatter.info("VIP Kaldırıldı", `${targetMember} kullanıcısından VIP rolü alındı.`));
    } else {
      await targetMember.roles.add(vipRoleId).catch(() => null);

      const logChannelId = config.channels?.registerLog;
      if (logChannelId) {
        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (logChannel) {
          logChannel.send(MessageFormatter.success(
            "VIP Rolü Verildi",
            `**Üye:** ${targetMember} (\`${targetMember.id}\`)\n▫️ **Yetkili:** ${message.author} (\`${message.author.id}\`)\n▫️ **İşlem:** VIP ayrıcalığı tanımlandı.\n-# Ecosystem Kayıt Log Sistemi`
          ));
        }
      }

      return message.reply(MessageFormatter.success("VIP Tanımlandı", `${targetMember} kullanıcısına başarıyla VIP rolü verildi.`));
    }
  }
};
