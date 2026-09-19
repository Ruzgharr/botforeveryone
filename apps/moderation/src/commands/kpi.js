import { StaffKpi } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "kpi",
  aliases: ["yetkili", "yetkilibilgi", "yetkilisiralamasi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu sadece yetkililer görüntüleyebilir."));
    }

    const records = await StaffKpi.find({ guildId: message.guild.id, period: "WEEKLY" })
      .sort({ totalScore: -1 })
      .limit(10);

    if (records.length === 0) {
      return message.reply(MessageFormatter.info("Yetkili Performansı", "Bu hafta için henüz kayıtlı yetkili performansı bulunmuyor."));
    }

    const lines = records.map((r, i) => {
      return `▫️ **${i + 1}.** <@${r.staffId}> • **Puan:** \`${r.totalScore}\` (Ban: \`${r.bans}\` | Jail: \`${r.jails}\` | Mute: \`${r.mutes}\` | Kayıt: \`${r.registers}\`)`;
    }).join("\n");

    message.reply(MessageFormatter.info(
      "Haftalık Yetkili Performans Sıralaması",
      `Sunucu yetkililerinin haftalık aktivite ve görev başarı tablosu:\n\n${lines}\n-# Haftalık KPI Performans Takip Sistemi`
    ));
  }
};
