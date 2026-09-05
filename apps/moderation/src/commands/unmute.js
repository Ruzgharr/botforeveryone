import { Penalty } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "unmute",
  aliases: ["susturmakaldır", "susturmakaldir"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen susturulması kaldırılacak kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    const muteRoleId = config.roles?.chatMute;
    await Penalty.updateMany(
      { guildId: message.guild.id, userId: targetUser.id, type: "MUTE", active: true },
      { $set: { active: false, liftedAt: new Date(), liftedBy: message.author.id } }
    );

    if (muteRoleId && targetUser.roles.cache.has(muteRoleId)) {
      await targetUser.roles.remove(muteRoleId).catch(() => null);
    }

    const payload = MessageFormatter.render("muteLift", {
      user: targetUser,
      staff: message.author,
      title: "Yazı Susturması Kaldırıldı"
    }, config, message.guild);

    message.reply(payload);
  }
};
