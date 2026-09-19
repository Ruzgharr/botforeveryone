import { AttachmentBuilder } from "discord.js";
import { Stat } from "@bot/database";
import { MessageFormatter, VisualCard } from "@bot/core";
import { StatsUI } from "../services/StatsUI.js";

export default {
  name: "seviye",
  aliases: ["rank", "level", "xp"],
  async execute({ message, args, config }) {
    const isAnimated = args.some(a => ["video", "animasyon", "anim", "gif", "canli", "canlı"].includes(String(a).toLowerCase()));
    const format = args.some(a => ["video", "mp4"].includes(String(a).toLowerCase())) ? "mp4" : "gif";
    const cleanArgs = args.filter(a => !["video", "animasyon", "anim", "gif", "canli", "canlı", "mp4"].includes(String(a).toLowerCase()));

    const allThemes = Object.keys(VisualCard.CARD_THEMES || {});
    const explicitThemeArg = cleanArgs.find((a) => allThemes.includes(a.toLowerCase().trim().replace(/^tema_/, "")));
    const remainingArgs = cleanArgs.filter((a) => a !== explicitThemeArg);

    const targetMember = message.mentions.members.first()
      || (remainingArgs[0] ? await message.guild.members.fetch(remainingArgs[0]).catch(() => null) : message.member);

    if (!targetMember || targetMember.user.bot) {
      return message.reply(MessageFormatter.warn("Uyarı", "Botların veya bulunamayan kullanıcıların seviye bilgisi görüntülenemez."));
    }

    const stat = await Stat.findOne({ guildId: message.guild.id, userId: targetMember.id });
    const selectedTheme = explicitThemeArg ? explicitThemeArg.toLowerCase().trim().replace(/^tema_/, "") : (stat?.cardTheme || "sakura");
    const currentXp = stat?.xp || 0;
    const currentLvl = stat?.level || 1;

    const rank = await Stat.countDocuments({ guildId: message.guild.id, xp: { $gt: currentXp } }) + 1;
    const totalRanked = await Stat.countDocuments({ guildId: message.guild.id });

    const rewards = config.leveling?.roleRewards || [];
    const nextReward = rewards.find((r) => r.level > currentLvl);

    const requiredXp = currentLvl * currentLvl * 100;
    const shouldAnimate = isAnimated || Boolean(stat?.cardAnimated);

    if (shouldAnimate) {
      const waitMsg = await message.reply("🎬 **Canlı Seviye Kartı Hazırlanıyor...** Lütfen bekleyin.");
      const cardBuffer = await VisualCard.renderAnimatedLevelCard({
        user: targetMember.user,
        level: currentLvl,
        currentXp,
        requiredXp,
        rank,
        theme: selectedTheme,
        format
      });

      const fileName = format === "mp4" ? "level_animated.mp4" : "level_animated.gif";
      const attachment = new AttachmentBuilder(cardBuffer, { name: fileName });
      const payload = StatsUI.formatLevelPayload({
        targetMember,
        stat,
        rank,
        totalRanked,
        nextReward,
        mediaUrl: `attachment://${fileName}`
      });

      await waitMsg.delete().catch(() => null);
      return message.reply({ ...payload, files: [attachment] });
    }

    const cardBuffer = await VisualCard.renderLevelCard({
      user: targetMember.user,
      level: currentLvl,
      currentXp,
      requiredXp,
      rank,
      theme: selectedTheme
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: "level.png" });

    const payload = StatsUI.formatLevelPayload({
      targetMember,
      stat,
      rank,
      totalRanked,
      nextReward,
      mediaUrl: "attachment://level.png"
    });

    return message.reply({ ...payload, files: [attachment] });
  }
};

