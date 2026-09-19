import { Penalty } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { recordStaffKpi, checkGraduatedPunishment } from "../services/PunishmentHelper.js";

export default {
  name: "uyar",
  aliases: ["warn", "ikaz"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen uyarılacak kullanıcıyı etiketleyin veya ID girin."));
    }

    if (targetUser.id === message.author.id) {
      return message.reply(MessageFormatter.error("İşlem Başarısız", "Kendinize uyarı veremezsiniz."));
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
        logChannel.send(MessageFormatter.warn(
          `Ceza #${caseCount} - Uyarı`,
          `**Kullanıcı:** ${targetUser} (\`${targetUser.id}\`)\n▫️ **Yetkili:** ${message.author} (\`${message.author.id}\`)\n▫️ **Sebep:** ${reason}\n▫️ **Ceza Puanı:** \`+10\`\n-# Ecosystem Moderasyon Log Sistemi`
        ));
      }
    }

    await recordStaffKpi(message.guild.id, message.author.id, "WARN", 5);
    await checkGraduatedPunishment(targetUser, config, client);

    const payload = MessageFormatter.render("warnAdd", {
      user: targetUser,
      staff: message.author,
      reason,
      points: 10,
      title: "Kullanıcı Uyarıldı"
    }, config, message.guild);

    message.reply(payload);
  }
};
