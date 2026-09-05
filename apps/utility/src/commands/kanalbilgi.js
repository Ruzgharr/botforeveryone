import { Embeds } from "@bot/core";
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
      return message.reply({ embeds: [Embeds.warn("Kanal Bulunamadı", "Belirtilen kanal sunucuda bulunamadı.", message.guild)] });
    }

    const typeStr = channelTypeMap[targetChannel.type] || "Diğer";
    const categoryName = targetChannel.parent ? targetChannel.parent.name : "Kategorisiz";
    const createdDate = targetChannel.createdAt ? targetChannel.createdAt.toLocaleString("tr-TR") : "Bilinmiyor";

    const rows = [
      `• **Kanal Adı:** ${targetChannel.name}`,
      `• **Kanal ID:** \`${targetChannel.id}\``,
      `• **Kanal Türü:** \`${typeStr}\``,
      `• **Bağlı Olduğu Kategori:** \`${categoryName}\``,
      `• **Pozisyon:** ${targetChannel.position} / ${message.guild.channels.cache.size}`,
      `• **Oluşturulma Tarihi:** \`${createdDate}\``
    ];

    if (targetChannel.isTextBased() && !targetChannel.isVoiceBased()) {
      rows.push(`• **Yavaş Mod (Slowmode):** \`${targetChannel.rateLimitPerUser || 0} saniye\``);
      rows.push(`• **NSFW (Yetişkin):** ${targetChannel.nsfw ? "Evet" : "Hayır"}`);
      if (targetChannel.topic) {
        rows.push(`• **Kanal Açıklaması:** ${targetChannel.topic}`);
      }
    }

    if (targetChannel.isVoiceBased()) {
      rows.push(`• **Bitrate:** \`${Math.round(targetChannel.bitrate / 1000)} kbps\``);
      rows.push(`• **Kullanıcı Limiti:** \`${targetChannel.userLimit || "Limitsiz"}\``);
      rows.push(`• **Odada Bağlı Üye:** \`${targetChannel.members.size} kişi\``);
    }

    message.reply({
      embeds: [Embeds.info(`${targetChannel.name} - Kanal Detayları`, rows.join("\n"), message.guild)]
    });
  }
};
