import { InviteRecord } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "davetekle",
  aliases: ["davet-ekle", "addinvites", "bonusdavet"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu yalnızca sunucu yöneticileri kullanabilir.", message.guild)] });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const amount = parseInt(args[1], 10);

    if (!targetUser || isNaN(amount)) {
      return message.reply({
        embeds: [Embeds.warn("Eksik Bilgi", `Lütfen formatı doğru kullanın: \`${config.prefix || "."}davetekle @kullanıcı 5\``, message.guild)]
      });
    }

    const updated = await InviteRecord.findOneAndUpdate(
      { guildId: message.guild.id, userId: targetUser.id },
      { $inc: { bonus: amount } },
      { upsert: true, new: true }
    );

    message.reply({
      embeds: [
        Embeds.success(
          "Bonus Davet Güncellendi",
          `${targetUser} kullanıcısına **${amount}** adet bonus davet tanımlandı.\n• Güncel Bonus: \`${updated.bonus}\``,
          message.guild
        )
      ]
    });
  }
};
