import { Penalty } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "unvmute",
  aliases: ["seslimutekaldır", "seslimutekaldir", "unvoicemute"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen ses susturması kaldırılacak kullanıcıyı etiketleyin veya ID girin.", message.guild)] });
    }

    const vmuteRoleId = config.roles?.voiceMute;
    await Penalty.updateMany(
      { guildId: message.guild.id, userId: targetUser.id, type: "VMUTE", active: true },
      { $set: { active: false, liftedAt: new Date(), liftedBy: message.author.id } }
    );

    if (vmuteRoleId && targetUser.roles.cache.has(vmuteRoleId)) {
      await targetUser.roles.remove(vmuteRoleId).catch(() => null);
    }

    if (targetUser.voice?.channel) {
      await targetUser.voice.setMute(false).catch(() => null);
    }

    const payload = MessageFormatter.render("vmuteLift", {
      user: targetUser,
      staff: message.author,
      title: "Ses Susturması Kaldırıldı"
    }, config, message.guild);

    message.reply(payload);
  }
};
