import { Penalty } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "ban",
  aliases: ["yasakla"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("BanMembers") && !client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen yasaklanacak kullanıcıyı belirtin.", message.guild)] });
    }

    if (!targetUser.bannable) {
      return message.reply({ embeds: [Embeds.error("İşlem Başarısız", "Bu kullanıcıyı yasaklamak için bot yetkisi yetersiz.", message.guild)] });
    }

    const reason = args.slice(1).join(" ") || "Sunucu kurallarına aykırı hareket";
    const caseCount = (await Penalty.countDocuments()) + 1;

    await Penalty.create({
      caseId: caseCount,
      guildId: message.guild.id,
      userId: targetUser.id,
      executorId: message.author.id,
      type: "BAN",
      reason,
      points: 50,
      active: true
    });

    await targetUser.ban({ reason: `${message.author.tag}: ${reason}` });

    const payload = MessageFormatter.render("banPunish", {
      user: targetUser.user.tag,
      staff: message.author,
      reason,
      points: 50,
      title: "Sunucudan Yasaklandı (Ban)"
    }, config, message.guild);

    message.reply(payload);
  }
};
