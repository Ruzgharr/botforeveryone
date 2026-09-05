import { MessageFormatter } from "@bot/core";

export default {
  name: "say",
  aliases: ["sunucubilgi", "sayı", "sayi"],
  async execute({ client, message, config }) {
    const guild = message.guild;
    const totalMembers = guild.memberCount;
    const tag = config.tag;
    const tagCount = tag ? guild.members.cache.filter((m) => m.user.username.includes(tag) || m.displayName.includes(tag)).size : 0;
    const voiceCount = guild.members.cache.filter((m) => m.voice.channelId).size;
    const boostCount = guild.premiumSubscriptionCount || 0;

    const payload = MessageFormatter.render("serverStats", {
      guild: guild.name,
      total: totalMembers,
      tagged: tagCount,
      voice: voiceCount,
      boosts: boostCount,
      title: `${guild.name} - Sunucu İstatistikleri`
    }, config, guild);

    message.reply(payload);
  }
};
