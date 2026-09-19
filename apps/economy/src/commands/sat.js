import { Economy, MarketItem } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "sat",
  aliases: ["bozdur"],
  async execute({ client, message, args, config }) {
    const type = (args[0] || "").toLowerCase();
    const count = parseInt(args[1], 10) || 1;

    if (!["altin", "altın", "gold", "btc", "kripto"].includes(type) || count <= 0) {
      return message.reply(MessageFormatter.warn(
        "Hatalı Kullanım",
        `Lütfen geçerli bir varlık ve miktar belirtin.\n\n▫️ Örnek: \`${config.prefix || "."}sat altın 2\` veya \`${config.prefix || "."}sat btc 1\``
      ));
    }

    const isGold = ["altin", "altın", "gold"].includes(type);
    const itemKey = isGold ? "GOLD" : "BTC";
    const itemName = isGold ? "Altın" : "Bitcoin";
    const unitPrice = isGold ? (config.economyMarket?.goldPrice || 2500) : (config.economyMarket?.btcPrice || 65000);
    const totalReturn = unitPrice * count;

    const userItem = await MarketItem.findOne({ guildId: message.guild.id, userId: message.author.id, itemKey });
    if (!userItem || userItem.amount < count) {
      return message.reply(MessageFormatter.error(
        "Yetersiz Varlık",
        `Satmak için hesabınızda en az **${count} adet ${itemName}** bulunmalıdır.\n\n▫️ Mevcut Varlığınız: **${userItem?.amount || 0} Adet**`
      ));
    }

    await MarketItem.updateOne(
      { _id: userItem._id },
      { $inc: { amount: -count } }
    );

    const userEco = await Economy.findOneAndUpdate(
      { guildId: message.guild.id, userId: message.author.id },
      { $inc: { wallet: totalReturn } },
      { upsert: true, new: true }
    );

    return message.reply(MessageFormatter.success(
      "Satış İşlemi Başarılı",
      `Başarıyla **${count} adet ${itemName}** bozdurdunuz.\n\n▫️ Kazanılan Tutar: **+${totalReturn.toLocaleString("tr-TR")} Coin**\n▫️ Birim Satış Fiyatı: **${unitPrice.toLocaleString("tr-TR")} Coin**\n▫️ Güncel Cüzdan: **${(userEco.wallet || 0).toLocaleString("tr-TR")} Coin**`
    ));
  }
};

