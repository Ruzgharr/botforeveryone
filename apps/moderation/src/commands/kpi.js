import { StaffKpi } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "kpi",
  aliases: ["yetkili", "yetkilibilgi", "yetkilisiralamasi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu sadece yetkililer görüntüleyebilir.", message.guild)] });
    }

    const records = await StaffKpi.find({ guildId: message.guild.id, period: "WEEKLY" })
      .sort({ totalScore: -1 })
      .limit(10);

    if (records.length === 0) {
      return message.reply({ embeds: [Embeds.info("Yetkili Performansı", "Bu hafta için henüz kayıtlı yetkili performansı bulunmuyor.", message.guild)] });
    }

    const lines = records.map((r, i) => {
      return `**${i + 1}.** <@${r.staffId}> : **Puan: ${r.totalScore}** (Ban: ${r.bans} | Jail: ${r.jails} | Mute: ${r.mutes} | Kayıt: ${r.registers})`;
    }).join("\n");

    const embed = Embeds.success(
      "Haftalık Yetkili Performans Sıralaması",
      `Sunucu yetkililerinin haftalık aktivite ve görev başarı tablosu:\n\n${lines}`,
      message.guild
    );

    message.reply({ embeds: [embed] });
  }
};
