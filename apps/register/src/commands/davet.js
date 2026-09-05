import { InviteRecord } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "davet",
  aliases: ["invites", "davetlerim", "davetsayısı", "davetsayisi"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı.", message.guild)] });
    }

    const record = await InviteRecord.findOne({ guildId: message.guild.id, userId: targetUser.id });

    const regular = record?.regular || 0;
    const fake = record?.fake || 0;
    const bonus = record?.bonus || 0;
    const leaves = record?.leaves || 0;
    const total = Math.max(0, regular + bonus - leaves);

    const description = [
      `### 📨 ${targetUser.username} Davet İstatistikleri`,
      `• **Toplam Geçerli Davet:** \`${total}\``,
      `• **Gerçek Katılanlar:** \`${regular}\``,
      `• **Ayrılanlar:** \`${leaves}\``,
      `• **Sahte / Şüpheli Hesaplar:** \`${fake}\``,
      `• **Yönetici Bonusu:** \`${bonus}\``
    ].join("\n");

    message.reply({
      embeds: [Embeds.info("Davet Bilgileri", description, message.guild)]
    });
  }
};
