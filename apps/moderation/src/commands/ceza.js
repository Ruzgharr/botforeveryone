import { Penalty } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "ceza",
  aliases: ["cezasorgu", "ceza-bilgi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const caseIdArg = parseInt(args[0], 10);
    if (isNaN(caseIdArg) || caseIdArg <= 0) {
      return message.reply({
        embeds: [Embeds.warn("Geçersiz Numara", `Lütfen sorgulanacak ceza numarasını belirtin: \`${config.prefix || "."}ceza 15\``, message.guild)]
      });
    }

    const penalty = await Penalty.findOne({ caseId: caseIdArg, guildId: message.guild.id });
    if (!penalty) {
      return message.reply({
        embeds: [Embeds.warn("Bulunamadı", `#${caseIdArg} numaralı ceza kaydı veritabanında bulunamadı.`, message.guild)]
      });
    }

    const createdDate = penalty.createdAt ? penalty.createdAt.toLocaleString("tr-TR") : "Bilinmiyor";
    const statusText = penalty.active ? "🔴 Aktif Devam Ediyor" : "🟢 Kaldırıldı / Tamamlandı";
    const durationText = penalty.durationMs ? `${Math.round(penalty.durationMs / 60000)} dakika` : "Süresiz / Belirtilmemiş";

    const description = [
      `• **Ceza Numarası:** \`#${penalty.caseId}\``,
      `• **Cezalandırılan:** <@${penalty.userId}> (\`${penalty.userId}\`)`,
      `• **Uygulayan Yetkili:** <@${penalty.executorId}> (\`${penalty.executorId}\`)`,
      `• **Ceza Türü:** \`${penalty.type}\``,
      `• **Sebep:** ${penalty.reason}`,
      `• **Ceza Puanı:** \`+${penalty.points}\``,
      `• **Ceza Süresi:** ${durationText}`,
      `• **Uygulanma Tarihi:** ${createdDate}`,
      `• **Durum:** ${statusText}`
    ];

    if (!penalty.active && penalty.liftedAt) {
      description.push(`• **Kaldırılma Tarihi:** ${penalty.liftedAt.toLocaleString("tr-TR")}`);
      description.push(`• **Kaldıran:** ${penalty.liftedBy === "AUTO_EXPIRY" ? "Otomatik Süre Sonu Sistemi" : `<@${penalty.liftedBy}>`}`);
    }

    message.reply({
      embeds: [Embeds.info(`Ceza #${penalty.caseId} Detayları`, description.join("\n"), message.guild)]
    });
  }
};
