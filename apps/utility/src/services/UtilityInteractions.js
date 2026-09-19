import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } from "discord.js";
import { MessageFormatter } from "@bot/core";
import mongoose from "mongoose";
import { UtilityUI } from "./UtilityUI.js";

export function registerUtilityInteractions(client) {
  client.registerInteraction("util_view_banner", async ({ client: bot, interaction }) => {
    const targetUserId = interaction.customId.split(":")[1];
    const targetUser = await bot.users.fetch(targetUserId, { force: true }).catch(() => null);

    if (!targetUser) {
      return interaction.reply({ content: "Kullanıcı bilgisi alınamadı.", ephemeral: true });
    }

    const bannerUrl = targetUser.bannerURL({ size: 2048, dynamic: true });
    if (!bannerUrl) {
      return interaction.reply({ content: `### ⚠️ Afiş Bulunamadı\n<@${targetUser.id}> kullanıcısının özel bir profil afişi (banner) bulunmuyor.`, ephemeral: true });
    }

    const payload = UtilityUI.formatBannerPayload({ targetUser, bannerUrl });
    await interaction.reply({ ...payload, ephemeral: true });
  });

  client.registerInteraction("util_view_avatar", async ({ client: bot, interaction }) => {
    const targetUserId = interaction.customId.split(":")[1];
    const targetUser = await bot.users.fetch(targetUserId).catch(() => null);

    if (!targetUser) {
      return interaction.reply({ content: "Kullanıcı bilgisi alınamadı.", ephemeral: true });
    }

    const avatarUrl = targetUser.displayAvatarURL({ size: 2048, dynamic: true });
    const payload = UtilityUI.formatAvatarPayload({ targetUser, avatarUrl });
    await interaction.reply({ ...payload, ephemeral: true });
  });

  client.registerInteraction("util_server_icon", async ({ interaction }) => {
    const iconUrl = interaction.guild.iconURL({ size: 2048, dynamic: true });
    if (!iconUrl) {
      return interaction.reply({ content: "Sunucunun özel bir ikonu bulunmuyor.", ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Tam Boyutta Aç").setStyle(ButtonStyle.Link).setURL(iconUrl)
    );

    const content = `### 🖼️ ${interaction.guild.name} - Sunucu İkonu\n${iconUrl}`;
    await interaction.reply({ ...MessageFormatter.v2(content, [row]), ephemeral: true });
  });

  client.registerInteraction("util_server_banner", async ({ interaction }) => {
    const bannerUrl = interaction.guild.bannerURL({ size: 2048, dynamic: true });
    if (!bannerUrl) {
      return interaction.reply({ content: "Sunucunun özel bir afişi (banner) bulunmuyor.", ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Tam Boyutta Aç").setStyle(ButtonStyle.Link).setURL(bannerUrl)
    );

    const content = `### 🎨 ${interaction.guild.name} - Sunucu Afişi\n${bannerUrl}`;
    await interaction.reply({ ...MessageFormatter.v2(content, [row]), ephemeral: true });
  });

  client.registerInteraction("util_server_refresh", async ({ interaction }) => {
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);

    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter((m) => m.user?.bot).size;
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

    await interaction.update(payload);
  });

  client.registerInteraction("util_ping_refresh", async ({ client: bot, interaction }) => {
    const wsPing = Math.round(bot.ws.ping);
    const startMsg = Date.now();

    const dbStart = Date.now();
    await mongoose.connection.db?.admin().ping().catch(() => null);
    const dbPing = Date.now() - dbStart;

    const msgPing = Math.max(1, Date.now() - startMsg);

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    const statusText = wsPing < 150 ? "🟢 Mükemmel" : wsPing < 300 ? "🟡 Normal" : "🔴 Yüksek Gecikme";

    const payload = UtilityUI.formatPingPayload({
      wsPing,
      msgPing,
      dbPing,
      hours,
      minutes,
      statusText
    });

    await interaction.update(payload);
  });
}
