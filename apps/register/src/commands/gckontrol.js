import { UserAccount, InviteRecord } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "gckontrol",
  aliases: ["giriscikis", "giris-cikis", "girisgecmisi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff") && !client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Giriş çıkış denetimini görüntülemek için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.users.first()
      || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen incelenecek üyeyi belirtin.", message.guild)] });
    }

    const member = await message.guild.members.fetch(targetUser.id).catch(() => null);
    const account = await UserAccount.findOne({ guildId: message.guild.id, userId: targetUser.id });

    const createdTs = Math.floor(targetUser.createdTimestamp / 1000);
    const joinedTs = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

    let namesStr = "Kayıtlı eski isim bulunmuyor.";
    if (account?.namesHistory && account.namesHistory.length > 0) {
      namesStr = account.namesHistory.slice(-5).map((n) => {
        const d = `<t:${Math.floor(new Date(n.date).getTime() / 1000)}:d>`;
        return `• \`${n.name} | ${n.age}\` (${d}) - Yetkili: <@${n.staffId}>`;
      }).join("\n");
    }

    const invite = await InviteRecord.findOne({ guildId: message.guild.id, inviterId: targetUser.id });
    const totalInvites = invite ? (invite.regular + invite.bonus - invite.leaves) : 0;

    const embed = Embeds.base(`Giriş Çıkış ve Kimlik Raporu: ${targetUser.username}`, null, message.guild)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Kullanıcı", value: `${targetUser} (\`${targetUser.id}\`)`, inline: true },
        { name: "Şüpheli Hesap mı?", value: account?.isSuspicious ? "🔴 **Evet (Şüpheli)**" : "🟢 **Hayır (Güvenilir)**", inline: true },
        { name: "Hesap Açılış Tarihi", value: `<t:${createdTs}:F> (<t:${createdTs}:R>)`, inline: false },
        { name: "Sunucuya Katılış Tarihi", value: joinedTs ? `<t:${joinedTs}:F> (<t:${joinedTs}:R>)` : "Sunucuda Değil", inline: false },
        { name: "Davet İstatistiği", value: `Toplam **${totalInvites} davet** (Gerçek: ${invite?.regular || 0}, Sahte: ${invite?.fake || 0}, Ayrılan: ${invite?.leaves || 0})`, inline: false },
        { name: "Son İsim Geçmişi", value: namesStr, inline: false }
      )
      .setFooter({ text: "Giriş Çıkış Denetleyicisi | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.reply({ embeds: [embed] });
  }
};
