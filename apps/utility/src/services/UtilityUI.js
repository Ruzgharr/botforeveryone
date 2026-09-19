import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

export class UtilityUI {
  static formatAvatarPayload({ targetUser, avatarUrl }) {
    const content = `### 🖼️ ${targetUser.tag || targetUser.username} - Profil Fotoğrafı\n${avatarUrl}\n\n-# Görseli tam boyutta görüntülemek veya afişi incelemek için butonları kullanabilirsiniz.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🌐 Tarayıcıda Aç")
        .setStyle(ButtonStyle.Link)
        .setURL(avatarUrl),
      new ButtonBuilder()
        .setCustomId(`util_view_banner:${targetUser.id}`)
        .setLabel("🖼️ Afişi Gör (Banner)")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatBannerPayload({ targetUser, bannerUrl }) {
    const content = `### 🎨 ${targetUser.tag || targetUser.username} - Profil Afişi\n${bannerUrl}\n\n-# Görseli tam boyutta görüntülemek veya profil fotoğrafını incelemek için butonları kullanabilirsiniz.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("🌐 Tarayıcıda Aç")
        .setStyle(ButtonStyle.Link)
        .setURL(bannerUrl),
      new ButtonBuilder()
        .setCustomId(`util_view_avatar:${targetUser.id}`)
        .setLabel("👤 Profil Fotoğrafını Gör")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatServerPayload({ guild, owner, totalMembers, humanCount, botCount, textChannels, voiceChannels, categories, roleCount, emojiCount, boostTier, boostCount, createdTimestamp }) {
    const content = `### 🏰 ${guild.name} - Sunucu Bilgileri\n▫️ **Sunucu Sahibi:** ${owner ? `${owner.user?.tag || owner.displayName} (<@${owner.id}>)` : "Bilinmiyor"}\n▫️ **Kuruluş Tarihi:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)\n▫️ **Sunucu ID:** \`${guild.id}\`\n\n▫️ **Üye Dağılımı:**\n  • Toplam: **${totalMembers.toLocaleString("tr-TR")}** (İnsan: **${humanCount.toLocaleString("tr-TR")}** | Bot: **${botCount}**)\n\n▫️ **Kanal ve Roller:**\n  • Kanallar: **${guild.channels.cache.size}** (Metin: ${textChannels} | Ses: ${voiceChannels} | Kategori: ${categories})\n  • Roller: **${roleCount}** adet | Emojiler: **${emojiCount}** adet\n\n▫️ **Takviye (Boost) Durumu:**\n  • Seviye: **Seviye ${boostTier}** | Toplam Takviye: **${boostCount} Boost**\n\n-# Bilgiler Discord API üzerinden gerçek zamanlı alınmıştır.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("util_server_icon")
        .setLabel("🖼️ Sunucu İkonu")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!guild.iconURL()),
      new ButtonBuilder()
        .setCustomId("util_server_banner")
        .setLabel("🎨 Sunucu Afişi")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!guild.bannerURL()),
      new ButtonBuilder()
        .setCustomId("util_server_refresh")
        .setLabel("🔄 Yenile")
        .setStyle(ButtonStyle.Primary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatUserPayload({ targetMember, user, joinedServerTs, createdAccountTs, roles, rolesStr, voiceStatus, keyPermissions }) {
    const content = [
      `### 👤 Kullanıcı Profili: ${user.tag || user.username}`,
      `▫️ **Kullanıcı:** <@${user.id}> (\`${user.id}\`)`,
      `▫️ **Hesap Türü:** ${user.bot ? "🤖 Bot" : "👤 Üye"}`,
      `▫️ **En Yüksek Rol:** ${targetMember.roles.highest}`,
      `▫️ **Hesap Kuruluşu:** <t:${createdAccountTs}:F> (<t:${createdAccountTs}:R>)`,
      `▫️ **Sunucuya Katılış:** ${joinedServerTs ? `<t:${joinedServerTs}:F> (<t:${joinedServerTs}:R>)` : "Bilinmiyor"}`,
      `▫️ **Ses Durumu:** ${voiceStatus}`,
      "",
      `▫️ **Roller (${roles.size}):**`,
      `  ${rolesStr}`,
      targetMember.premiumSince ? `\n▫️ **Takviye (Boost):** 💎 <t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:F> tarihinden beri takviyeli` : "",
      keyPermissions.length > 0 ? `\n▫️ **Önemli Yetkiler:** ${keyPermissions.join(", ")}` : "",
      "",
      `-# Bilgiler sunucu ve Discord API üzerinden anlık sorgulanmıştır.`
    ].filter(Boolean).join("\n");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`util_view_avatar:${user.id}`)
        .setLabel("👤 Profil Fotoğrafı")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`util_view_banner:${user.id}`)
        .setLabel("🎨 Profil Afişi")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatPingPayload({ wsPing, msgPing, dbPing, hours, minutes, statusText }) {
    const content = `### 🏓 Sistem Gecikme & Performans Raporu\n▫️ **WebSocket Gecikmesi:** \`${wsPing} ms\`\n▫️ **Mesaj Yanıt Süresi:** \`${msgPing} ms\`\n▫️ **Veritabanı (MongoDB/SQL):** \`${dbPing} ms\`\n▫️ **Çalışma Süresi (Uptime):** \`${hours} saat ${minutes} dakika\`\n▫️ **Sistem Durumu:** ${statusText}\n\n-# Ölçümler anlık donanım ve ağ metriklerine dayanır.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("util_ping_refresh")
        .setLabel("🔄 Gecikmeyi Yeniden Ölç")
        .setStyle(ButtonStyle.Primary)
    );

    return MessageFormatter.v2(content, [row]);
  }
}
