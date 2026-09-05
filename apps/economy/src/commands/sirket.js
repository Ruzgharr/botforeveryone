import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

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
      if (!name) return message.reply({ embeds: [Embeds.warn("Isim Gerekli", `Kullanim: \`${prefix}sirket kur <isim>\``, message.guild)] });
      if (eco.company?.name) return message.reply({ embeds: [Embeds.warn("Zaten Sirket Var", `**${eco.company.name}** adli sirketiniz mevcut.`, message.guild)] });
      if (eco.wallet < COMPANY_COST) return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Sirket kurmak icin **${COMPANY_COST} Coin** gerekiyor.`, message.guild)] });

      eco.wallet -= COMPANY_COST;
      eco.company = { name, level: 1, lastIncome: new Date() };
      await eco.save();
      return message.reply({ embeds: [Embeds.success("Sirket Kuruldu", `**${name}** sirketiniz basariyla kuruldu! Her saat otomatik gelir elde edersiniz.`, message.guild)] });
    }

    if (subCmd === "gelir") {
      if (!eco.company?.name) return message.reply({ embeds: [Embeds.warn("Sirket Yok", `Once \`${prefix}sirket kur <isim>\` ile sirket kurun.`, message.guild)] });
      const now = Date.now();
      const lastIncome = new Date(eco.company.lastIncome).getTime();
      const elapsed = now - lastIncome;
      if (elapsed < COMPANY_INCOME_INTERVAL) {
        const remaining = Math.ceil((COMPANY_INCOME_INTERVAL - elapsed) / 60000);
        return message.reply({ embeds: [Embeds.warn("Bekleyin", `Bir sonraki gelir icin **${remaining} dakika** beklemeniz gerekiyor.`, message.guild)] });
      }
      const income = (eco.company.level || 1) * 100;
      eco.wallet += income;
      eco.company.lastIncome = new Date();
      await eco.save();
      return message.reply({ embeds: [Embeds.success("Sirket Geliri", `**${eco.company.name}** sirketinizden **${income} Coin** gelir elde ettiniz!`, message.guild)] });
    }

    if (subCmd === "gelistir") {
      if (!eco.company?.name) return message.reply({ embeds: [Embeds.warn("Sirket Yok", `Once sirket kurun.`, message.guild)] });
      const upgradeCost = (eco.company.level || 1) * 2000;
      if (eco.wallet < upgradeCost) return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Gelistirme icin **${upgradeCost} Coin** gerekiyor.`, message.guild)] });
      eco.wallet -= upgradeCost;
      eco.company.level = (eco.company.level || 1) + 1;
      await eco.save();
      return message.reply({ embeds: [Embeds.success("Sirket Gelistirildi", `**${eco.company.name}** sirketiniz **Seviye ${eco.company.level}** oldu! Saatlik gelir artti.`, message.guild)] });
    }

    const comp = eco.company;
    const desc = comp?.name
      ? `**Sirket:** ${comp.name}\n**Seviye:** ${comp.level}\n**Saatlik Gelir:** ${comp.level * 100} Coin\n\n• \`${prefix}sirket gelir\` - Geliri al\n• \`${prefix}sirket gelistir\` - Sirket gelistir`
      : `Henuz bir sirketiniz yok.\n\n• \`${prefix}sirket kur <isim>\` - ${COMPANY_COST} Coin karsiliginda sirket kur`;
    return message.reply({ embeds: [Embeds.info("Sirket", desc, message.guild)] });
  }
};
