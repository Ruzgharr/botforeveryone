import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

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
        return message.reply(MessageFormatter.warn("Geçersiz Miktar", "Yatırmak istediğiniz miktarı belirtin."));
      }
      if (eco.wallet < amount) {
        return message.reply(MessageFormatter.error("Yetersiz Bakiye", `Cüzdanınızda yalnızca **${eco.wallet} Coin** var.`));
      }
      if (eco.deposit?.amount > 0) {
        return message.reply(MessageFormatter.warn("Aktif Mevduat", "Zaten aktif bir vadeli mevduatınız var. Önce çekin."));
      }

      eco.wallet -= amount;
      eco.deposit = { amount, startedAt: new Date(), matureAt: new Date(Date.now() + DEPOSIT_DURATION) };
      await eco.save();

      return message.reply(MessageFormatter.render("depositSuccess", {
        amount,
        title: "Vadeli Mevduat Hesabı Açıldı"
      }, config, message.guild));
    }

    if (subCmd === "cek" || subCmd === "çek") {
      if (!eco.deposit?.amount || eco.deposit.amount <= 0) {
        return message.reply(MessageFormatter.warn("Mevduat Yok", "Aktif vadeli mevduatınız bulunmuyor."));
      }
      const now = Date.now();
      const matured = eco.deposit.matureAt && now >= new Date(eco.deposit.matureAt).getTime();
      const principal = eco.deposit.amount;
      const payout = matured ? Math.floor(principal * (1 + INTEREST_RATE)) : principal;
      eco.wallet += payout;
      eco.deposit = { amount: 0, startedAt: null, matureAt: null };
      await eco.save();

      const msg = matured
        ? `Mevduatınız olgunlaştı! **${payout} Coin** (faiz dahil) cüzdanınıza aktarıldı.`
        : `Mevduatınız henüz olgunlaşmamıştı. Faiz kaybı ile anapara **${principal} Coin** geri alındı.`;
      return message.reply(MessageFormatter.success("Mevduat Çekildi", msg));
    }

    const deposit = eco.deposit;
    const active = deposit?.amount > 0;
    let desc = `▫️ **Yatır:** \`${prefix}mevduat yatir <miktar>\`\n▫️ **Çek:** \`${prefix}mevduat cek\`\n\n`;
    if (active) {
      const matureDate = new Date(deposit.matureAt);
      const faiz = Math.floor(deposit.amount * INTEREST_RATE);
      desc += `▫️ **Aktif Mevduat:** \`${deposit.amount}\` Coin\n▫️ **Faiz Getirisi:** \`+${faiz}\` Coin\n▫️ **Vade Sonu:** <t:${Math.floor(matureDate.getTime() / 1000)}:R>`;
    } else {
      desc += "▫️ Aktif vadeli mevduatınız bulunmuyor.";
    }

    return message.reply(MessageFormatter.info("Vadeli Mevduat Bilgisi", `${desc}\n-# Ecosystem Finans ve Vadeli Mevduat Sistemi`));
  }
};
