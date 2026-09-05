import { UserAccount } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "topteyit",
  aliases: ["top-teyit", "teyitsıralama", "teyitsiralama", "topkayit"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const leaderboard = await UserAccount.aggregate([
      { $match: { guildId: message.guild.id, registeredBy: { $ne: null } } },
      {
        $group: {
          _id: "$registeredBy",
          total: { $sum: 1 },
          men: { $sum: { $cond: [{ $eq: ["$gender", "MAN"] }, 1, 0] } },
          women: { $sum: { $cond: [{ $eq: ["$gender", "WOMAN"] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    if (!leaderboard || leaderboard.length === 0) {
      return message.reply({
        embeds: [Embeds.info("Sıralama Boş", "Sunucuda henüz kayıt verisi kaydedilmemiş.", message.guild)]
      });
    }

    const medals = ["🥇", "🥈", "🥉"];
    const rows = leaderboard.map((item, index) => {
      const badge = medals[index] || `**${index + 1}.**`;
      return `${badge} <@${item._id}>: **${item.total}** Kayıt (\`${item.men} Erkek\`, \`${item.women} Kadın\`)`;
    });

    const description = [
      "Sunucuda en çok kayıt gerçekleştiren yetkililer:",
      "",
      ...rows
    ].join("\n");

    message.reply({
      embeds: [
        Embeds.success("🏆 Yetkili Kayıt Sıralaması (Top 10)", description, message.guild)
      ]
    });
  }
};
