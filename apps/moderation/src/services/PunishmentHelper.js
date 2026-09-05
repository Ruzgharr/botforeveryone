import { Penalty, StaffKpi } from "@bot/database";

export async function checkGraduatedPunishment(targetUser, config, client) {
  if (!targetUser || !config?.penaltyThresholds) return;

  const penalties = await Penalty.find({ guildId: targetUser.guild.id, userId: targetUser.id, active: true });
  const totalPoints = penalties.reduce((acc, p) => acc + (p.points || 0), 0);
  const thresholds = config.penaltyThresholds;

  if (thresholds.ban && totalPoints >= thresholds.ban) {
    if (targetUser.bannable) {
      await targetUser.ban({ reason: `Kademeli Yaptırım: Ceza puanı sınırı aşıldı (${totalPoints}/${thresholds.ban})` }).catch(() => null);
    }
  } else if (thresholds.jail && totalPoints >= thresholds.jail && config.roles?.jail) {
    await targetUser.roles.set([config.roles.jail]).catch(() => null);
  } else if (thresholds.mute && totalPoints >= thresholds.mute && config.roles?.chatMute) {
    await targetUser.roles.add(config.roles.chatMute).catch(() => null);
  }
}

export async function recordStaffKpi(guildId, staffId, actionType, points = 10) {
  try {
    const fieldMap = {
      JAIL: "jails",
      MUTE: "mutes",
      VMUTE: "vmutes",
      BAN: "bans",
      REGISTER: "registers"
    };
    const incField = fieldMap[actionType] || "jails";

    await StaffKpi.findOneAndUpdate(
      { guildId, staffId, period: "WEEKLY" },
      {
        $inc: {
          [incField]: 1,
          totalScore: points
        }
      },
      { upsert: true, new: true }
    );
  } catch {}
}
