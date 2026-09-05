import { Penalty } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";
import { parseDuration } from "../services/PenaltyWatcher.js";
import { recordStaffKpi, checkGraduatedPunishment } from "../services/PunishmentHelper.js";

export default {
  name: "vmute",
  aliases: ["seslimute", "voicemute"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen ses susturması verilecek kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    const vmuteRoleId = config.roles?.voiceMute;
    if (!vmuteRoleId) {
      return message.reply({ embeds: [Embeds.error("Ayar Hatası", "Ses mute rolü tanımlı değil.", message.guild)] });
    }

    const durationMs = parseDuration(args[1]);
    let reason = "";
    if (durationMs) {
      reason = args.slice(2).join(" ") || "Sesli kanallarda uygunsuz davranış";
    } else {
      reason = args.slice(1).join(" ") || "Sesli kanallarda uygunsuz davranış";
    }

    const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
    const caseCount = (await Penalty.countDocuments()) + 1;

    await Penalty.create({
      caseId: caseCount,
      guildId: message.guild.id,
      userId: targetUser.id,
      executorId: message.author.id,
      type: "VMUTE",
      reason,
      points: 15,
      durationMs: durationMs || 0,
      expiresAt,
      active: true
    });

    await targetUser.roles.add(vmuteRoleId).catch(() => null);
    if (targetUser.voice?.channel) {
      await targetUser.voice.setMute(true).catch(() => null);
    }

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.warn(
              `Ceza #${caseCount} - Voice Mute`,
              `**Kullanıcı:** ${targetUser} (${targetUser.id})\n**Yetkili:** ${message.author} (${message.author.id})\n**Sebep:** ${reason}\n**Ceza Puanı:** +15`,
              message.guild
            )
          ]
        });
      }
    }

    const payload = MessageFormatter.render("vmutePunish", {
      user: targetUser,
      staff: message.author,
      reason,
      points: 15,
      title: "Ses Susturma (Voice Mute)"
    }, config, message.guild);

    message.reply(payload);

    await recordStaffKpi(message.guild.id, message.author.id, "VMUTE", 15);
    await checkGraduatedPunishment(targetUser, config, client);
  }
};
