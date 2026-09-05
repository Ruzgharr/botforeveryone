import { Penalty } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "unjail",
  aliases: ["cezakaldır", "cezakaldir", "af"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen cezası kaldırılacak kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    const jailRoleId = config.roles?.jail;
    const unregisteredRoles = config.roles?.unregistered || [];

    await Penalty.updateMany(
      { guildId: message.guild.id, userId: targetUser.id, type: "JAIL", active: true },
      { $set: { active: false, liftedAt: new Date(), liftedBy: message.author.id } }
    );

    if (jailRoleId && targetUser.roles.cache.has(jailRoleId)) {
      await targetUser.roles.remove(jailRoleId).catch(() => null);
      if (unregisteredRoles.length > 0) {
        await targetUser.roles.add(unregisteredRoles).catch(() => null);
      }
    }

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.info(
              "Ceza Kaldırıldı - Jail",
              `**Kullanıcı:** ${targetUser} (${targetUser.id})\n**Yetkili:** ${message.author} (${message.author.id})\n**Durum:** Aktif jail cezası sonlandırıldı.`,
              message.guild
            )
          ]
        });
      }
    }

    const payload = MessageFormatter.render("jailLift", {
      user: targetUser,
      staff: message.author,
      title: "Karantina Kaldırıldı"
    }, config, message.guild);

    message.reply(payload);
  }
};
