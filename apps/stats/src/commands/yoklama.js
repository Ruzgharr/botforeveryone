import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "yoklama",
  aliases: ["toplantı", "toplanti", "toplantiyoklama"],
  async execute({ client, message, config }) {
    if (!message.member.permissions.has("Administrator") && !client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Yoklama başlatmak için yönetici yetkiniz bulunmuyor.", message.guild)] });
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply({ embeds: [Embeds.warn("Ses Kanalı Gerekli", "Yoklama almak için bir ses kanalında bulunmalısınız.", message.guild)] });
    }

    const presentMembers = voiceChannel.members.filter((m) => !m.user.bot);
    const staffRoleIds = config.roles?.staffRoles || [];

    const attendedStaff = [];
    const missingStaff = [];

    for (const roleId of staffRoleIds) {
      const role = message.guild.roles.cache.get(roleId);
      if (!role) continue;

      role.members.forEach((member) => {
        if (member.user.bot) return;
        if (presentMembers.has(member.id)) {
          if (!attendedStaff.some((m) => m.id === member.id)) attendedStaff.push(member);
        } else {
          if (!missingStaff.some((m) => m.id === member.id) && !attendedStaff.some((m) => m.id === member.id)) {
            missingStaff.push(member);
          }
        }
      });
    }

    const attendedText = attendedStaff.map((m) => `<@${m.id}>`).slice(0, 30).join(", ") || "Kimse yok";
    const missingText = missingStaff.map((m) => `<@${m.id}>`).slice(0, 30).join(", ") || "Eksik yetkili yok";

    const payload = MessageFormatter.render("attendanceReport", {
      channel: voiceChannel.name,
      attendedCount: attendedStaff.length,
      missingCount: missingStaff.length,
      attendedList: attendedText,
      missingList: missingText,
      title: "Toplantı Yoklama Raporu"
    }, config, message.guild);

    message.reply(payload);
  }
};
