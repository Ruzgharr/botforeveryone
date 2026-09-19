import { AttachmentBuilder } from "discord.js";
import { Stat } from "@bot/database";
import { VisualCard } from "@bot/core";
import { StatsUI } from "../services/StatsUI.js";

export default {
  name: "stat",
  aliases: ["istatistik"],
  async execute({ client, message, args, config }) {
    const explicitAnimated = args.some((a) => ["video", "anim", "hareketli", "--video", "gif", "mp4"].includes(a.toLowerCase()));
    const cleanArgs = args.filter((a) => !["video", "anim", "hareketli", "--video", "gif", "mp4"].includes(a.toLowerCase()));

    const allThemes = Object.keys(VisualCard.CARD_THEMES || {});
    const explicitThemeArg = cleanArgs.find((a) => allThemes.includes(a.toLowerCase().trim().replace(/^tema_/, "")));
    const remainingArgs = cleanArgs.filter((a) => a !== explicitThemeArg);

    const mentionedUser = message.mentions.users.first();
    const idArg = remainingArgs.find((a) => /^\d{17,20}$/.test(a.trim()));
    let targetUser = mentionedUser;
    if (!targetUser && idArg) {
      targetUser = await client.users.fetch(idArg).catch(() => null);
    }
    if (!targetUser) {
      targetUser = message.author;
    }

    const extraArgs = remainingArgs.filter((a) => {
      const clean = a.replace(/[<@!>]/g, "").trim();
      return clean !== targetUser.id && !message.mentions.users.has(clean);
    });
    const extraText = extraArgs.length > 0 ? extraArgs.join(" ").trim() : null;

    const stat = await Stat.findOne({ guildId: message.guild.id, userId: targetUser.id });
    const selectedTheme = explicitThemeArg ? explicitThemeArg.toLowerCase().trim().replace(/^tema_/, "") : (stat?.cardTheme || "sakura");
    const isAnimated = explicitAnimated || Boolean(stat?.cardAnimated);
    const format = args.some((a) => a.toLowerCase() === "mp4") ? "mp4" : (stat?.cardFormat || "gif");
    const ext = isAnimated ? (format === "mp4" ? "mp4" : "gif") : "png";
    const fileName = `stat-card.${ext}`;

    const payload = StatsUI.formatUserStatPayload({
      targetUser,
      stat,
      period: "all",
      mediaUrl: `attachment://${fileName}`,
      extraText
    });

    const hours = Math.round((stat?.totalVoiceMs || 0) / (1000 * 60 * 60));

    let attachment = null;
    if (isAnimated) {
      const animBuffer = await VisualCard.renderAnimatedUserStatCard({
        user: targetUser,
        periodText: "Genel",
        voiceHours: hours,
        messageCount: stat?.totalMessages || 0,
        level: stat?.level || 1,
        rank: 1,
        theme: selectedTheme,
        format,
        title: stat?.title || "",
        badges: stat?.activeBadges || []
      });
      attachment = new AttachmentBuilder(animBuffer, { name: fileName });
    } else {
      const cardBuffer = await VisualCard.renderUserStatCard({
        user: targetUser,
        periodText: "Genel",
        voiceHours: hours,
        messageCount: stat?.totalMessages || 0,
        level: stat?.level || 1,
        rank: 1,
        theme: selectedTheme,
        title: stat?.title || "",
        badges: stat?.activeBadges || []
      });
      attachment = new AttachmentBuilder(cardBuffer, { name: fileName });
    }

    const replyOptions = { ...payload, files: [attachment] };
    if (extraText) {
      replyOptions.content = extraText;
    }

    return message.reply(replyOptions);
  }
};
