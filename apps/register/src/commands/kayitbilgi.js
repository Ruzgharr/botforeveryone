import { UserAccount } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "kayitbilgi",
  aliases: ["kayıtbilgi", "kayit-bilgi", "teyitbilgi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

    const asStaff = await UserAccount.find({ guildId: message.guild.id, registeredBy: targetUser.id });
    const asMember = await UserAccount.findOne({ guildId: message.guild.id, userId: targetUser.id });

    const menCount = asStaff.filter((u) => u.gender === "MAN").length;
    const womenCount = asStaff.filter((u) => u.gender === "WOMAN").length;
    const totalRegistered = asStaff.length;

    let memberInfo = "Bu kullanıcıya ait sunucu kayıt geçmişi bulunamadı.";
    if (asMember && asMember.registeredBy) {
      const regTime = asMember.registeredAt ? `<t:${Math.floor(new Date(asMember.registeredAt).getTime() / 1000)}:R>` : "Bilinmiyor";
      memberInfo = `• Kaydeden Yetkili: <@${asMember.registeredBy}>\n• Kayıt Tarihi: ${regTime}\n• Cinsiyet: ${asMember.gender === "MAN" ? "Erkek" : asMember.gender === "WOMAN" ? "Kadın" : "Üye"}\n• Kayıtlı İsim: **${asMember.name} | ${asMember.age}**`;
    }

    const embed = Embeds.info(
      `${targetUser.username} - Kayıt Verileri`,
      `Yetkili Olarak Kayıt İstatistikleri:\n` +
      `• Toplam Kayıt: **${totalRegistered}**\n` +
      `• Erkek Kayıt: **${menCount}**\n` +
      `• Kadın Kayıt: **${womenCount}**\n\n` +
      `Kullanıcının Kendi Kayıt Bilgisi:\n${memberInfo}`,
      message.guild
    );

    message.reply({ embeds: [embed] });
  }
};
