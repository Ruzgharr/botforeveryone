import { ShopItem, Economy, Stat } from "@bot/database";
import { MessageFormatter, VisualCard } from "@bot/core";
import { getItemByKey } from "../services/ItemMarketCatalog.js";

export default {
  name: "satınal",
  aliases: ["satinal", "buy"],
  async execute({ client, message, args, config }) {
    let itemKey = (args[0] || "").toLowerCase().trim();
    if (!itemKey) {
      return message.reply(MessageFormatter.warn(
        "Eksik Bilgi",
        `Lütfen satın almak istediğiniz ürün kodunu belirtin.\n\n▫️ Örnek: \`${config.prefix || "."}satınal <ürün_kodu>\``
      ));
    }

    let item = await ShopItem.findOne({ guildId: message.guild.id, itemKey, active: true });
    if (!item && !itemKey.startsWith("tema_")) {
      item = await ShopItem.findOne({ guildId: message.guild.id, itemKey: `tema_${itemKey}`, active: true });
    }

    if (!item) {
      const marketItem = getItemByKey(itemKey, config);
      if (marketItem) {
        if (marketItem.disabled) {
          return message.reply(MessageFormatter.warn(
            "Satışa Kapalı",
            `\`${marketItem.name}\` ürünü sunucu yönetimi tarafından geçici olarak satışa kapatılmıştır.`
          ));
        }
        item = {
          itemKey: marketItem.itemKey,
          name: marketItem.name,
          price: marketItem.price,
          type: marketItem.type,
          description: marketItem.description
        };
      }
    }

    if (!item) {
      return message.reply(MessageFormatter.error(
        "Ürün Bulunamadı",
        `\`${itemKey}\` kodlu bir ürün mağazada bulunamadı.`
      ));
    }

    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco || (eco.wallet || 0) < item.price) {
      return message.reply(MessageFormatter.error(
        "Yetersiz Bakiye",
        `Bu ürünü alabilmek için cüzdanınızda en az **${item.price.toLocaleString("tr-TR")} Coin** bulunmalıdır.`
      ));
    }

    const alreadyHas = (eco.inventory || []).some((i) => i.itemId === item.itemKey);
    if (alreadyHas && item.type !== "CONSUMABLE" && item.type !== "TICKET") {
      return message.reply(MessageFormatter.warn(
        "Zaten Sahipsiniz",
        `Bu ürün zaten envanterinizde mevcut.`
      ));
    }

    await Economy.updateOne(
      { _id: eco._id },
      {
        $inc: { wallet: -item.price },
        $push: {
          inventory: {
            itemId: item.itemKey,
            name: item.name,
            type: item.type,
            roleId: item.roleId || "",
            purchasedAt: new Date()
          }
        }
      }
    );

    let roleGrantedText = "";
    if (item.type === "ROLE") {
      const targetRoleId = item.roleId || (item.itemKey === "vip" ? config.roles?.vip : null);
      if (targetRoleId) {
        await message.member.roles.add(targetRoleId).catch(() => null);
        roleGrantedText = `\n▫️ Rol Teslim Edildi: <@&${targetRoleId}>`;
      }
    }

    let themeText = "";
    if (item.type === "THEME") {
      const rawThemeId = item.itemKey.replace(/^tema_/, "");
      await Stat.findOneAndUpdate(
        { guildId: message.guild.id, userId: message.author.id },
        { $set: { cardTheme: rawThemeId } },
        { upsert: true }
      );
      themeText = `\n▫️ Aktif Kart Temanız **${rawThemeId.toUpperCase()}** olarak ayarlandı!`;

      const allPurchased = (eco.inventory || []).map(i => i.itemId.replace(/^tema_/, ""));
      allPurchased.push(rawThemeId);
      allPurchased.push("sakura");

      const themeSets = VisualCard.getThemeSetsList();
      for (const s of themeSets) {
        const hasAll = s.themes.every(tId => allPurchased.includes(tId));
        const wasCompletedBefore = (eco.inventory || []).some(i => i.itemId === `set_reward_${s.id}`);
        if (hasAll && !wasCompletedBefore) {
          await Economy.updateOne(
            { _id: eco._id },
            {
              $inc: { wallet: s.rewardBonus },
              $push: {
                inventory: {
                  itemId: `set_reward_${s.id}`,
                  name: `${s.name} Başarımı`,
                  type: "ACHIEVEMENT",
                  purchasedAt: new Date()
                }
              }
            }
          );
          themeText += `\n▫️ 🏆 **Koleksiyon Paketi Tamamlandı:** **${s.name}** (+${s.rewardBonus.toLocaleString("tr-TR")} Coin Bonus Eklendi!)`;
        }
      }
    }

    return message.reply(MessageFormatter.success(
      "Satın Alma Başarılı!",
      `▫️ Satın Alınan: **${item.name}**\n▫️ Ödenen Miktar: **${item.price.toLocaleString("tr-TR")} Coin**\n▫️ Kalan Cüzdan: **${((eco.wallet || 0) - item.price).toLocaleString("tr-TR")} Coin**${roleGrantedText}${themeText}`
    ));
  }
};

