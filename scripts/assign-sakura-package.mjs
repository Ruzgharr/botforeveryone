import { connectDatabase, Stat, Economy } from "@bot/database";
import { getActiveDatabaseUri } from "@bot/config";

await connectDatabase(getActiveDatabaseUri());

const userId = "1261311189577896027";
const guildId = "1546253954248085647";

const stat = await Stat.findOneAndUpdate(
  { guildId, userId },
  { $set: { cardTheme: "sakura" } },
  { upsert: true, new: true }
);

let eco = await Economy.findOne({ guildId, userId });
if (!eco) {
  eco = await Economy.create({ guildId, userId, wallet: 100, bank: 0 });
}

const existingInv = eco.inventory || [];

const newItems = [
  { itemId: "tema_sakura", name: "Sakura Teması 🌸", type: "THEME", purchasedAt: new Date() },
  { itemId: "tema_torii-gate", name: "Torii Gate Teması ⛩️", type: "THEME", purchasedAt: new Date() },
  { itemId: "tema_winter-shrine", name: "Winter Shrine Teması ❄️", type: "THEME", purchasedAt: new Date() },
  { itemId: "set_japan", name: "Geleneksel Japonya Koleksiyonu (🌸 Sakura Paketi)", type: "THEME_SET", purchasedAt: new Date() },
  { itemId: "set_reward_japan", name: "Geleneksel Japonya Koleksiyonu Başarımı (🌸 Nihonjin)", type: "ACHIEVEMENT", purchasedAt: new Date() }
];

for (const item of newItems) {
  if (!existingInv.some(i => i.itemId === item.itemId)) {
    existingInv.push(item);
  }
}

await Economy.updateOne(
  { _id: eco._id },
  {
    $set: { inventory: existingInv },
    $inc: { wallet: 2000 }
  }
);

const updatedEco = await Economy.findOne({ _id: eco._id });

console.log("SAKURA_PAKETI_BASARIYLA_TANIMLANDI");
console.log("AKTIF_TEMA:", stat.cardTheme);
console.log("CÜZDAN_BAKİYESİ:", updatedEco.wallet);
console.log("ENVANTER:", updatedEco.inventory.map(i => i.itemId).join(", "));
process.exit(0);
