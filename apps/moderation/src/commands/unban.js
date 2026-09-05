import { Penalty } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "unban",
  aliases: ["yasakkaldır", "yasakkaldir"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("BanMembers") && !client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetId = args[0];
    if (!targetId) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen yasağı kaldırılacak kullanıcının ID bilgisini girin.", message.guild)] });
    }

    const bans = await message.guild.bans.fetch().catch(() => null);
    const bannedUser = bans?.get(targetId);

    if (!bannedUser) {
      return message.reply({ embeds: [Embeds.error("Bulunamadı", "Belirtilen ID değerine ait bir yasaklama kaydı bulunamadı.", message.guild)] });
    }

    await Penalty.updateMany(
      { guildId: message.guild.id, userId: targetId, type: "BAN", active: true },
      { $set: { active: false, liftedAt: new Date(), liftedBy: message.author.id } }
    );

    await message.guild.bans.remove(targetId).catch(() => null);

    const payload = MessageFormatter.render("banLift", {
      user: bannedUser.user.tag,
      staff: message.author,
      title: "Yasak Kaldırıldı (Unban)"
    }, config, message.guild);

    message.reply(payload);
  }
};
