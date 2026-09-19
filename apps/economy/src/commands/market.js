import { ShopItem } from "@bot/database";
import { MessageFormatter, VisualCard } from "@bot/core";

export default {
  name: "market",
  aliases: ["mağaza", "magaza", "shop"],
  async execute({ client, message, args, config }) {
    let items = await ShopItem.find({ guildId: message.guild.id, active: true });

    const themesList = VisualCard.getThemesList().filter(t => t.price > 0);
    for (const t of themesList) {
      const exists = items.some(i => i.itemKey === `tema_${t.id}`);
      if (!exists) {
        await ShopItem.create({
          guildId: message.guild.id,
          itemKey: `tema_${t.id}`,
          name: `${t.name} Kart Teması`,
          description: `${t.desc} : Özel Anime Arka Plan Görseli`,
          price: t.price,
          type: "THEME",
          roleId: ""
        }).catch(() => null);
      }
    }

    if (!items.some(i => i.type === "ROLE")) {
      const defaultRoles = [
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

      for (const itm of defaultRoles) {
        await ShopItem.create(itm).catch(() => null);
      }
    }

    items = await ShopItem.find({ guildId: message.guild.id, active: true });

    const roleItems = items.filter(i => i.type === "ROLE");
    const themeItems = items.filter(i => i.type === "THEME");
    const themeSets = VisualCard.getThemeSetsList();

    const roleRows = roleItems.map(itm => {
      return `▫️ **${itm.name}** (\`${itm.itemKey}\`)\n  • Fiyat: **${itm.price.toLocaleString("tr-TR")} Coin**\n  • *${itm.description || "Açıklama yok"}*`;
    }).join("\n\n") || "Mevcut rol ürünü yok.";

    const themeRows = themeItems.map(itm => {
      return `▫️ **${itm.name}** (\`${itm.itemKey}\`)\n  • Fiyat: **${itm.price.toLocaleString("tr-TR")} Coin** | Kod: \`.satınal ${itm.itemKey}\``;
    }).join("\n");

    const setRows = themeSets.map(s => {
      const themeTags = s.themes.map(tKey => `\`tema_${tKey}\``).join(", ");
      return `▫️ **${s.name}** (${s.badge})\n  • Gereken Parçalar: ${themeTags}\n  • Tamamlama Bonusu: **+${s.rewardBonus.toLocaleString("tr-TR")} Coin**`;
    }).join("\n\n");

    const content = [
      `### 🏪 Sunucu Mağazası & Koleksiyon Merkezi`,
      `Coinlerinizle rol ve anime kart temalarını tek tek satın alabilirsiniz. Parçaları toplayarak paket koleksiyonlarını tamamlayın!`,
      "",
      `🎭 **Roller ve Ayrıcalıklar:**`,
      roleRows,
      "",
      `🎨 **Anime Kart Temaları (Tekil Satış - 15 Farklı Tema):**`,
      themeRows,
      "",
      `📦 **Paket Koleksiyonu Rehberi (Parçaları Tek Tek Toplayın):**`,
      setRows,
      "",
      `▫️ Satın almak için: \`${config.prefix || "."}satınal <ürün_kodu>\` (Örn: \`.satınal tema_sunset\`)`,
      `▫️ Sahip olduğunuz temaları seçmek için: \`.tema <tema-adı>\``,
      "",
      `-# Satın aldığınız ürünler ve temalar anında envanterinize tanımlanır.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

