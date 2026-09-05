import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

const DEPOSIT_DURATION = 24 * 60 * 60 * 1000;
const INTEREST_RATE = 0.05;

export default {
  name: "mevduat",
  aliases: ["vadeli"],
  async execute({ message, args, config }) {
    const prefix = config.prefix || ".";
    const subCmd = (args[0] || "").toLowerCase();

    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    if (subCmd === "yatir" || subCmd === "yatır") {
      const amount = parseInt(args[1], 10);
      if (isNaN(amount) || amount <= 0) {
        return message.reply({ embeds: [Embeds.warn("Gecersiz Miktar", "Yatirmak istediginiz miktari belirtin.", message.guild)] });
      }
      if (eco.wallet < amount) {
        return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Cuzdaninizda yalnizca **${eco.wallet} Coin** var.`, message.guild)] });
      }
      if (eco.deposit?.amount > 0) {
        return message.reply({ embeds: [Embeds.warn("Aktif Mevduat", "Zaten aktif bir vadeli mevduatiniz var. Once cekin.", message.guild)] });
      }

      eco.wallet -= amount;
      eco.deposit = { amount, startedAt: new Date(), matureAt: new Date(Date.now() + DEPOSIT_DURATION) };
      await eco.save();

      return message.reply({
        embeds: [Embeds.success("Mevduat Acildi", `**${amount} Coin** 24 saatlik vadeli hesaba yatirildi.\nVade sonunda **${Math.floor(amount * (1 + INTEREST_RATE))} Coin** geri alabilirsiniz.`, message.guild)]
      });
    }

    if (subCmd === "cek" || subCmd === "çek") {
      if (!eco.deposit?.amount || eco.deposit.amount <= 0) {
        return message.reply({ embeds: [Embeds.warn("Mevduat Yok", "Aktif vadeli mevduatiniz bulunmuyor.", message.guild)] });
      }
      const now = Date.now();
      const matured = eco.deposit.matureAt && now >= new Date(eco.deposit.matureAt).getTime();
      const principal = eco.deposit.amount;
      const payout = matured ? Math.floor(principal * (1 + INTEREST_RATE)) : principal;
      eco.wallet += payout;
      eco.deposit = { amount: 0, startedAt: null, matureAt: null };
      await eco.save();

      const msg = matured
        ? `Mevduatiniz olgunlasti! **${payout} Coin** (faiz dahil) cuzdaniniza aktarildi.`
        : `Mevduatiniz henuz olgunlasmamisti. Faiz kaybi ile **${principal} Coin** geri alindi.`;
      return message.reply({ embeds: [Embeds.success("Mevduat Cekildi", msg, message.guild)] });
    }

    const deposit = eco.deposit;
    const active = deposit?.amount > 0;
    let desc = `• **Yatir:** \`${prefix}mevduat yatir <miktar>\`\n• **Cek:** \`${prefix}mevduat cek\`\n\n`;
    if (active) {
      const matureDate = new Date(deposit.matureAt);
      const faiz = Math.floor(deposit.amount * INTEREST_RATE);
      desc += `**Aktif Mevduat:** ${deposit.amount} Coin\n**Faiz:** +${faiz} Coin\n**Vade Tarihi:** <t:${Math.floor(matureDate.getTime() / 1000)}:R>`;
    } else {
      desc += "Aktif vadeli mevduatiniz bulunmuyor.";
    }

    return message.reply({ embeds: [Embeds.info("Vadeli Mevduat", desc, message.guild)] });
  }
};
