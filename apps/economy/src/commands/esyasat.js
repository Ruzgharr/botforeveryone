import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { getItemByKey } from "../services/ItemMarketCatalog.js";

export default {
  name: "esyasat",
  aliases: ["eşyasat", "itemsell", "sellitem", "esya-sat", "eşya-sat"],
  async execute({ client, message, args, config }) {
    const rawKey = (args[0] || "").toLowerCase().trim();
    if (!rawKey) {
      return message.reply(MessageFormatter.warn(
        "Eksik Parametre",
        "Lütfen satmak istediğiniz eşyanın kodunu belirtin.\n\n▫️ Örnek: `.esya-sat item_olta` veya `.esya-sat olta`"
      ));
    }

    const itemKey = rawKey.startsWith("item_") ? rawKey : `item_${rawKey}`;
    const marketItem = getItemByKey(itemKey, config);
    if (!marketItem) {
      return message.reply(MessageFormatter.error("Geçersiz Eşya", "Belirtilen kodda bir pazar eşyası bulunamadı."));
    }

    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco || !Array.isArray(eco.inventory) || eco.inventory.length === 0) {
      return message.reply(MessageFormatter.warn("Boş Envanter", "Envanterinizde satılabilecek herhangi bir eşya bulunmuyor."));
    }

    const itemIndex = eco.inventory.findIndex((i) => i.itemId === itemKey);
    if (itemIndex === -1) {
      return message.reply(MessageFormatter.warn(
        "Eşya Yok",
        `Envanterinizde **${marketItem.name}** bulunamadı.`
      ));
    }

    const refundPrice = Math.max(1, Math.floor(marketItem.price * 0.70));

    eco.inventory.splice(itemIndex, 1);
    eco.markModified("inventory");
    eco.wallet = (eco.wallet || 0) + refundPrice;
    await eco.save();

    return message.reply(MessageFormatter.v2(
      `💸 **Eşya Satışı Başarılı**\n\n▫️ **Satılan Eşya:** ${marketItem.emoji} **${marketItem.name}**\n▫️ **Geri Alım Oranı:** %70 Piyasa Değeri\n▫️ **Kazanılan Para:** \`+${refundPrice.toLocaleString("tr-TR")} Coin\`\n▫️ **Güncel Cüzdan:** **${eco.wallet.toLocaleString("tr-TR")} Coin**\n-# 🏪 İkinci El Pazar Masası : Eşya pazara devredildi`
    ));
  }
};
