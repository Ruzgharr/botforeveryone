import { Penalty } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";
import { parseDuration } from "../services/PenaltyWatcher.js";
import { recordStaffKpi, checkGraduatedPunishment } from "../services/PunishmentHelper.js";

export default {
  name: "mute",
  aliases: ["cmute", "sustur"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen susturulacak kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    const muteRoleId = config.roles?.chatMute;
    if (!muteRoleId) {
      return message.reply({ embeds: [Embeds.error("Ayar Hatası", "Mute rolü sistemde tanımlı değil.", message.guild)] });
    }

    const durationMs = parseDuration(args[1]);
    let reason = "";
    if (durationMs) {
      reason = args.slice(2).join(" ") || "Metin kanallarında uygunsuz davranış";
    } else {
      reason = args.slice(1).join(" ") || "Metin kanallarında uygunsuz davranış";
    }

    const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
    const caseCount = (await Penalty.countDocuments()) + 1;

    await Penalty.create({
      caseId: caseCount,
      guildId: message.guild.id,
      userId: targetUser.id,
      executorId: message.author.id,
      type: "MUTE",
      reason,
      points: 10,
      durationMs: durationMs || 0,
      expiresAt,
      active: true
    });

    await targetUser.roles.add(muteRoleId).catch(() => null);

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.warn(
              `Ceza #${caseCount} - Chat Mute`,
              `**Kullanıcı:** ${targetUser} (${targetUser.id})\n**Yetkili:** ${message.author} (${message.author.id})\n**Sebep:** ${reason}\n**Ceza Puanı:** +10`,
              message.guild
            )
          ]
        });
      }
    }

    const payload = MessageFormatter.render("mutePunish", {
      user: targetUser,
      staff: message.author,
      reason,
      points: 10,
      title: "Yazı Susturma (Chat Mute)"
    }, config, message.guild);

    message.reply(payload);

    await recordStaffKpi(message.guild.id, message.author.id, "MUTE", 10);
    await checkGraduatedPunishment(targetUser, config, client);
  }
};
