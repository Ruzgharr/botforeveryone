import { Stat } from "@bot/database";
import { MessageFormatter } from "@bot/core";

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0 dk";
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} dk`;
  return `${hours} sa ${remainingMinutes} dk`;
}

export default {
  name: "topstat",
  aliases: ["liderlik", "top"],
  async execute({ message, config }) {
    const topVoice = await Stat.find({ guildId: message.guild.id }).sort({ totalVoiceMs: -1 }).limit(10);
    const topMessages = await Stat.find({ guildId: message.guild.id }).sort({ totalMessages: -1 }).limit(10);

    const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."];

    const voiceList = topVoice.map((s, idx) => {
      const badge = medals[idx] || `${idx + 1}.`;
      return `${badge} <@${s.userId}> : **${formatDuration(s.totalVoiceMs)}** (Seviye ${s.level || 1})`;
    }).join("\n") || "Veri bulunmuyor.";

    const messageList = topMessages.map((s, idx) => {
      const badge = medals[idx] || `${idx + 1}.`;
      return `${badge} <@${s.userId}> : **${s.totalMessages} mesaj** (Seviye ${s.level || 1})`;
    }).join("\n") || "Veri bulunmuyor.";

    const ranking = `**Ses Sıralaması (Top 10):**\n${voiceList}\n\n**Mesaj Sıralaması (Top 10):**\n${messageList}`;

    const payload = MessageFormatter.render("topStats", {
      guild: message.guild.name,
      ranking,
      title: `${message.guild.name} - En Aktif Üyeler`
    }, config, message.guild);

    message.reply(payload);
  }
};
