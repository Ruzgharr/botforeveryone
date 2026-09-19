import { AttachmentBuilder } from "discord.js";
import { VisualCard } from "@bot/core";
import { RegisterUI } from "../services/RegisterUI.js";

export default {
  name: "say",
  aliases: ["sunucubilgi", "sayı", "sayi"],
  async execute({ client, message, config }) {
    const guild = message.guild;
    const totalMembers = guild.memberCount;
    const tag = config.tag;
    const tagCount = tag ? guild.members.cache.filter((m) => m.user.username.includes(tag) || m.displayName.includes(tag)).size : 0;
    const voiceCount = guild.members.cache.filter((m) => m.voice?.channelId).size;
    const boostCount = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier || 0;

    const botCount = guild.members.cache.filter((m) => m.user.bot).size;
    const humanCount = Math.max(0, totalMembers - botCount);

    const cardBuffer = await VisualCard.renderSayCard({
      guild,
      totalMembers,
      voiceCount,
      humanCount,
      botCount,
      boostCount,
      boostTier
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: "say.png" });

    const payload = RegisterUI.formatSayPayload({
      guild,
      total: totalMembers,
      tagged: tagCount,
      voice: voiceCount,
      boosts: boostCount,
      mediaUrl: "attachment://say.png"
    });

    return message.reply({ ...payload, files: [attachment] });
  }
};
