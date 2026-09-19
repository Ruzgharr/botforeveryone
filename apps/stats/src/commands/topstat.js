import { AttachmentBuilder } from "discord.js";
import { Stat } from "@bot/database";
import { VisualCard } from "@bot/core";
import { StatsUI } from "../services/StatsUI.js";

export default {
  name: "topstat",
  aliases: ["liderlik", "top"],
  async execute({ message, args = [] }) {
    const topVoice = await Stat.find({ guildId: message.guild.id }).sort({ totalVoiceMs: -1 }).limit(10);
    const topMessages = await Stat.find({ guildId: message.guild.id }).sort({ totalMessages: -1 }).limit(10);

    const ranking = topVoice.map((s) => {
      const member = message.guild.members.cache.get(s.userId);
      const hours = Math.round((s.totalVoiceMs || 0) / (1000 * 60 * 60));
      return {
        userId: s.userId,
        tag: member?.user?.username || `Kullanıcı (${s.userId})`,
        value: hours,
        formattedValue: `${hours} Saat`
      };
    });

    const isAnimated = (args || []).some(a => ["video", "animasyon", "anim", "gif", "canli", "canlı"].includes(String(a).toLowerCase()));
    const format = (args || []).some(a => ["video", "mp4"].includes(String(a).toLowerCase())) ? "mp4" : "gif";
    const allThemes = Object.keys(VisualCard.CARD_THEMES || {});
    const explicitThemeArg = (args || []).find((a) => allThemes.includes(String(a).toLowerCase().trim().replace(/^tema_/, "")));
    const selectedTheme = explicitThemeArg ? explicitThemeArg.toLowerCase().trim().replace(/^tema_/, "") : "sakura";

    if (isAnimated) {
      const waitMsg = await message.reply("🎬 **Canlı Liderlik Tablosu Hazırlanıyor...** Lütfen bekleyin.");
      const cardBuffer = await VisualCard.renderAnimatedTopStatCard({
        guild: message.guild,
        ranking,
        type: "voice",
        theme: selectedTheme,
        format
      });

      const fileName = format === "mp4" ? "topstat_animated.mp4" : "topstat_animated.gif";
      const attachment = new AttachmentBuilder(cardBuffer, { name: fileName });
      const payload = StatsUI.formatTopStatPayload({
        guild: message.guild,
        topVoice,
        topMessages,
        category: "voice",
        mediaUrl: `attachment://${fileName}`
      });

      await waitMsg.delete().catch(() => null);
      return message.reply({ ...payload, files: [attachment] });
    }

    const cardBuffer = VisualCard.renderTopStatCard({
      guild: message.guild,
      ranking,
      type: "voice"
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: "topstat.png" });

    const payload = StatsUI.formatTopStatPayload({
      guild: message.guild,
      topVoice,
      topMessages,
      category: "voice",
      mediaUrl: "attachment://topstat.png"
    });

    return message.reply({ ...payload, files: [attachment] });
  }
};
