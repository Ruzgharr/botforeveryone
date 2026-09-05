import { Economy, MarketItem, GuildConfig } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "envanter",
  aliases: ["çanta", "canta", "inv", "inventory"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.warn("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı.", message.guild)] });
    }

    const eco = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    const marketHoldings = await MarketItem.find({ guildId: message.guild.id, userId: targetUser.id, amount: { $gt: 0 } });

    const guildConf = await GuildConfig.findOne({ guildId: message.guild.id });
    const goldPrice = guildConf?.economyMarket?.goldPrice || 2500;
    const btcPrice = guildConf?.economyMarket?.btcPrice || 65000;

    const items = eco?.inventory || [];
    const itemRows = items.length > 0
      ? items.map((i, idx) => `• **${i.name}** (\`${i.itemId}\`) - Satın Alma: ${new Date(i.purchasedAt).toLocaleDateString("tr-TR")}`).join("\n")
      : "Henüz mağazadan satın alınan ürün yok.";

    const holdingRows = marketHoldings.length > 0
      ? marketHoldings.map((h) => {
          const currentPrice = h.itemKey === "altin" ? goldPrice : btcPrice;
          const totalVal = Math.round(h.amount * currentPrice);
          return `• **${h.itemName}:** \`${h.amount.toFixed(4)}\` adet (Değer: **${totalVal} Coin**)`;
        }).join("\n")
      : "Borsada aktif emtia/varlık bulunmuyor.";

    const description = [
      `### 💰 Varlık Özeti`,
      `• **Cüzdan:** \`${eco?.wallet || 0}\` Coin`,
      `• **Banka:** \`${eco?.bank || 0}\` Coin`,
      "",
      `### 🎒 Satın Alınan Mağaza Ürünleri (${items.length})`,
      itemRows,
      "",
      `### 📈 Borsa Portföyü`,
      holdingRows
    ].join("\n");

    message.reply({
      embeds: [Embeds.info(`${targetUser.username} - Kullanıcı Envanteri`, description, message.guild)]
    });
  }
};
