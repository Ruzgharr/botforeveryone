import { AttachmentBuilder } from "discord.js";
import { Economy } from "@bot/database";
import { VisualCard } from "@bot/core";
import { EconomyUI } from "../services/EconomyUI.js";

export default {
  name: "coin",
  aliases: ["cuzdan", "cüzdan", "bakiye", "para", "c"],
  async execute({ client, message, args }) {
    const isAnimated = args.some(a => ["video", "animasyon", "anim", "gif", "canli", "canlı"].includes(String(a).toLowerCase()));
    const format = args.some(a => ["video", "mp4"].includes(String(a).toLowerCase())) ? "mp4" : "gif";
    const cleanArgs = args.filter(a => !["video", "animasyon", "anim", "gif", "canli", "canlı", "mp4"].includes(String(a).toLowerCase()));

    const allThemes = Object.keys(VisualCard.CARD_THEMES || {});
    const explicitThemeArg = cleanArgs.find((a) => allThemes.includes(a.toLowerCase().trim().replace(/^tema_/, "")));
    const remainingArgs = cleanArgs.filter((a) => a !== explicitThemeArg);

    const targetUser = message.mentions.users.first() || (remainingArgs[0] ? await client.users.fetch(remainingArgs[0]).catch(() => null) : message.author);

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!profile) {
      profile = await Economy.create({ guildId: message.guild.id, userId: targetUser.id });
    }

    const selectedTheme = explicitThemeArg ? explicitThemeArg.toLowerCase().trim().replace(/^tema_/, "") : "sakura";

    if (isAnimated) {
      const waitMsg = await message.reply("🎬 **Canlı Cüzdan Kartı Hazırlanıyor...** Lütfen bekleyin.");
      const cardBuffer = await VisualCard.renderAnimatedCoinCard({
        user: targetUser,
        wallet: profile.wallet || 0,
        bank: profile.bank || 0,
        theme: selectedTheme,
        format
      });

      const fileName = format === "mp4" ? "wallet_animated.mp4" : "wallet_animated.gif";
      const attachment = new AttachmentBuilder(cardBuffer, { name: fileName });
      const payload = EconomyUI.formatCoinPayload({
        targetUser,
        profile,
        mediaUrl: `attachment://${fileName}`
      });

      await waitMsg.delete().catch(() => null);
      return message.reply({ ...payload, files: [attachment] });
    }

    const cardBuffer = await VisualCard.renderCoinWalletCard({
      user: targetUser,
      wallet: profile.wallet || 0,
      bank: profile.bank || 0
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: "wallet.png" });
    const payload = EconomyUI.formatCoinPayload({
      targetUser,
      profile,
      mediaUrl: "attachment://wallet.png"
    });

    return message.reply({ ...payload, files: [attachment] });
  }
};
