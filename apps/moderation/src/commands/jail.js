import { Penalty } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";
import { parseDuration } from "../services/PenaltyWatcher.js";
import { recordStaffKpi, checkGraduatedPunishment } from "../services/PunishmentHelper.js";

export default {
  name: "jail",
  aliases: ["karantina", "cezalı", "cezali"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen cezalandırılacak kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ embeds: [Embeds.error("İşlem Başarısız", "Kendinizi cezalandıramazsınız.", message.guild)] });
    }

    if (targetUser.roles.highest.position >= message.member.roles.highest.position && !message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("İşlem Başarısız", "Sizden üst veya eşit yetkideki birine ceza veremezsiniz.", message.guild)] });
    }

    const jailRoleId = config.roles?.jail;
    if (!jailRoleId) {
      return message.reply({ embeds: [Embeds.error("Ayar Hatası", "Jail rolü henüz sistemde tanımlı değil. Panelden ayarlayınız.", message.guild)] });
    }

    const durationMs = parseDuration(args[1]);
    let reason = "";
    if (durationMs) {
      reason = args.slice(2).join(" ") || "Sebep belirtilmedi";
    } else {
      reason = args.slice(1).join(" ") || "Sebep belirtilmedi";
    }

    const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
    const caseCount = (await Penalty.countDocuments()) + 1;

    await Penalty.create({
      caseId: caseCount,
      guildId: message.guild.id,
      userId: targetUser.id,
      executorId: message.author.id,
      type: "JAIL",
      reason,
      points: 20,
      durationMs: durationMs || 0,
      expiresAt,
      active: true
    });

    await targetUser.roles.set([jailRoleId]).catch(() => null);

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.warn(
              `Ceza #${caseCount} - Jail`,
              `**Kullanıcı:** ${targetUser} (${targetUser.id})\n**Yetkili:** ${message.author} (${message.author.id})\n**Sebep:** ${reason}\n**Ceza Puanı:** +20`,
              message.guild
            )
          ]
        });
      }
    }

    const payload = MessageFormatter.render("jailPunish", {
      user: targetUser,
      staff: message.author,
      reason,
      points: 20,
      title: "Karantina (Jail) Cezası"
    }, config, message.guild);

    message.reply(payload);

    await recordStaffKpi(message.guild.id, message.author.id, "JAIL", 15);
    await checkGraduatedPunishment(targetUser, config, client);
  }
};
