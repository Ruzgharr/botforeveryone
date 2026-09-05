import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

const PROPERTIES = [
  { id: "kucuk_ev", name: "Kucuk Ev", price: 3000, dailyIncome: 50 },
  { id: "buyuk_ev", name: "Buyuk Ev", price: 8000, dailyIncome: 150 },
  { id: "villa", name: "Villa", price: 20000, dailyIncome: 400 },
  { id: "arsa", name: "Arsa", price: 5000, dailyIncome: 80 },
  { id: "ofis", name: "Ofis Binasi", price: 15000, dailyIncome: 300 },
];

export default {
  name: "emlak",
  aliases: ["mulk", "ev"],
  async execute({ message, args, config }) {
    const prefix = config.prefix || ".";
    const subCmd = (args[0] || "").toLowerCase();

    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    if (subCmd === "liste") {
      const lines = PROPERTIES.map((p, i) => `**${i + 1}.** ${p.name} - **${p.price} Coin** | Gunluk: +${p.dailyIncome} Coin`);
      return message.reply({ embeds: [Embeds.info("Emlak Listesi", lines.join("\n"), message.guild)] });
    }

    if (subCmd === "al") {
      const propId = args[1]?.toLowerCase();
      const prop = PROPERTIES.find((p) => p.id === propId || p.name.toLowerCase() === propId);
      if (!prop) return message.reply({ embeds: [Embeds.warn("Bulunamadi", `Gecerli bir emlak adi girin. \`${prefix}emlak liste\` yazarak gorme yapabilirsiniz.`, message.guild)] });
      if (!eco.properties) eco.properties = [];
      if (eco.properties.includes(prop.id)) return message.reply({ embeds: [Embeds.warn("Zaten Sahip", `**${prop.name}** mulkune zaten sahipsiniz.`, message.guild)] });
      if (eco.wallet < prop.price) return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Bu emlak icin **${prop.price} Coin** gerekiyor.`, message.guild)] });

      eco.wallet -= prop.price;
      eco.properties.push(prop.id);
      await eco.save();
      return message.reply({ embeds: [Embeds.success("Emlak Alindi", `**${prop.name}** satin alindi! Gunluk **${prop.dailyIncome} Coin** gelir elde edersiniz.`, message.guild)] });
    }

    if (subCmd === "gelir") {
      if (!eco.properties || eco.properties.length === 0) return message.reply({ embeds: [Embeds.warn("Mulk Yok", `Hicbir mulkunuz yok. \`${prefix}emlak al\` ile satin alin.`, message.guild)] });
      const now = Date.now();
      const lastIncome = eco.propertyLastIncome ? new Date(eco.propertyLastIncome).getTime() : 0;
      const elapsed = now - lastIncome;
      const interval = 24 * 60 * 60 * 1000;
      if (elapsed < interval) {
        const remaining = Math.ceil((interval - elapsed) / 3600000);
        return message.reply({ embeds: [Embeds.warn("Bekleyin", `Emlak geliri icin **${remaining} saat** beklemeniz gerekiyor.`, message.guild)] });
      }
      const totalIncome = eco.properties.reduce((sum, pid) => {
        const p = PROPERTIES.find((x) => x.id === pid);
        return sum + (p?.dailyIncome || 0);
      }, 0);
      eco.wallet += totalIncome;
      eco.propertyLastIncome = new Date();
      await eco.save();
      return message.reply({ embeds: [Embeds.success("Emlak Geliri", `Mulklerinizden toplam **${totalIncome} Coin** gelir elde ettiniz!`, message.guild)] });
    }

    const owned = (eco.properties || []).map((pid) => PROPERTIES.find((p) => p.id === pid)?.name || pid).join(", ") || "Hic mulk yok";
    return message.reply({
      embeds: [Embeds.info("Emlak Portfoyunuz", `**Mulkler:** ${owned}\n\n• \`${prefix}emlak liste\` - Satin alinanilabilir mulkler\n• \`${prefix}emlak al <isim>\` - Mulk satin al\n• \`${prefix}emlak gelir\` - Gunluk geliri topla`, message.guild)]
    });
  }
};
