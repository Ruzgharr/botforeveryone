import { Penalty } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "uyarilar",
  aliases: ["warns", "uyarılar", "uyarilistesi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Uyarı listesini görüntülemek için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetUser = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen uyarıları incelenecek üyeyi belirtin.", message.guild)] });
    }

    const warns = await Penalty.find({
      guildId: message.guild.id,
      userId: targetUser.id,
      type: "WARN"
    }).sort({ createdAt: -1 });

    if (!warns || warns.length === 0) {
      return message.reply({
        embeds: [Embeds.info("Uyarı Bulunamadı", `${targetUser} kullanıcısına ait herhangi bir kayıtlı uyarı bulunmuyor.`, message.guild)]
      });
    }

    const activeWarns = warns.filter((w) => w.active);
    const embed = Embeds.base(
      `Uyarı Geçmişi: ${targetUser.displayName}`,
      `Toplam **${warns.length} adet** uyarı kaydı bulundu (**${activeWarns.length} aktif** uyarı).\n\n`
      + warns.slice(0, 10).map((w) => {
        const timeStr = `<t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:d>`;
        const status = w.active ? "🔴 Aktif" : "⚪ Kaldırıldı";
        return `• **Ceza #${w.caseId}** (${timeStr}) [${status}]\n  Yetkili: <@${w.executorId}> | Sebep: *${w.reason}*`;
      }).join("\n\n"),
      message.guild
    ).setFooter({ text: "Uyarı Takip Sistemi | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.reply({ embeds: [embed] });
  }
};
