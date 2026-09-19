import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

export default {
  name: "oneri",
  aliases: ["suggest", "öneri", "tavsiye", "fikir"],
  async execute({ client, message, args, config }) {
    const text = args.join(" ").trim();
    if (!text) {
      return message.reply(MessageFormatter.warn("Eksik İçerik", `Lütfen sunucu için bir öneri veya fikir belirtin.\n\n▫️ Örnek: \`${config.prefix || "."}oneri Etkinlik odalarına yeni oyunlar eklensin.\``));
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("suggest_vote_yes")
        .setLabel("Katılıyorum (0)")
        .setEmoji("👍")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("suggest_vote_no")
        .setLabel("Katılmıyorum (0)")
        .setEmoji("👎")
        .setStyle(ButtonStyle.Danger)
    );

    const content = [
      `### 💡 Yeni Sunucu Önerisi`,
      `▫️ **Öneri Sahibi:** ${message.author} (\`${message.author.username}\`)`,
      "",
      `▫️ **Öneri İçeriği:**`,
      `  "${text}"`,
      "",
      `▫️ *Durum: Oylama Devam Ediyor...*`,
      "",
      `-# Fikir ve önerinizi oylamak için aşağıdaki butonları kullanabilirsiniz.`
    ].join("\n");

    const targetChannel = (config.channels?.suggestionChannel
      ? message.guild.channels.cache.get(config.channels.suggestionChannel)
      : null) || message.channel;

    const sentMsg = await targetChannel.send({ content, embeds: [], components: [row] });

    if (!client.activeSuggestions) {
      client.activeSuggestions = new Map();
    }

    client.activeSuggestions.set(sentMsg.id, {
      messageId: sentMsg.id,
      authorId: message.author.id,
      text,
      yesVotes: new Set(),
      noVotes: new Set()
    });

    if (targetChannel.id !== message.channel.id) {
      await message.reply(MessageFormatter.success("Öneri İletildi", `Öneriniz başarıyla ${targetChannel} kanalına gönderildi ve oylamaya sunuldu.`));
    }
  }
};

