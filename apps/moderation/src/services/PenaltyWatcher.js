import { Penalty, GuildConfig } from "@bot/database";
import { MessageFormatter } from "@bot/core";

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
        const expired = await Penalty.find({ active: true, expiresAt: { $ne: null, $lte: now } });

        for (const pen of expired) {
          const guild = client.guilds.cache.get(pen.guildId);
          if (!guild) continue;

          const config = await GuildConfig.findOne({ guildId: guild.id }) || {};
          const member = await guild.members.fetch(pen.userId).catch(() => null);

          if (member) {
            if (pen.type === "MUTE") {
              const muteRole = config.roles?.chatMute;
              if (muteRole) await member.roles.remove(muteRole).catch(() => null);
            } else if (pen.type === "VMUTE") {
              const vmuteRole = config.roles?.voiceMute;
              if (vmuteRole) await member.roles.remove(vmuteRole).catch(() => null);
              if (member.voice?.channel) await member.voice.setMute(false).catch(() => null);
            } else if (pen.type === "JAIL") {
              const jailRole = config.roles?.jail;
              if (jailRole) await member.roles.remove(jailRole).catch(() => null);
              const defaultRoles = config.roles?.unregistered || [];
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
              logChannel.send(MessageFormatter.success(
                `Ceza Süresi Doldu - Ceza #${pen.caseId}`,
                `**Kullanıcı:** <@${pen.userId}> (\`${pen.userId}\`)\n▫️ **Ceza Türü:** \`${pen.type}\`\n▫️ **Durum:** Ceza süresi tamamlandığı için otomatik olarak kaldırıldı.\n-# Ecosystem Otomatik Ceza Takip Sistemi`
              )).catch(() => null);
            }
          }
        }
      } catch {}
    }, 20000);
  }
}
