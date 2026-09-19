import { AttachmentBuilder } from "discord.js";
import { Economy } from "@bot/database";
import { VisualCard } from "@bot/core";
import { EconomyUI } from "../services/EconomyUI.js";

export default {
  name: "topcoin",
  aliases: ["zenginler", "rich", "balinalar"],
  async execute({ message }) {
    const list = await Economy.find({ guildId: message.guild.id }).limit(100);

    const enriched = list.map((item) => {
      const member = message.guild.members.cache.get(item.userId);
      return {
        userId: item.userId,
        tag: member?.user?.username || `Kullanıcı (${item.userId})`,
        total: (item.wallet || 0) + (item.bank || 0)
      };
    }).sort((a, b) => b.total - a.total).slice(0, 10);

    const cardBuffer = VisualCard.renderTopCoinCard({
      guild: message.guild,
      enrichedUsers: enriched
    });

    const attachment = new AttachmentBuilder(cardBuffer, { name: "topcoin.png" });

    const payload = EconomyUI.formatTopCoinPayload({
      guild: message.guild,
      enriched,
      mediaUrl: "attachment://topcoin.png"
    });

    return message.reply({ ...payload, files: [attachment] });
  }
};

