import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "topcoin",
  aliases: ["zenginler", "rich", "balinalar"],
  async execute({ client, message, args, config }) {
    const list = await Economy.find({ guildId: message.guild.id }).limit(100);

    const enriched = list.map((item) => ({
      userId: item.userId,
      total: (item.wallet || 0) + (item.bank || 0)
    })).sort((a, b) => b.total - a.total).slice(0, 10);

    if (enriched.length === 0) {
      return message.reply({ embeds: [Embeds.info("Ekonomi Sıralaması", "Sunucuda henüz kayıtlı bakiye verisi bulunmuyor.", message.guild)] });
    }

    const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."];

    const lines = enriched.map((item, idx) => {
      const badge = medals[idx] || `${idx + 1}.`;
      return `${badge} <@${item.userId}> : **${item.total.toLocaleString("tr-TR")} Coin**`;
    }).join("\n");

    const embed = Embeds.success(
      `${message.guild.name} - En Zenginler Sıralaması (Top 10)`,
      `Sunucunun en yüksek bakiyeli üyeleri (Cüzdan + Banka):\n\n${lines}`,
      message.guild
    );

    message.reply({ embeds: [embed] });
  }
};
