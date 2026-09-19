import { UtilityUI } from "../services/UtilityUI.js";

export default {
  name: "kullanicibilgi",
  aliases: ["kullanici", "userinfo", "whois", "kb"],
  async execute({ message, args }) {
    const targetMember = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetMember) {
      return message.reply({ content: "Belirtilen kullanıcı sunucuda bulunamadı." });
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

    const payload = UtilityUI.formatUserPayload({
      targetMember,
      user,
      joinedServerTs,
      createdAccountTs,
      roles,
      rolesStr,
      voiceStatus,
      keyPermissions
    });

    return message.reply(payload);
  }
};

