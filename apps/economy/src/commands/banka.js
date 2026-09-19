import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "banka",
  aliases: ["yatır", "yatir", "çek", "cek", "dep", "with"],
  async execute({ client, message, args, config }) {
    const subCommand = (args[0] || "").toLowerCase();
    const amountArg = args[1];

    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    if (subCommand === "yatır" || subCommand === "yatir" || subCommand === "dep") {
      let amount = 0;
      if (amountArg === "hepsi" || amountArg === "all") {
        amount = eco.wallet;
      } else {
        amount = parseInt(amountArg, 10);
      }

      if (isNaN(amount) || amount <= 0) {
        return message.reply(MessageFormatter.warn(
          "Geçersiz Miktar",
          `Lütfen yatırmak istediğiniz geçerli bir miktar belirtin ya da \`hepsi\` yazın.\n\n▫️ Örnek: \`${config.prefix || "."}banka yatır 500\``
        ));
      }

      if (eco.wallet < amount) {
        return message.reply(MessageFormatter.error(
          "Yetersiz Bakiye",
          `Cüzdanınızda yalnızca **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin** bulunuyor.`
        ));
      }

      await Economy.updateOne(
        { _id: eco._id },
        { $inc: { wallet: -amount, bank: amount } }
      );

      return message.reply(MessageFormatter.success(
        "Banka Yatırımı Başarılı",
        `Cüzdanınızdan **${amount.toLocaleString("tr-TR")} Coin** banka kasanıza aktarıldı.\n\n▫️ Yeni Cüzdan: **${(eco.wallet - amount).toLocaleString("tr-TR")} Coin**\n▫️ Yeni Banka Kasası: **${(eco.bank + amount).toLocaleString("tr-TR")} Coin**`
      ));
    }

    if (subCommand === "çek" || subCommand === "cek" || subCommand === "with") {
      let amount = 0;
      if (amountArg === "hepsi" || amountArg === "all") {
        amount = eco.bank;
      } else {
        amount = parseInt(amountArg, 10);
      }

      if (isNaN(amount) || amount <= 0) {
        return message.reply(MessageFormatter.warn(
          "Geçersiz Miktar",
          `Lütfen çekmek istediğiniz geçerli bir miktar belirtin ya da \`hepsi\` yazın.\n\n▫️ Örnek: \`${config.prefix || "."}banka çek 500\``
        ));
      }

      if (eco.bank < amount) {
        return message.reply(MessageFormatter.error(
          "Yetersiz Bakiye",
          `Banka hesabınızda yalnızca **${(eco.bank || 0).toLocaleString("tr-TR")} Coin** bulunuyor.`
        ));
      }

      await Economy.updateOne(
        { _id: eco._id },
        { $inc: { wallet: amount, bank: -amount } }
      );

      return message.reply(MessageFormatter.success(
        "Para Çekme Başarılı",
        `Bankanızdan **${amount.toLocaleString("tr-TR")} Coin** nakit olarak cüzdanınıza aktarıldı.\n\n▫️ Yeni Cüzdan: **${(eco.wallet + amount).toLocaleString("tr-TR")} Coin**\n▫️ Yeni Banka Kasası: **${(eco.bank - amount).toLocaleString("tr-TR")} Coin**`
      ));
    }

    const content = [
      `### 🏦 Sunucu Bankacılık İşlemleri`,
      `▫️ Mevcut Bakiyeniz:`,
      `  • Nakit Cüzdan: **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin**`,
      `  • Banka Kasası: **${(eco.bank || 0).toLocaleString("tr-TR")} Coin**`,
      "",
      `▫️ Kullanılabilir Komutlar:`,
      `  • Para Yatırma: \`${config.prefix || "."}banka yatır <miktar / hepsi>\``,
      `  • Para Çekme: \`${config.prefix || "."}banka çek <miktar / hepsi>\``,
      "",
      `-# Banka kasanızdaki paralar soygun girişimlerine karşı %100 güvendedir.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

