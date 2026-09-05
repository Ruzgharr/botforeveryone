import { Embeds } from "@bot/core";
import { UserAccount } from "@bot/database";

export default {
  name: "kayıtsız",
  aliases: ["kayitsiz", "unreg", "unregister"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetMember) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen kayıtsıza atılacak üyeyi etiketleyin veya ID girin.", message.guild)] });
    }

    if (targetMember.id === message.author.id) {
      return message.reply({ embeds: [Embeds.error("Geçersiz İşlem", "Kendinizi kayıtsıza atamazsınız.", message.guild)] });
    }

    if (targetMember.roles.highest.position >= message.member.roles.highest.position && !message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("İşlem Başarısız", "Sizden üst veya eşit yetkideki birini kayıtsıza atamazsınız.", message.guild)] });
    }

    const unregRoles = config.roles?.unregistered || [];
    if (unregRoles.length === 0) {
      return message.reply({ embeds: [Embeds.error("Ayar Hatası", "Kayıtsız rolü sistemde ayarlanmamış.", message.guild)] });
    }

    const boosterRoleId = config.roles?.booster;
    const rolesToKeep = [];
    if (boosterRoleId && targetMember.roles.cache.has(boosterRoleId)) {
      rolesToKeep.push(boosterRoleId);
    }
    const finalRoles = [...rolesToKeep, ...unregRoles];

    await targetMember.roles.set(finalRoles).catch(() => null);
    await targetMember.setNickname("İsimsiz").catch(() => null);

    await UserAccount.findOneAndUpdate(
      { guildId: message.guild.id, userId: targetMember.id },
      {
        $set: {
          gender: "UNREGISTERED",
          registeredBy: null,
          registeredAt: null
        },
        $push: {
          namesHistory: {
            name: "Kayıtsıza Atıldı",
            age: 0,
            roleAssigned: "Kayıtsız",
            staffId: message.author.id,
            date: new Date()
          }
        }
      },
      { upsert: true }
    );

    const logChannelId = config.channels?.registerLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.warn(
              "Kayıtsıza Atıldı",
              `• **Üye:** ${targetMember} (${targetMember.id})\n• **Yetkili:** ${message.author} (${message.author.id})\n• **İşlem:** Üyenin rolleri temizlenip kayıtsız rolü verildi.`,
              message.guild
            )
          ]
        });
      }
    }

    message.reply({
      embeds: [
        Embeds.success(
          "İşlem Tamamlandı",
          `${targetMember} başarıyla kayıtsıza atıldı ve rolleri sıfırlandı.`,
          message.guild
        )
      ]
    });
  }
};
