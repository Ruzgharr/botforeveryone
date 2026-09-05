import { Penalty } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "uyarisil",
  aliases: ["warn-sil", "unwarn", "uyarıkaldır"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Uyarı silme işlemi için yetkiniz bulunmuyor.", message.guild)] });
    }

    const input = args[0];
    if (!input) {
      return message.reply({
        embeds: [Embeds.warn("Hatalı Kullanım", "Lütfen silinecek uyarının Ceza ID numarasını veya kullanıcıyı belirtin.\n\n**Örnekler:**\n`.uyarisil 42`\n`.uyarisil @üye`", message.guild)]
      });
    }

    let targetPenalty = null;

    if (!isNaN(input)) {
      targetPenalty = await Penalty.findOne({ guildId: message.guild.id, caseId: parseInt(input, 10), type: "WARN", active: true });
    } else {
      const targetUser = message.mentions.members.first()
        || (await message.guild.members.fetch(input.replace(/[<@!>]/g, "")).catch(() => null));

      if (targetUser) {
        targetPenalty = await Penalty.findOne({
          guildId: message.guild.id,
          userId: targetUser.id,
          type: "WARN",
          active: true
        }).sort({ createdAt: -1 });
      }
    }

    if (!targetPenalty) {
      return message.reply({
        embeds: [Embeds.warn("Uyarı Bulunamadı", "Belirtilen kriterlere uyan aktif bir uyarı kaydı bulunamadı.", message.guild)]
      });
    }

    await Penalty.updateOne(
      { _id: targetPenalty._id },
      {
        $set: {
          active: false,
          liftedAt: new Date(),
          liftedBy: message.author.id
        }
      }
    );

    const embed = Embeds.success(
      "Uyarı Kaldırıldı",
      `Ceza **#${targetPenalty.caseId}** numaralı uyarı <@${targetPenalty.userId}> kullanıcısının aktif sicilinden başarıyla silindi.`,
      message.guild
    );

    await message.reply({ embeds: [embed] });
  }
};
