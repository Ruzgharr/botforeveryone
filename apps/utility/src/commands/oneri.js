import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Embeds } from "@bot/core";

export default {
  name: "oneri",
  aliases: ["suggest", "öneri", "tavsiye", "fikir"],
  async execute({ client, message, args, config }) {
    const text = args.join(" ").trim();
    if (!text) {
      return message.reply({
        embeds: [Embeds.warn("Eksik İçerik", "Lütfen sunucu için bir öneri veya fikir belirtin. Örnek: `.oneri Etkinlik odalarına yeni oyunlar eklensin.`", message.guild)]
      });
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

    const embed = Embeds.base("💡 Yeni Sunucu Önerisi", null, message.guild)
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
      .setDescription(`**Öneri Sahibi:** ${message.author}\n\n**Öneri:**\n${text}\n\n*Durum: Oylama Devam Ediyor...*`)
      .setFooter({ text: "Öneri ve Fikir Sistemi | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    const targetChannel = (config.channels?.suggestionChannel
      ? message.guild.channels.cache.get(config.channels.suggestionChannel)
      : null) || message.channel;

    const sentMsg = await targetChannel.send({ embeds: [embed], components: [row] });

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
      await message.reply({
        embeds: [Embeds.success("Öneri İletildi", `Öneriniz başarıyla ${targetChannel} kanalına gönderildi ve oylamaya sunuldu.`, message.guild)]
      });
    }
  }
};
