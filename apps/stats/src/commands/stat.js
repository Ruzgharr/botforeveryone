import { Stat } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { StatCardGenerator } from "../services/StatCardGenerator.js";

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0 dk";
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} dk`;
  return `${hours} sa ${remainingMinutes} dk`;
}

export default {
  name: "stat",
  aliases: ["istatistik", "me"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

    const stat = await Stat.findOne({ guildId: message.guild.id, userId: targetUser.id });
    const totalVoice = formatDuration(stat?.totalVoiceMs || 0);
    const dailyVoice = formatDuration(stat?.dailyVoiceMs || 0);
    const weeklyVoice = formatDuration(stat?.weeklyVoiceMs || 0);

    const totalMsgs = stat?.totalMessages || 0;
    const dailyMsgs = stat?.dailyMessages || 0;
    const weeklyMsgs = stat?.weeklyMessages || 0;

    const payload = MessageFormatter.render("userStats", {
      user: targetUser,
      totalVoice,
      weeklyVoice,
      dailyVoice,
      totalMsgs,
      weeklyMsgs,
      dailyMsgs,
      title: `${targetUser.tag} - Aktivite Verileri`
    }, config, message.guild);

    const hours = ((stat?.totalVoiceMs || 0) / (1000 * 60 * 60)).toFixed(1);
    const xp = stat?.xp || 0;
    const level = stat?.level || 1;
    const nextLevelXp = level * level * 100;
    const cardAttachment = StatCardGenerator.createCard({
      username: targetUser.username || targetUser.tag,
      level,
      xp,
      nextLevelXp,
      voiceHours: hours,
      messages: totalMsgs
    });

    message.reply({ ...payload, files: [cardAttachment] });
  }
};
