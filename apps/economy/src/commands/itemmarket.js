import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { getItemsForGuild } from "../services/ItemMarketCatalog.js";

export default {
  name: "itemmarket",
  aliases: ["esyamarket", "eşyamarket", "itemler", "itemshop", "marketitem"],
  async execute({ message, config }) {
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const activeItems = getItemsForGuild(config);
    const inventoryKeys = new Set((eco.inventory || []).map((i) => i.itemId));

    const categoryNames = {
      TOOL: "🛠️ Avcılık ve Madencilik Aletleri",
      DEFENSE: "🛡️ Savunma ve Güvenlik Donanımı",
      BOOST: "✨ Şans ve Soygun Ekipmanları",
      CONSUMABLE: "🧪 Tüketilebilir Sihirli İksirler",
      TICKET: "🎫 Büyük Çekiliş Biletleri",
      CHEST: "🎁 Gizemli Şans Sandıkları",
      COMMODITY: "💎 Yatırım ve Değerli Madenler",
      ROLE: "👑 Prestij ve VIP Ayrıcalıkları"
    };

    const grouped = {};
    for (const item of activeItems) {
      const cat = item.type || "OTHER";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }

    const sections = [];
    for (const [catKey, items] of Object.entries(grouped)) {
      const catTitle = categoryNames[catKey] || "Diğer Eşyalar";
      const itemBlocks = items.map((item) => {
        const isOwned = inventoryKeys.has(item.itemKey);
        const statusBadge = isOwned ? "✅ *(Envanterde Mevcut)*" : `💰 **${item.price.toLocaleString("tr-TR")} Coin**`;
        return `▫️ ${item.emoji} **${item.name}** : ${statusBadge}\n  *${item.description}*\n  Kod: \`.satınal ${item.itemKey}\``;
      }).join("\n\n");

      sections.push(`### ${catTitle}\n${itemBlocks}`);
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`eco_itemmarket_buy:${message.author.id}`)
      .setPlaceholder("🛒 Hızlı Satın Almak İçin Bir Eşya Seçin")
      .addOptions(
        activeItems.map((item) => ({
          label: `${item.name} (${item.price.toLocaleString("tr-TR")} Coin)`,
          description: item.description.slice(0, 100),
          value: item.itemKey,
          emoji: item.emoji
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const header = [
      `# 🎒 Macera ve Güç Eşyaları Pazarı`,
      `Sunucudaki balıkçılık, madencilik, kumarhane, sandık ve koruma eşyalarını buradan satın alabilirsiniz.`,
      `▫️ **Mevcut Cüzdan Bakiyeniz:** **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin**`,
      "",
      sections.join("\n\n"),
      "",
      `-# 💡 Aşağıdaki menüden seçerek tek tıkla hızlı satın alabilirsiniz. Satmak için: \`.esya-sat <kod>\`, Hediye için: \`.esya-ver @kullanici <kod>\``
    ].join("\n");

    const payload = MessageFormatter.v2(header, [row]);
    return message.reply(payload);
  }
};
