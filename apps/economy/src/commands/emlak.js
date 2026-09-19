import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

const PROPERTIES = [
  { id: "kucuk_ev", name: "Küçük Ev", price: 3000, dailyIncome: 50 },
  { id: "buyuk_ev", name: "Büyük Ev", price: 8000, dailyIncome: 150 },
  { id: "villa", name: "Villa", price: 20000, dailyIncome: 400 },
  { id: "arsa", name: "Arsa", price: 5000, dailyIncome: 80 },
  { id: "ofis", name: "Ofis Binası", price: 15000, dailyIncome: 300 },
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
      const lines = PROPERTIES.map((p, i) => `▫️ **${i + 1}.** ${p.name}: **\`${p.price}\` Coin** | Günlük: \`+${p.dailyIncome}\` Coin`);
      return message.reply(MessageFormatter.info("Satın Alınabilir Emlaklar", `${lines.join("\n")}\n-# Satın almak için: \`${prefix}emlak al <mülk_adı>\``));
    }

    if (subCmd === "al") {
      const propId = args[1]?.toLowerCase();
      const prop = PROPERTIES.find((p) => p.id === propId || p.name.toLowerCase() === propId);
      if (!prop) return message.reply(MessageFormatter.warn("Bulunamadı", `Geçerli bir emlak adı girin. \`${prefix}emlak liste\` yazarak inceleyebilirsiniz.`));
      if (!eco.properties) eco.properties = [];
      if (eco.properties.includes(prop.id)) return message.reply(MessageFormatter.warn("Zaten Sahipsiniz", `**${prop.name}** mülküne zaten sahipsiniz.`));
      if (eco.wallet < prop.price) return message.reply(MessageFormatter.error("Yetersiz Bakiye", `Bu emlak için **${prop.price} Coin** gerekiyor.`));

      eco.wallet -= prop.price;
      eco.properties.push(prop.id);
      await eco.save();
      return message.reply(MessageFormatter.render("propertyBought", {
        type: `${prop.name} (${prop.price} Coin - Günlük: +${prop.dailyIncome} Coin)`,
        title: "Gayrimenkul Yatırımı Yapıldı"
      }, config, message.guild));
    }

    if (subCmd === "gelir") {
      if (!eco.properties || eco.properties.length === 0) return message.reply(MessageFormatter.warn("Mülk Yok", `Hiçbir mülkünüz yok. \`${prefix}emlak al\` ile satın alın.`));
      const now = Date.now();
      const lastIncome = eco.propertyLastIncome ? new Date(eco.propertyLastIncome).getTime() : 0;
      const elapsed = now - lastIncome;
      const interval = 24 * 60 * 60 * 1000;
      if (elapsed < interval) {
        const remaining = Math.ceil((interval - elapsed) / 3600000);
        return message.reply(MessageFormatter.warn("Bekleyin", `Emlak geliri için **${remaining} saat** beklemeniz gerekiyor.`));
      }
      const totalIncome = eco.properties.reduce((sum, pid) => {
        const p = PROPERTIES.find((x) => x.id === pid);
        return sum + (p?.dailyIncome || 0);
      }, 0);
      eco.wallet += totalIncome;
      eco.propertyLastIncome = new Date();
      await eco.save();
      return message.reply(MessageFormatter.success("Emlak Geliri Toplandı", `Mülklerinizden toplam **${totalIncome} Coin** kira geliri elde ettiniz!`));
    }

    const owned = (eco.properties || []).map((pid) => PROPERTIES.find((p) => p.id === pid)?.name || pid).join(", ") || "Hiç mülk yok";
    return message.reply(MessageFormatter.info(
      "Emlak Portföyünüz",
      `▫️ **Sahip Olunan Mülkler:** ${owned}\n\n▫️ \`${prefix}emlak liste\` - Satın alınabilir mülkler\n▫️ \`${prefix}emlak al <isim>\` - Mülk satın al\n▫️ \`${prefix}emlak gelir\` - Günlük geliri topla\n-# Ecosystem Emlak ve Gayrimenkul Sistemi`
    ));
  }
};
