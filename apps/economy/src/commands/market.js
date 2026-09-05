import { ShopItem } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "market",
  aliases: ["mağaza", "magaza", "shop"],
  async execute({ client, message, args, config }) {
    let items = await ShopItem.find({ guildId: message.guild.id, active: true });

    if (items.length === 0) {
      const defaultItems = [
        {
          guildId: message.guild.id,
          itemKey: "vip",
          name: "VIP Üyelik Rolü",
          description: "Sunucu özel VIP rolü ve ayrıcalıkları",
          price: 5000,
          type: "ROLE",
          roleId: config.roles?.vip || ""
        },
        {
          guildId: message.guild.id,
          itemKey: "renk_kirmizi",
          name: "Özel Kırmızı İsim Rengi",
          description: "Sohbette parlayan kırmızı isim rengi",
          price: 1500,
          type: "ROLE",
          roleId: ""
        },
        {
          guildId: message.guild.id,
          itemKey: "renk_mavi",
          name: "Özel Mavi İsim Rengi",
          description: "Sohbette parlayan mavi isim rengi",
          price: 1500,
          type: "ROLE",
          roleId: ""
        }
      ];

      for (const itm of defaultItems) {
        await ShopItem.create(itm).catch(() => null);
      }
      items = await ShopItem.find({ guildId: message.guild.id, active: true });
    }

    const itemRows = items.map((itm) => {
      return `• **${itm.name}** (\`${itm.itemKey}\`)\n  └ Fiyat: **${itm.price} Coin** | Tür: \`${itm.type}\`\n  └ *${itm.description || "Açıklama yok"}*`;
    }).join("\n\n");

    const description = [
      "Sunucu mağazasında coinlerinizle satın alabileceğiniz roller ve ürünler:",
      "",
      itemRows,
      "",
      `Satın almak için: \`${config.prefix || "."}satınal <ürün_kodu>\``
    ].join("\n");

    message.reply({
      embeds: [Embeds.info("🏪 Sunucu Mağazası", description, message.guild)]
    });
  }
};
