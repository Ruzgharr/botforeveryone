import { Penalty } from "@bot/database";
import { Embeds } from "@bot/core";
import { recordStaffKpi, checkGraduatedPunishment } from "../services/PunishmentHelper.js";

export default {
  name: "uyar",
  aliases: ["warn", "ikaz"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen uyarılacak kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ embeds: [Embeds.error("İşlem Başarısız", "Kendinize uyarı veremezsiniz.", message.guild)] });
    }

    const reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
    const caseCount = (await Penalty.countDocuments()) + 1;

    await Penalty.create({
      caseId: caseCount,
      guildId: message.guild.id,
      userId: targetUser.id,
      executorId: message.author.id,
      type: "WARN",
      reason,
      points: 10,
      active: true
    });

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.warn(
              `Ceza #${caseCount} - Uyarı`,
              `**Kullanıcı:** ${targetUser} (${targetUser.id})\n**Yetkili:** ${message.author} (${message.author.id})\n**Sebep:** ${reason}\n**Ceza Puanı:** +10`,
              message.guild
            )
          ]
        });
      }
    }

    await recordStaffKpi(message.guild.id, message.author.id, "WARN", 5);
    await checkGraduatedPunishment(targetUser, config, client);

    message.reply({
      embeds: [Embeds.success("Uyarı Kaydedildi", `${targetUser} kullanıcısına resmi uyarı verildi.\nSebep: **${reason}**\nCeza Puanı: **+10**`, message.guild)]
    });
  }
};
