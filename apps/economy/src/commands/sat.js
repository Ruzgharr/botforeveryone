import { Economy, MarketItem } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "sat",
  aliases: ["bozdur"],
  async execute({ client, message, args, config }) {
    const type = (args[0] || "").toLowerCase();
    const count = parseInt(args[1], 10) || 1;

    if (!["altin", "altın", "gold", "btc", "kripto"].includes(type) || count <= 0) {
      return message.reply({ embeds: [Embeds.warn("Hatalı Kullanım", "Lütfen geçerli bir varlık ve miktar belirtin. Örnek: `.sat altın 2` veya `.sat btc 1`", message.guild)] });
    }

    const isGold = ["altin", "altın", "gold"].includes(type);
    const itemKey = isGold ? "GOLD" : "BTC";
    const itemName = isGold ? "Altın" : "Bitcoin";
    const unitPrice = isGold ? (config.economyMarket?.goldPrice || 2500) : (config.economyMarket?.btcPrice || 65000);
    const totalReturn = unitPrice * count;

    const userItem = await MarketItem.findOne({ guildId: message.guild.id, userId: message.author.id, itemKey });
    if (!userItem || userItem.amount < count) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Varlık", `Satmak için hesabınızda en az **${count} adet ${itemName}** bulunmalıdır. Mevcut varlığınız: **${userItem?.amount || 0} Adet**`, message.guild)] });
    }

    await MarketItem.updateOne(
      { _id: userItem._id },
      { $inc: { amount: -count } }
    );

    await Economy.findOneAndUpdate(
      { guildId: message.guild.id, userId: message.author.id },
      { $inc: { wallet: totalReturn } },
      { upsert: true }
    );

    const embed = Embeds.success(
      "Satış İşlemi Başarılı",
      `Başarıyla **${count} adet ${itemName}** bozdurdunuz.\nKazanılan Tutar: **+${totalReturn} Coin**\nBirim Satış Fiyatı: **${unitPrice} Coin**`,
      message.guild
    );

    message.reply({ embeds: [embed] });
  }
};
