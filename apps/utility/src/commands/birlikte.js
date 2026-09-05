import { Stat } from "@bot/database";
import { Embeds } from "@bot/core";

function formatDuration(ms) {
  if (!ms || ms <= 0) return "0 dakika";
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} dakika`;
  return `${hours} saat ${remainingMinutes} dakika`;
}

export default {
  name: "birlikte",
  aliases: ["synergy", "birliktelik", "ortaksüre"],
  async execute({ message, args }) {
    const targetMember = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);

    if (!targetMember) {
      return message.reply({
        embeds: [Embeds.warn("Eksik Bilgi", "Lütfen birlikte ses sürenizi sorgulayacağınız üyeyi etiketleyin.", message.guild)]
      });
    }

    if (targetMember.id === message.author.id) {
      return message.reply({ embeds: [Embeds.warn("Uyarı", "Kendinizle olan birliktelik sürenizi sorgulayamazsınız.", message.guild)] });
    }

    const [stat1, stat2] = await Promise.all([
      Stat.findOne({ guildId: message.guild.id, userId: message.author.id }),
      Stat.findOne({ guildId: message.guild.id, userId: targetMember.id })
    ]);

    const voice1 = stat1?.totalVoiceMs || 0;
    const voice2 = stat2?.totalVoiceMs || 0;
    const estimatedTogether = Math.min(voice1, voice2) * 0.45;
    const durationStr = formatDuration(estimatedTogether);

    const isInSameVoice = message.member.voice?.channelId
      && message.member.voice.channelId === targetMember.voice?.channelId;

    const currentStatus = isInSameVoice
      ? `🟢 Şu anda ikiniz de <#${message.member.voice.channelId}> kanalındasınız!`
      : "⚪ Şu anda aynı ses kanalında değilsiniz.";

    const embed = Embeds.base(
      `Ses Birlikteliği: ${message.member.displayName} & ${targetMember.displayName}`,
      `İki üyenin sunucudaki ses aktifliği ve ortak vakit analizi:\n\n`
      + `• **Tahmini Birlikte Geçen Süre:** 🎙️ **${durationStr}**\n`
      + `• **${message.member.displayName} Toplam Ses:** ${formatDuration(voice1)}\n`
      + `• **${targetMember.displayName} Toplam Ses:** ${formatDuration(voice2)}\n\n`
      + `**Anlık Durum:**\n${currentStatus}`,
      message.guild
    ).setFooter({ text: "Ses Birlikteliği Analizörü | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.reply({ embeds: [embed] });
  }
};
