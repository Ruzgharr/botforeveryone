import { Economy, MarketItem, GuildConfig } from "@bot/database";
import { MessageFormatter, VisualCard } from "@bot/core";

export default {
  name: "envanter",
  aliases: ["çanta", "canta", "inv", "inventory"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!targetUser) {
      return message.reply(MessageFormatter.warn("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı."));
    }

    const eco = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    const marketHoldings = await MarketItem.find({ guildId: message.guild.id, userId: targetUser.id, amount: { $gt: 0 } });

    const guildConf = await GuildConfig.findOne({ guildId: message.guild.id });
    const goldPrice = guildConf?.economyMarket?.goldPrice || 2500;
    const btcPrice = guildConf?.economyMarket?.btcPrice || 65000;

    const items = eco?.inventory || [];
    const roleItems = items.filter(i => i.type === "ROLE");
    const themeItems = items.filter(i => i.type === "THEME");
    const achievementItems = items.filter(i => i.type === "ACHIEVEMENT");

    const roleRows = roleItems.length > 0
      ? roleItems.map((i) => `  • **${i.name}** (\`${i.itemId}\`)`).join("\n")
      : "  • Henüz satın alınmış rol bulunmuyor.";

    const userOwnedThemes = ["sakura", ...themeItems.map(i => i.itemId.replace(/^tema_/, ""))];
    const uniqueThemes = [...new Set(userOwnedThemes)];

    const themeRows = uniqueThemes.map(tId => {
      const t = VisualCard.getTheme(tId);
      const isDefault = tId === "sakura" ? " (Varsayılan)" : "";
      return `  • **${t.name}** (\`.tema ${tId}\`)${isDefault}`;
    }).join("\n");

    const themeSets = VisualCard.getThemeSetsList();
    const setProgressRows = themeSets.map(s => {
      const ownedCount = s.themes.filter(tKey => uniqueThemes.includes(tKey)).length;
      const isComplete = ownedCount === s.themes.length;
      const progressBoxes = "■".repeat(ownedCount) + "□".repeat(s.themes.length - ownedCount);
      const statusBadge = isComplete ? `✅ Tamamlandı (${s.badge})` : `[${progressBoxes}] ${ownedCount}/${s.themes.length}`;
      const missing = isComplete ? "" : ` - Eksik: ${s.themes.filter(tKey => !uniqueThemes.includes(tKey)).map(tKey => `\`tema_${tKey}\``).join(", ")}`;
      return `  • **${s.name}:** ${statusBadge}${missing}`;
    }).join("\n");

    const holdingRows = marketHoldings.length > 0
      ? marketHoldings.map((h) => {
          const currentPrice = h.itemKey === "altin" ? goldPrice : btcPrice;
          const totalVal = Math.round(h.amount * currentPrice);
          return `  • **${h.itemName}:** \`${h.amount.toFixed(4)}\` adet (Değer: **${totalVal.toLocaleString("tr-TR")} Coin**)`;
        }).join("\n")
      : "  • Borsada aktif emtia/varlık bulunmuyor.";

    const toolItems = items.filter(i => ["TOOL", "DEFENSE", "BOOST", "CONSUMABLE", "TICKET", "CHEST"].includes(i.type) || i.itemId?.startsWith("item_"));
    const toolCounts = {};
    for (const t of toolItems) {
      const key = t.name || t.itemId;
      toolCounts[key] = (toolCounts[key] || 0) + 1;
    }
    const toolRows = Object.keys(toolCounts).length > 0
      ? Object.entries(toolCounts).map(([name, count]) => `  • **${name}:** \`${count} Adet\``).join("\n")
      : "  • Henüz macera veya güç eşyası bulunmuyor. (.itemmarket)";

    const content = [
      `### 🎒 Kullanıcı Envanteri & Koleksiyon Portföyü: ${targetUser.username}`,
      `▫️ **Cüzdan:** \`${(eco?.wallet || 0).toLocaleString("tr-TR")}\` Coin`,
      `▫️ **Banka:** \`${(eco?.bank || 0).toLocaleString("tr-TR")}\` Coin`,
      "",
      `⚔️ **Alet ve Güç Eşyaları (${toolItems.length}):**`,
      toolRows,
      "",
      `🎭 **Satın Alınan Roller (${roleItems.length}):**`,
      roleRows,
      "",
      `🎨 **Sahip Olunan Anime Kart Temaları (${uniqueThemes.length}):**`,
      themeRows,
      "",
      `📦 **Paket Koleksiyonu İlerleme Durumu:**`,
      setProgressRows,
      "",
      `📈 **Borsa Portföyü:**`,
      holdingRows,
      "",
      `-# Eşyalar için \`.itemmarket\` ve \`.satınal\`, kart temaları için \`.tema\` komutlarını kullanabilirsiniz.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

