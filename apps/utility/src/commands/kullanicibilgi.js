import { Embeds } from "@bot/core";

export default {
  name: "kullanicibilgi",
  aliases: ["kullanici", "userinfo", "whois", "kb", "profil"],
  async execute({ message, args }) {
    const targetMember = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetMember) {
      return message.reply({ embeds: [Embeds.error("Kullanıcı Bulunamadı", "Belirtilen kullanıcı sunucuda bulunamadı.", message.guild)] });
    }

    const user = targetMember.user;
    const joinedServerTs = targetMember.joinedTimestamp ? Math.floor(targetMember.joinedTimestamp / 1000) : null;
    const createdAccountTs = Math.floor(user.createdTimestamp / 1000);

    const roles = targetMember.roles.cache
      .filter((r) => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position);

    let rolesStr = "Rol bulunmuyor";
    if (roles.size > 0) {
      const displayRoles = roles.first(15).map((r) => `<@&${r.id}>`).join(" ");
      rolesStr = roles.size > 15 ? `${displayRoles} ve ${roles.size - 15} adet daha...` : displayRoles;
    }

    let voiceStatus = "Ses kanalında bulunmuyor";
    if (targetMember.voice?.channel) {
      const state = [];
      if (targetMember.voice.mute) state.push("Susturulmuş");
      if (targetMember.voice.deaf) state.push("Sağırlaştırılmış");
      const stateText = state.length > 0 ? ` (${state.join(", ")})` : "";
      voiceStatus = `🔊 <#${targetMember.voice.channel.id}>${stateText}`;
    }

    const keyPermissions = [];
    if (targetMember.permissions.has("Administrator")) keyPermissions.push("Yönetici");
    if (targetMember.permissions.has("ManageGuild")) keyPermissions.push("Sunucuyu Yönet");
    if (targetMember.permissions.has("ManageRoles")) keyPermissions.push("Rolleri Yönet");
    if (targetMember.permissions.has("ManageChannels")) keyPermissions.push("Kanalları Yönet");
    if (targetMember.permissions.has("BanMembers")) keyPermissions.push("Üyeleri Yasakla");
    if (targetMember.permissions.has("KickMembers")) keyPermissions.push("Üyeleri At");
    if (targetMember.permissions.has("MentionEveryone")) keyPermissions.push("Everyone/Here Etiketleme");

    const embed = Embeds.base(`Kullanıcı Profili: ${user.username}`, null, message.guild)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: "Kullanıcı", value: `${user} (\`${user.id}\`)`, inline: true },
        { name: "Hesap Türü", value: user.bot ? "🤖 Bot" : "👤 Üye", inline: true },
        { name: "En Yüksek Rol", value: `${targetMember.roles.highest}`, inline: true },
        { name: "Hesap Kuruluş Tarihi", value: `<t:${createdAccountTs}:F>\n(<t:${createdAccountTs}:R>)`, inline: true },
        { name: "Sunucuya Katılış Tarihi", value: joinedServerTs ? `<t:${joinedServerTs}:F>\n(<t:${joinedServerTs}:R>)` : "Bilinmiyor", inline: true },
        { name: "Ses Kanalı Durumu", value: voiceStatus, inline: false },
        { name: `Roller (${roles.size})`, value: rolesStr, inline: false }
      );

    if (targetMember.premiumSince) {
      const boostTs = Math.floor(targetMember.premiumSinceTimestamp / 1000);
      embed.addFields({ name: "Sunucu Takviyesi (Boost)", value: `💎 <t:${boostTs}:F> tarihinden beri takviye yapıyor.`, inline: false });
    }

    if (keyPermissions.length > 0) {
      embed.addFields({ name: "Önemli Yetkiler", value: keyPermissions.join(", "), inline: false });
    }

    await message.reply({ embeds: [embed] });
  }
};
