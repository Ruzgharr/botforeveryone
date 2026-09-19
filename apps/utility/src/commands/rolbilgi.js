import { MessageFormatter } from "@bot/core";

export default {
  name: "rolbilgi",
  aliases: ["rol", "roleinfo"],
  async execute({ client, message, args, config }) {
    const role = message.mentions.roles.first() || (args[0] ? message.guild.roles.cache.get(args[0]) : null);
    if (!role) {
      return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen bilgi almak istediğiniz rolü etiketleyin veya ID girin."));
    }

    const membersWithRole = role.members;
    const memberList = membersWithRole.size <= 8
      ? membersWithRole.map((m) => `<@${m.id}>`).join(", ")
      : `${membersWithRole.first(6).map((m) => `<@${m.id}>`).join(", ")} ve ${membersWithRole.size - 6} kişi daha`;

    const keyPerms = [];
    if (role.permissions.has("Administrator")) keyPerms.push("Yönetici");
    if (role.permissions.has("ManageGuild")) keyPerms.push("Sunucuyu Yönet");
    if (role.permissions.has("ManageRoles")) keyPerms.push("Rolleri Yönet");
    if (role.permissions.has("ManageChannels")) keyPerms.push("Kanalları Yönet");
    if (role.permissions.has("BanMembers")) keyPerms.push("Üyeleri Yasakla");
    if (role.permissions.has("KickMembers")) keyPerms.push("Üyeleri At");
    if (role.permissions.has("MentionEveryone")) keyPerms.push("Everyone Etiketle");

    const content = [
      `### 🏷️ Rol Detayları: ${role.name}`,
      `▫️ **Rol Adı:** ${role.name} (<@&${role.id}>)`,
      `▫️ **Rol ID:** \`${role.id}\``,
      `▫️ **Renk Kodu:** \`${role.hexColor}\``,
      `▫️ **Pozisyon:** ${role.position} / ${message.guild.roles.cache.size}`,
      `▫️ **Üye Sayısı:** ${membersWithRole.size} kişi`,
      `▫️ **Ayrı Gösterim (Hoist):** ${role.hoist ? "Evet" : "Hayır"}`,
      `▫️ **Bahsedilebilir:** ${role.mentionable ? "Evet" : "Hayır"}`,
      `▫️ **Önemli Yetkiler:** ${keyPerms.length > 0 ? keyPerms.join(", ") : "Standart İzinler"}`,
      "",
      `▫️ **Bu Role Sahip Üyeler (${membersWithRole.size}):**`,
      `  ${memberList || "Bu role sahip üye bulunmuyor."}`,
      "",
      `-# Bilgiler sunucu rol hiyerarşisine dayanmaktadır.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

