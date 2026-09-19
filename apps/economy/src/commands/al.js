import { Economy, MarketItem } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "al",
  aliases: ["satınal", "satinal"],
  async execute({ client, message, args, config }) {
    const type = (args[0] || "").toLowerCase();
    const count = parseInt(args[1], 10) || 1;

    if (!["altin", "altın", "gold", "btc", "kripto"].includes(type) || count <= 0) {
      return message.reply(MessageFormatter.warn(
        "Hatalı Kullanım",
        `Lütfen geçerli bir varlık ve miktar belirtin.\n\n▫️ Örnek: \`${config.prefix || "."}al altın 2\` veya \`${config.prefix || "."}al btc 1\``
      ));
    }

    const isGold = ["altin", "altın", "gold"].includes(type);
    const itemKey = isGold ? "GOLD" : "BTC";
    const itemName = isGold ? "Altın" : "Bitcoin";
    const unitPrice = isGold ? (config.economyMarket?.goldPrice || 2500) : (config.economyMarket?.btcPrice || 65000);
    const totalPrice = unitPrice * count;

    const userEco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!userEco || (userEco.wallet || 0) < totalPrice) {
      return message.reply(MessageFormatter.error(
        "Yetersiz Bakiye",
        `Bu alım için cüzdanınızda **${totalPrice.toLocaleString("tr-TR")} Coin** bulunması gerekir.\n\n▫️ Mevcut Cüzdan: **${(userEco?.wallet || 0).toLocaleString("tr-TR")} Coin**`
      ));
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

    return message.reply(MessageFormatter.success(
      "Alım İşlemi Başarılı",
      `Başarıyla **${count} adet ${itemName}** satın aldınız.\n\n▫️ Ödenen Tutar: **${totalPrice.toLocaleString("tr-TR")} Coin**\n▫️ Birim Fiyat: **${unitPrice.toLocaleString("tr-TR")} Coin**\n▫️ Kalan Cüzdan: **${((userEco?.wallet || 0) - totalPrice).toLocaleString("tr-TR")} Coin**`
    ));
  }
};

