import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

const COMPANY_COST = 5000;
const COMPANY_INCOME_INTERVAL = 60 * 60 * 1000;

export default {
  name: "sirket",
  aliases: ["company", "is"],
  async execute({ message, args, config }) {
    const prefix = config.prefix || ".";
    const subCmd = (args[0] || "").toLowerCase();

    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    if (subCmd === "kur") {
      const name = args.slice(1).join(" ").trim();
      if (!name) return message.reply(MessageFormatter.warn("İsim Gerekli", `Kullanım: \`${prefix}sirket kur <isim>\``));
      if (eco.company?.name) return message.reply(MessageFormatter.warn("Zaten Şirket Var", `**${eco.company.name}** adlı şirketiniz mevcut.`));
      if (eco.wallet < COMPANY_COST) return message.reply(MessageFormatter.error("Yetersiz Bakiye", `Şirket kurmak için **${COMPANY_COST} Coin** gerekiyor.`));

      eco.wallet -= COMPANY_COST;
      eco.company = { name, level: 1, lastIncome: new Date() };
      await eco.save();
      return message.reply(MessageFormatter.render("companyCreated", {
        name,
        title: "Şirket Kuruluşu Onaylandı"
      }, config, message.guild));
    }

    if (subCmd === "gelir") {
      if (!eco.company?.name) return message.reply(MessageFormatter.warn("Şirket Yok", `Önce \`${prefix}sirket kur <isim>\` ile şirket kurun.`));
      const now = Date.now();
      const lastIncome = new Date(eco.company.lastIncome).getTime();
      const elapsed = now - lastIncome;
      if (elapsed < COMPANY_INCOME_INTERVAL) {
        const remaining = Math.ceil((COMPANY_INCOME_INTERVAL - elapsed) / 60000);
        return message.reply(MessageFormatter.warn("Bekleyin", `Bir sonraki gelir için **${remaining} dakika** beklemeniz gerekiyor.`));
      }
      const income = (eco.company.level || 1) * 100;
      eco.wallet += income;
      eco.company.lastIncome = new Date();
      await eco.save();
      return message.reply(MessageFormatter.success("Şirket Geliri", `**${eco.company.name}** şirketinizden **${income} Coin** gelir elde ettiniz!`));
    }

    if (subCmd === "gelistir") {
      if (!eco.company?.name) return message.reply(MessageFormatter.warn("Şirket Yok", "Önce şirket kurun."));
      const upgradeCost = (eco.company.level || 1) * 2000;
      if (eco.wallet < upgradeCost) return message.reply(MessageFormatter.error("Yetersiz Bakiye", `Geliştirme için **${upgradeCost} Coin** gerekiyor.`));
      eco.wallet -= upgradeCost;
      eco.company.level = (eco.company.level || 1) + 1;
      await eco.save();
      return message.reply(MessageFormatter.success("Şirket Geliştirildi", `**${eco.company.name}** şirketiniz **Seviye ${eco.company.level}** oldu! Saatlik gelir arttı.`));
    }

    const comp = eco.company;
    const desc = comp?.name
      ? `▫️ **Şirket:** ${comp.name}\n▫️ **Seviye:** \`${comp.level}\`\n▫️ **Saatlik Gelir:** \`${comp.level * 100}\` Coin\n\n▫️ \`${prefix}sirket gelir\` - Geliri topla\n▫️ \`${prefix}sirket gelistir\` - Şirket geliştir`
      : `▫️ Henüz bir şirketiniz yok.\n\n▫️ \`${prefix}sirket kur <isim>\` - ${COMPANY_COST} Coin karşılığında şirket kur`;
    return message.reply(MessageFormatter.info("Şirket Yönetim Paneli", `${desc}\n-# Ecosystem Şirket ve Ticaret Sistemi`));
  }
};
