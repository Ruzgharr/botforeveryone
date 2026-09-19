import { MessageFormatter } from "@bot/core";
import { ChannelType } from "discord.js";

const channelTypeMap = {
  [ChannelType.GuildText]: "Metin Kanalı",
  [ChannelType.GuildVoice]: "Ses Kanalı",
  [ChannelType.GuildCategory]: "Kategori",
  [ChannelType.GuildAnnouncement]: "Duyuru Kanalı",
  [ChannelType.GuildStageVoice]: "Sahne Kanalı",
  [ChannelType.GuildForum]: "Forum Kanalı"
};

export default {
  name: "kanalbilgi",
  aliases: ["kanal", "channelinfo"],
  async execute({ client, message, args, config }) {
    const targetChannel = message.mentions.channels.first() || (args[0] ? message.guild.channels.cache.get(args[0]) : message.channel);
    if (!targetChannel) {
      return message.reply(MessageFormatter.warn("Kanal Bulunamadı", "Belirtilen kanal sunucuda bulunamadı."));
    }

    const typeStr = channelTypeMap[targetChannel.type] || "Diğer";
    const categoryName = targetChannel.parent ? targetChannel.parent.name : "Kategorisiz";
    const createdDate = targetChannel.createdAt ? targetChannel.createdAt.toLocaleString("tr-TR") : "Bilinmiyor";

    const rows = [
      `▫️ **Kanal Adı:** <#${targetChannel.id}> (\`${targetChannel.name}\`)`,
      `▫️ **Kanal ID:** \`${targetChannel.id}\``,
      `▫️ **Kanal Türü:** \`${typeStr}\``,
      `▫️ **Kategori:** \`${categoryName}\``,
      `▫️ **Pozisyon:** ${targetChannel.position} / ${message.guild.channels.cache.size}`,
      `▫️ **Oluşturulma:** \`${createdDate}\``
    ];

    if (targetChannel.isTextBased() && !targetChannel.isVoiceBased()) {
      rows.push(`▫️ **Yavaş Mod (Slowmode):** \`${targetChannel.rateLimitPerUser || 0} saniye\``);
      rows.push(`▫️ **NSFW:** ${targetChannel.nsfw ? "Evet (+18)" : "Hayır"}`);
      if (targetChannel.topic) {
        rows.push(`▫️ **Kanal Konusu:** ${targetChannel.topic}`);
      }
    }

    if (targetChannel.isVoiceBased()) {
      rows.push(`▫️ **Ses Bit Hızı:** \`${Math.round(targetChannel.bitrate / 1000)} kbps\``);
      rows.push(`▫️ **Kullanıcı Limiti:** \`${targetChannel.userLimit || "Limitsiz"}\``);
      rows.push(`▫️ **Odadaki Üye:** \`${targetChannel.members.size} kişi\``);
    }

    const content = [
      `### 📺 Kanal Detayları: ${targetChannel.name}`,
      ...rows,
      "",
      `-# Bilgiler sunucu kanal yapısından çekilmiştir.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

