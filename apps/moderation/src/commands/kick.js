import { Penalty } from "@bot/database";
import { Embeds } from "@bot/core";
import { recordStaffKpi } from "../services/PunishmentHelper.js";

export default {
  name: "kick",
  aliases: ["at"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen atılacak kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ embeds: [Embeds.error("İşlem Başarısız", "Kendinizi sunucudan atamazsınız.", message.guild)] });
    }

    if (targetUser.roles.highest.position >= message.member.roles.highest.position && !message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("İşlem Başarısız", "Sizden üst veya eşit yetkideki birini atamazsınız.", message.guild)] });
    }

    if (!targetUser.kickable) {
      return message.reply({ embeds: [Embeds.error("İşlem Başarısız", "Botun yetkisi bu kullanıcıyı atmaya yetmiyor.", message.guild)] });
    }

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
    const caseCount = (await Penalty.countDocuments()) + 1;

    await Penalty.create({
      caseId: caseCount,
      guildId: message.guild.id,
      userId: targetUser.id,
      executorId: message.author.id,
      type: "KICK",
      reason,
      points: 15,
      active: false
    });

    await targetUser.kick(`[Yetkili: ${message.author.tag}] ${reason}`).catch(() => null);

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.warn(
              `Ceza #${caseCount} - Kick`,
              `**Kullanıcı:** ${targetUser} (${targetUser.id})\n**Yetkili:** ${message.author} (${message.author.id})\n**Sebep:** ${reason}\n**Ceza Puanı:** +15`,
              message.guild
            )
          ]
        });
      }
    }

    await recordStaffKpi(message.guild.id, message.author.id, "KICK", 10);

    message.reply({
      embeds: [Embeds.success("Kullanıcı Atıldı", `${targetUser} kullanıcısı sunucudan atıldı. Sebep: **${reason}**`, message.guild)]
    });
  }
};
