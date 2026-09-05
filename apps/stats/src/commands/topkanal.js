import { Stat } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "topkanal",
  aliases: ["topkanallar", "enaktifkanallar", "kanalsıralama", "kanalsiralama"],
  async execute({ client, message, args, config }) {
    const stats = await Stat.find({ guildId: message.guild.id });
    if (!stats || stats.length === 0) {
      return message.reply({ embeds: [Embeds.info("Veri Bulunamadı", "Sunucuda henüz kanal aktivite verisi kaydedilmemiş.", message.guild)] });
    }

    const textTotals = new Map();
    const voiceTotals = new Map();

    for (const s of stats) {
      if (s.channelMessages) {
        for (const [chId, count] of s.channelMessages.entries()) {
          textTotals.set(chId, (textTotals.get(chId) || 0) + count);
        }
      }
      if (s.channelVoiceMs) {
        for (const [chId, ms] of s.channelVoiceMs.entries()) {
          voiceTotals.set(chId, (voiceTotals.get(chId) || 0) + ms);
        }
      }
    }

    const sortedText = Array.from(textTotals.entries())
      .filter(([chId]) => message.guild.channels.cache.has(chId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const sortedVoice = Array.from(voiceTotals.entries())
      .filter(([chId]) => message.guild.channels.cache.has(chId))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const textRows = sortedText.length > 0
      ? sortedText.map(([chId, count], idx) => `**${idx + 1}.** <#${chId}>: \`${count}\` mesaj`).join("\n")
      : "Henüz metin kanalı aktivitesi yok.";

    const voiceRows = sortedVoice.length > 0
      ? sortedVoice.map(([chId, ms], idx) => {
          const mins = Math.floor(ms / 60000);
          const hrs = Math.floor(mins / 60);
          const timeStr = hrs > 0 ? `${hrs} sa ${mins % 60} dk` : `${mins} dk`;
          return `**${idx + 1}.** <#${chId}>: \`${timeStr}\``;
        }).join("\n")
      : "Henüz ses kanalı aktivitesi yok.";

    const description = [
      "### 💬 En Aktif Metin Kanalları",
      textRows,
      "",
      "### 🎙️ En Aktif Ses Kanalları",
      voiceRows
    ].join("\n");

    message.reply({
      embeds: [Embeds.info("📊 Sunucu Kanal Aktivite Sıralaması", description, message.guild)]
    });
  }
};
