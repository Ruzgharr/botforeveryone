import { ChannelType } from "discord.js";
import { UtilityUI } from "../services/UtilityUI.js";

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

    const payload = UtilityUI.formatServerPayload({
      guild,
      owner,
      totalMembers,
      humanCount,
      botCount,
      textChannels,
      voiceChannels,
      categories,
      roleCount,
      emojiCount,
      boostTier,
      boostCount,
      createdTimestamp
    });

    return message.reply(payload);
  }
};

