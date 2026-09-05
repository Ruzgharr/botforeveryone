import { MessageFormatter, WebhookLogger } from "@bot/core";
import { Penalty } from "@bot/database";

export class PunishService {
  static isSafe(member, config) {
    if (!member) return false;
    if (member.id === member.guild.ownerId) return true;

    const safeUsers = config.guard?.safeUsers || [];
    if (safeUsers.includes(member.id)) return true;

    const safeRoles = config.guard?.safeRoles || [];
    if (safeRoles.some((roleId) => member.roles.cache.has(roleId))) return true;

    return false;
  }

  static isSafeBot(botUser, config) {
    if (!botUser) return false;
    const safeBots = config.guard?.safeBots || [];
    return safeBots.includes(botUser.id);
  }

  static async punish(member, reason, config, client) {
    if (!member || !member.manageable) return;

    const jailRoleId = config.roles?.jail;
    if (jailRoleId) {
      await member.roles.set([jailRoleId]).catch(() => null);
    } else {
      const dangerousPermissions = ["Administrator", "ManageGuild", "ManageRoles", "ManageChannels", "BanMembers", "KickMembers"];
      const rolesToRemove = member.roles.cache.filter((r) => dangerousPermissions.some((perm) => r.permissions.has(perm))).map((r) => r.id);
      if (rolesToRemove.length > 0) {
        await member.roles.remove(rolesToRemove).catch(() => null);
      }
    }

    const caseCount = (await Penalty.countDocuments()) + 1;
    await Penalty.create({
      caseId: caseCount,
      guildId: member.guild.id,
      userId: member.id,
      executorId: client.user.id,
      type: "QUARANTINE",
      reason: `[GUARD SİSTEMİ] ${reason}`,
      points: 100,
      active: true
    });

    const guardLogId = config.channels?.guardLog;
    if (guardLogId) {
      const guardLog = member.guild.channels.cache.get(guardLogId);
      if (guardLog) {
        const payload = MessageFormatter.render("guardAlert", {
          user: member,
          reason,
          title: "Güvenlik İhlal Uyarısı"
        }, config, member.guild);
        guardLog.send(payload).catch(() => null);
      }
    }

    if (config.channels?.guardWebhook) {
      WebhookLogger.sendAlert(config.channels.guardWebhook, {
        title: "Güvenlik İhlal Bildirimi (Webhook)",
        description: `${member.user.tag} (${member.id}) yetkisiz işlem gerçekleştirdi: ${reason}`,
        color: 0xef4444,
        fields: [
          { name: "Kullanıcı", value: `<@${member.id}>`, inline: true },
          { name: "Sebep", value: reason, inline: true }
        ]
      }).catch(() => {});
    }
  }
}
