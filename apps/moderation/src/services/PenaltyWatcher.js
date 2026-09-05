import { Penalty, GuildConfig } from "@bot/database";
import { Embeds } from "@bot/core";

export function parseDuration(input) {
  if (!input || typeof input !== "string") return null;

  const match = input.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  if (unit === "s") return value * 1000;
  if (unit === "m") return value * 60 * 1000;
  if (unit === "h") return value * 60 * 60 * 1000;
  if (unit === "d") return value * 24 * 60 * 60 * 1000;

  return null;
}

export class PenaltyWatcher {
  static start(client) {
    setInterval(async () => {
      try {
        const now = new Date();
        const expired = await Penalty.find({
          active: true,
          expiresAt: { $ne: null, $lte: now }
        }).limit(20);

        for (const pen of expired) {
          const guild = client.guilds.cache.get(pen.guildId);
          if (!guild) continue;

          const config = await client.getGuildConfig(pen.guildId);
          const member = await guild.members.fetch(pen.userId).catch(() => null);

          if (member) {
            if (pen.type === "MUTE" && config.roles?.chatMute) {
              await member.roles.remove(config.roles.chatMute).catch(() => null);
            } else if (pen.type === "VMUTE" && config.roles?.voiceMute) {
              await member.roles.remove(config.roles.voiceMute).catch(() => null);
              if (member.voice.channelId) {
                await member.voice.setMute(false).catch(() => null);
              }
            } else if (pen.type === "JAIL" && config.roles?.jail) {
              await member.roles.remove(config.roles.jail).catch(() => null);
              const defaultRoles = config.roles?.member || [];
              if (defaultRoles.length > 0) {
                await member.roles.add(defaultRoles).catch(() => null);
              }
            }
          }

          await Penalty.updateOne(
            { _id: pen._id },
            { $set: { active: false, liftedAt: now, liftedBy: "AUTO_EXPIRY" } }
          );

          const logChannelId = config.channels?.penaltyLog;
          if (logChannelId) {
            const logChannel = guild.channels.cache.get(logChannelId);
            if (logChannel) {
              logChannel.send({
                embeds: [
                  Embeds.success(
                    `Ceza Süresi Doldu - Ceza #${pen.caseId}`,
                    `**Kullanıcı:** <@${pen.userId}> (${pen.userId})\n**Ceza Türü:** ${pen.type}\n**Durum:** Ceza süresi tamamlandığı için otomatik olarak kaldırıldı.`,
                    guild
                  )
                ]
              }).catch(() => null);
            }
          }
        }
      } catch {}
    }, 20000);
  }
}
