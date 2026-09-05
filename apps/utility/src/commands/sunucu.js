import { Embeds } from "@bot/core";
import { ChannelType } from "discord.js";

export default {
  name: "sunucu",
  aliases: ["sunucubilgi", "serverinfo", "server"],
  async execute({ client, message, args, config }) {
    const guild = message.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter((m) => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    const textChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).size;

    const roleCount = guild.roles.cache.size;
    const emojiCount = guild.emojis.cache.size;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier || 0;
    const createdTimestamp = Math.floor(guild.createdTimestamp / 1000);

    const embed = Embeds.info(
      `${guild.name} - Sunucu Bilgileri`,
      `• **Sunucu Sahibi:** ${owner ? `${owner.user.tag} (<@${owner.id}>)` : "Bilinmiyor"}\n` +
      `• **Kuruluş Tarihi:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)\n` +
      `• **Sunucu ID:** \`${guild.id}\`\n\n` +
      `**Üye Dağılımı:**\n` +
      `• Toplam: **${totalMembers}** (İnsan: **${humanCount}** | Bot: **${botCount}**)\n\n` +
      `**Kanal ve Roller:**\n` +
      `• Kanallar: **${guild.channels.cache.size}** (Yazı: ${textChannels} | Ses: ${voiceChannels} | Kategori: ${categories})\n` +
      `• Rol Sayısı: **${roleCount}**\n` +
      `• Emoji Sayısı: **${emojiCount}**\n\n` +
      `**Takviye (Boost) Durumu:**\n` +
      `• Seviye: **Seviye ${boostTier}**\n` +
      `• Takviye Sayısı: **${boostCount} Boost**`,
      guild
    );

    if (guild.iconURL()) {
      embed.setThumbnail(guild.iconURL({ size: 1024, dynamic: true }));
    }

    message.reply({ embeds: [embed] });
  }
};
