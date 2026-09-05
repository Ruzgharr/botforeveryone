import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

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
        return message.reply({
          embeds: [Embeds.warn("Geçersiz Miktar", "Lütfen yatırmak istediğiniz geçerli bir miktar belirtin ya da `hepsi` yazın.", message.guild)]
        });
      }

      if (eco.wallet < amount) {
        return message.reply({
          embeds: [Embeds.error("Yetersiz Bakiye", `Cüzdanınızda yalnızca **${eco.wallet} Coin** bulunuyor.`, message.guild)]
        });
      }

      await Economy.updateOne(
        { _id: eco._id },
        { $inc: { wallet: -amount, bank: amount } }
      );

      return message.reply({
        embeds: [
          Embeds.success(
            "Banka Yatırımı Başarılı",
            `Cüzdanınızdan **${amount} Coin** banka kasanıza aktarıldı.\n\n• **Yeni Cüzdan:** ${eco.wallet - amount} Coin\n• **Yeni Banka:** ${eco.bank + amount} Coin`,
            message.guild
          )
        ]
      });
    }

    if (subCommand === "çek" || subCommand === "cek" || subCommand === "with") {
      let amount = 0;
      if (amountArg === "hepsi" || amountArg === "all") {
        amount = eco.bank;
      } else {
        amount = parseInt(amountArg, 10);
      }

      if (isNaN(amount) || amount <= 0) {
        return message.reply({
          embeds: [Embeds.warn("Geçersiz Miktar", "Lütfen çekmek istediğiniz geçerli bir miktar belirtin ya da `hepsi` yazın.", message.guild)]
        });
      }

      if (eco.bank < amount) {
        return message.reply({
          embeds: [Embeds.error("Yetersiz Bakiye", `Banka hesabınızda yalnızca **${eco.bank} Coin** bulunuyor.`, message.guild)]
        });
      }

      await Economy.updateOne(
        { _id: eco._id },
        { $inc: { wallet: amount, bank: -amount } }
      );

      return message.reply({
        embeds: [
          Embeds.success(
            "Para Çekme Başarılı",
            `Bankanızdan **${amount} Coin** nakit olarak cüzdanınıza aktarıldı.\n\n• **Yeni Cüzdan:** ${eco.wallet + amount} Coin\n• **Yeni Banka:** ${eco.bank - amount} Coin`,
            message.guild
          )
        ]
      });
    }

    message.reply({
      embeds: [
        Embeds.info(
          "Banka İşlemleri",
          `• Para Yatırma: \`${config.prefix || "."}banka yatır <miktar / hepsi>\`\n• Para Çekme: \`${config.prefix || "."}banka çek <miktar / hepsi>\`\n\n• Cüzdan: **${eco.wallet} Coin**\n• Banka Kasası: **${eco.bank} Coin**`,
          message.guild
        )
      ]
    });
  }
};
