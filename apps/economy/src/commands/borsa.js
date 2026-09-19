import { MessageFormatter } from "@bot/core";
import { MarketItem } from "@bot/database";

export default {
  name: "borsa",
  aliases: ["piyasa", "market"],
  async execute({ client, message, args, config }) {
    const market = config.economyMarket || { goldPrice: 2500, btcPrice: 65000 };
    const userItems = await MarketItem.find({ guildId: message.guild.id, userId: message.author.id });

    const goldItem = userItems.find((i) => i.itemKey === "GOLD")?.amount || 0;
    const btcItem = userItems.find((i) => i.itemKey === "BTC")?.amount || 0;

    const goldVal = goldItem * market.goldPrice;
    const btcVal = btcItem * market.btcPrice;
    const totalVal = goldVal + btcVal;

    const content = [
      `### 📈 Dinamik Sunucu Borsası & Emtia Piyasası`,
      `▫️ Piyasa Fiyatları:`,
      `  • Altın (GOLD): **${market.goldPrice.toLocaleString("tr-TR")} Coin**`,
      `  • Bitcoin (BTC): **${market.btcPrice.toLocaleString("tr-TR")} Coin**`,
      "",
      `▫️ Sizin Portföyünüz:`,
      `  • Altın: **${goldItem} Adet** (${goldVal.toLocaleString("tr-TR")} Coin)`,
      `  • BTC: **${btcItem} Adet** (${btcVal.toLocaleString("tr-TR")} Coin)`,
      `  • Toplam Portföy Değeri: **${totalVal.toLocaleString("tr-TR")} Coin**`,
      "",
      `▫️ Hızlı Komutlar:`,
      `  • Alım: \`${config.prefix || "."}al altın <adet>\` | \`${config.prefix || "."}al btc <adet>\``,
      `  • Satış: \`${config.prefix || "."}sat altın <adet>\` | \`${config.prefix || "."}sat btc <adet>\``,
      "",
      `-# Fiyatlar sunucu piyasa dinamiklerine göre güncellenmektedir.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

