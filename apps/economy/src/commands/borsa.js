import { Embeds } from "@bot/core";
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

    const embed = Embeds.success(
      "Dinamik Sunucu Borsası ve Emtia Piyasası",
      `Anlık Piyasa Fiyatları:\n` +
      `• Altın (GOLD): **${market.goldPrice} Coin**\n` +
      `• Kripto (BTC): **${market.btcPrice} Coin**\n\n` +
      `Sizin Portföyünüz:\n` +
      `• Altın: **${goldItem} Adet** (${goldVal} Coin)\n` +
      `• BTC: **${btcItem} Adet** (${btcVal} Coin)\n` +
      `• Toplam Portföy Değeri: **${totalVal} Coin**\n\n` +
      `Alım yapmak için: \`.al altın <adet>\` veya \`.al btc <adet>\`\n` +
      `Satış yapmak için: \`.sat altın <adet>\` veya \`.sat btc <adet>\``,
      message.guild
    );

    message.reply({ embeds: [embed] });
  }
};
