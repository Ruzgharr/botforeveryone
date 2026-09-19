export const MARKET_ITEMS = [
  {
    itemKey: "item_olta",
    name: "Titanyum Olta",
    emoji: "🎣",
    description: "Balıkçılıkta 3 kat daha fazla ve efsanevi balık tutma şansı sağlar.",
    price: 2500,
    category: "ALET",
    type: "TOOL"
  },
  {
    itemKey: "item_kazma",
    name: "Elmas Madenci Kazması",
    emoji: "⛏️",
    description: "Madencilikte çökme riskini sıfırlar, yakut ve elmas çıkarma şansı verir.",
    price: 3500,
    category: "ALET",
    type: "TOOL"
  },
  {
    itemKey: "item_kalkan",
    name: "Çelik Güvenlik Kalkanı",
    emoji: "🛡️",
    description: "Soygun girişimlerinde cüzdanınızı %100 korur ve hırsızı püskürtür.",
    price: 5000,
    category: "SAVUNMA",
    type: "DEFENSE"
  },
  {
    itemKey: "item_sigorta",
    name: "Kraliyet Hırsızlık Sigortası",
    emoji: "📜",
    description: "Soygun girişimlerine karşı paranızı tam korur, soyguncuya tazminat ödetir.",
    price: 6000,
    category: "SAVUNMA",
    type: "DEFENSE"
  },
  {
    itemKey: "item_sans",
    name: "Şanslı Yonca Nalı",
    emoji: "🍀",
    description: "Kumarhane oyunlarında (blackjack, rulet, slot) kazanma oranını %15 artırır.",
    price: 4000,
    category: "GÜÇ",
    type: "BOOST"
  },
  {
    itemKey: "item_maymuncuk",
    name: "Usta Hırsız Maymuncuğu",
    emoji: "🗝️",
    description: "Soygun başarı oranını %75'e çıkarır ve çalınan parayı %40'a yükseltir.",
    price: 3500,
    category: "GÜÇ",
    type: "BOOST"
  },
  {
    itemKey: "item_x2xp",
    name: "Çift XP Parşömeni",
    emoji: "🔮",
    description: "Kullanıldığında 1 saat boyunca mesaj ve ses kanallarında 2 kat XP kazandırır.",
    price: 4500,
    category: "GÜÇ",
    type: "BOOST"
  },
  {
    itemKey: "item_enerji",
    name: "Mega Enerji İksiri",
    emoji: "⚡",
    description: "Bekleme sürelerini sıfırlar, anında tekrar çalışmanızı sağlar.",
    price: 1500,
    category: "İKSİR",
    type: "CONSUMABLE"
  },
  {
    itemKey: "item_xppot",
    name: "Kadim XP İksiri",
    emoji: "🧪",
    description: "İçildiğinde hesabınıza anında +1.500 Seviye Deneyimi (XP) ekler.",
    price: 3000,
    category: "İKSİR",
    type: "CONSUMABLE"
  },
  {
    itemKey: "item_piyango",
    name: "Altın Piyango Bileti",
    emoji: "🎫",
    description: "Haftalık büyük çekilişe 5 kat ikramiye hakkıyla doğrudan katılım sağlar.",
    price: 1000,
    category: "BİLET",
    type: "TICKET"
  },
  {
    itemKey: "item_kutu",
    name: "Gizemli Şans Sandığı",
    emoji: "🎁",
    description: "Açıldığında içinden 15.000 Coin'e varan para, aletler veya nadir temalar çıkar.",
    price: 2000,
    category: "SANDIK",
    type: "CHEST"
  },
  {
    itemKey: "item_mucehver",
    name: "Safir Ejderha Mücevheri",
    emoji: "💎",
    description: "Büyük zenginlik göstergesi olan nadir yatırım emtiası, tüccarlara satılabilir.",
    price: 12000,
    category: "YATIRIM",
    type: "COMMODITY"
  },
  {
    itemKey: "item_vippass",
    name: "VIP Kulüp Pasaportu",
    emoji: "👑",
    description: "Sunucuda doğrudan VIP rolü ve günlük maaşlara kalıcı %50 ek bonus sağlar.",
    price: 15000,
    category: "PREMIUM",
    type: "ROLE"
  },
  {
    itemKey: "tema_sakura_video",
    name: "Sakura Canlı Video Teması",
    emoji: "🌸",
    description: "Uçuşan pembe kiraz yaprakları ve bahar rüzgarı efektli otomatik oynayan canlı profil ve stat kartı paketi.",
    price: 8000,
    category: "TEMA",
    type: "THEME"
  }
];

export function getCustomPrice(itemKey, basePrice, guildConfig) {
  if (!guildConfig) return basePrice;
  let custom = null;
  const cleanKey = String(itemKey).toLowerCase().trim();
  const prices = guildConfig.itemPrices;
  if (prices) {
    if (typeof prices.get === "function") {
      custom = prices.get(cleanKey) || prices.get(`item_${cleanKey}`);
    } else if (typeof prices === "object") {
      custom = prices[cleanKey] || prices[`item_${cleanKey}`];
    }
  }

  let finalPrice = (custom !== null && custom !== undefined && !isNaN(Number(custom))) ? Number(custom) : basePrice;
  const discount = Number(guildConfig.economyMarket?.discountPercent || 0);
  if (discount > 0 && discount < 100) {
    finalPrice = Math.max(1, Math.round(finalPrice * ((100 - discount) / 100)));
  }
  return finalPrice;
}

export function isItemDisabled(itemKey, guildConfig) {
  if (!guildConfig || !Array.isArray(guildConfig.disabledItems)) return false;
  const cleanKey = String(itemKey).toLowerCase().trim();
  return guildConfig.disabledItems.includes(cleanKey) || guildConfig.disabledItems.includes(`item_${cleanKey}`);
}

export function getItemByKey(key, guildConfig = null) {
  const cleanKey = String(key).toLowerCase().trim();
  const item = MARKET_ITEMS.find((i) => i.itemKey === cleanKey || i.itemKey === `item_${cleanKey}`);
  if (!item) return undefined;

  const price = getCustomPrice(item.itemKey, item.price, guildConfig);
  const disabled = isItemDisabled(item.itemKey, guildConfig);
  return { ...item, price, disabled };
}

export function getItemsForGuild(guildConfig = null, includeDisabled = false) {
  return MARKET_ITEMS.map((item) => {
    const price = getCustomPrice(item.itemKey, item.price, guildConfig);
    const disabled = isItemDisabled(item.itemKey, guildConfig);
    return { ...item, price, disabled };
  }).filter((item) => includeDisabled || !item.disabled);
}
