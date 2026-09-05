import { Economy, MarketItem } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "al",
  aliases: ["satınal", "satinal"],
  async execute({ client, message, args, config }) {
    const type = (args[0] || "").toLowerCase();
    const count = parseInt(args[1], 10) || 1;

    if (!["altin", "altın", "gold", "btc", "kripto"].includes(type) || count <= 0) {
      return message.reply({ embeds: [Embeds.warn("Hatalı Kullanım", "Lütfen geçerli bir varlık ve miktar belirtin. Örnek: `.al altın 2` veya `.al btc 1`", message.guild)] });
    }

    const isGold = ["altin", "altın", "gold"].includes(type);
    const itemKey = isGold ? "GOLD" : "BTC";
    const itemName = isGold ? "Altın" : "Bitcoin";
    const unitPrice = isGold ? (config.economyMarket?.goldPrice || 2500) : (config.economyMarket?.btcPrice || 65000);
    const totalPrice = unitPrice * count;

    const userEco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!userEco || (userEco.wallet || 0) < totalPrice) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", `Bu alım için cüzdanınızda **${totalPrice} Coin** bulunması gerekir. Mevcut cüzdanınız: **${userEco?.wallet || 0} Coin**`, message.guild)] });
    }

    await Economy.updateOne(
      { guildId: message.guild.id, userId: message.author.id },
      { $inc: { wallet: -totalPrice } }
    );

    await MarketItem.findOneAndUpdate(
      { guildId: message.guild.id, userId: message.author.id, itemKey },
      {
        $set: { itemName },
        $inc: { amount: count },
        $setOnInsert: { buyPrice: unitPrice }
      },
      { upsert: true }
    );

    const embed = Embeds.success(
      "Alım İşlemi Başarılı",
      `Başarıyla **${count} adet ${itemName}** satın aldınız.\nÖdenen Tutar: **${totalPrice} Coin**\nBirim Fiyat: **${unitPrice} Coin**`,
      message.guild
    );

    message.reply({ embeds: [embed] });
  }
};
