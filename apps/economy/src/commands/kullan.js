import { Economy, Stat } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "kullan",
  aliases: ["use", "enerji", "iksir", "potion", "sandik-ac", "sandikac", "kutu-ac", "kutuac"],
  async execute({ client, message, args, config }) {
    const rawKey = (args[0] || "item_enerji").toLowerCase().trim();
    const itemKey = rawKey.startsWith("item_") ? rawKey : `item_${rawKey}`;

    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      return message.reply(MessageFormatter.error("Hesap Bulunamadı", "Ekonomi hesabınız bulunmuyor."));
    }

    const inventory = eco.inventory || [];
    const itemIndex = inventory.findIndex((i) => i.itemId === itemKey);

    if (itemIndex === -1) {
      return message.reply(MessageFormatter.warn(
        "Eşya Bulunamadı",
        `Envanterinizde kullanılabilir bir \`${itemKey}\` bulunamadı.\n▫️ Satın almak için: \`.itemmarket\` veya \`.satınal ${itemKey}\``
      ));
    }

    if (itemKey === "item_enerji") {
      eco.inventory.splice(itemIndex, 1);
      eco.markModified("inventory");

      eco.lastWork = null;
      eco.lastBalik = null;
      eco.lastMaden = null;
      await eco.save();

      return message.reply(MessageFormatter.v2(
        `⚡ **Mega Enerji İksiri Tüketildi!**\n\n▫️ **Kullanıcı:** <@${message.author.id}>\n▫️ **Etki:** Çalışma, Maden ve Balık avı bekleme süreleriniz tamamen sıfırlandı!\n▫️ Artık hemen tekrar \`.calis\`, \`.maden\` ve \`.balik\` yapabilirsiniz!`
      ));
    }

    if (itemKey === "item_xppot") {
      eco.inventory.splice(itemIndex, 1);
      eco.markModified("inventory");
      await eco.save();

      const gainedXp = 1500;
      let stat = await Stat.findOne({ guildId: message.guild.id, userId: message.author.id });
      if (!stat) {
        stat = await Stat.create({ guildId: message.guild.id, userId: message.author.id });
      }
      stat.xp = (stat.xp || 0) + gainedXp;
      const requiredXp = (stat.level || 1) * (stat.level || 1) * 100;
      let levelUpNote = "";
      if (stat.xp >= requiredXp) {
        stat.level = (stat.level || 1) + 1;
        levelUpNote = `\n🎉 **Tebrikler!** Yeni seviyeye ulaştınız: **Seviye ${stat.level}**!`;
      }
      await stat.save();

      return message.reply(MessageFormatter.v2(
        `🧪 **Kadim XP İksiri İçildi!**\n\n▫️ **Kullanıcı:** <@${message.author.id}>\n▫️ **Kazanılan:** \`+${gainedXp.toLocaleString("tr-TR")} XP\`\n▫️ **Güncel XP:** \`${stat.xp.toLocaleString("tr-TR")} XP\`${levelUpNote}\n-# ⚡ Kadim Bilgelik : Seviye ilerlemeniz hızlandırıldı`
      ));
    }

    if (itemKey === "item_sakura_video" || itemKey === "tema_sakura_video" || itemKey === "item_tema_sakura_video") {
      let stat = await Stat.findOne({ guildId: message.guild.id, userId: message.author.id });
      if (!stat) {
        stat = await Stat.create({ guildId: message.guild.id, userId: message.author.id });
      }
      stat.cardTheme = "sakura";
      stat.cardAnimated = true;
      stat.cardFormat = "gif";
      await stat.save();

      return message.reply(MessageFormatter.v2(
        `🌸 **Sakura Canlı Video Teması Aktifleştirildi!**\n\n▫️ **Kullanıcı:** <@${message.author.id}>\n▫️ **Tema:** \`SAKURA (Canlı Animasyonlu Video/GIF)\`\n▫️ **Kart Durumu:** Otomatik Canlı Hareketli Video Modu Açık\n-# Artık \`.profil\` ve \`.stat\` komutlarınız otomatik olarak canlı kiraz yaprakları ve rüzgar efektiyle gönderilecektir.`
      ));
    }

    if (itemKey === "item_kutu") {
      eco.inventory.splice(itemIndex, 1);

      const roll = Math.random();
      let rewardTitle = "";
      let rewardDetail = "";

      if (roll < 0.04) {
        const jackpot = 15000;
        eco.wallet = (eco.wallet || 0) + jackpot;
        rewardTitle = "🌟 EFSANEVİ BÜYÜK İKRAMİYE!";
        rewardDetail = `▫️ Sandıktan akıl almaz bir zenginlik çıktı!\n▫️ **Kazanılan:** \`+${jackpot.toLocaleString("tr-TR")} Coin\``;
      } else if (roll < 0.15) {
        eco.inventory.push({ itemId: "item_kalkan", name: "Çelik Güvenlik Kalkanı", type: "DEFENSE", purchasedAt: new Date() });
        rewardTitle = "🛡️ EPİK SAVUNMA EŞYASI!";
        rewardDetail = "▫️ Sandıktan parıldayan bir **Çelik Güvenlik Kalkanı** çıktı ve envanterinize eklendi!";
      } else if (roll < 0.30) {
        const toolItem = Math.random() < 0.5
          ? { itemId: "item_olta", name: "Titanyum Olta", type: "TOOL" }
          : { itemId: "item_kazma", name: "Elmas Madenci Kazması", type: "TOOL" };
        eco.inventory.push({ ...toolItem, purchasedAt: new Date() });
        rewardTitle = "⚒️ DEĞERLİ MADENCİ/BALIKÇI ALETİ!";
        rewardDetail = `▫️ Sandıktan nadide **${toolItem.name}** çıktı ve envanterinize eklendi!`;
      } else if (roll < 0.55) {
        eco.inventory.push({ itemId: "item_enerji", name: "Mega Enerji İksiri", type: "CONSUMABLE", purchasedAt: new Date() });
        rewardTitle = "⚡ ENERJİ İKSİRİ!";
        rewardDetail = "▫️ Sandıktan 1 Adet **Mega Enerji İksiri** çıktı!";
      } else {
        const coins = Math.floor(1000 + Math.random() * 3000);
        eco.wallet = (eco.wallet || 0) + coins;
        rewardTitle = "💰 PARLAK COIN KESESİ!";
        rewardDetail = `▫️ Sandıktan altın dolu bir kese çıktı!\n▫️ **Kazanılan:** \`+${coins.toLocaleString("tr-TR")} Coin\``;
      }

      eco.markModified("inventory");
      await eco.save();

      return message.reply(MessageFormatter.v2(
        `🎁 **Gizemli Şans Sandığı Açıldı!**\n\n### ${rewardTitle}\n${rewardDetail}\n▫️ **Güncel Cüzdan:** **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin**\n-# 🎲 Şans Sandığı : Sandık başarıyla açıldı`
      ));
    }

    if (itemKey === "item_x2xp") {
      eco.inventory.splice(itemIndex, 1);
      eco.markModified("inventory");
      await eco.save();

      let stat = await Stat.findOne({ guildId: message.guild.id, userId: message.author.id });
      if (!stat) {
        stat = await Stat.create({ guildId: message.guild.id, userId: message.author.id });
      }
      const gainedXp = 3500;
      stat.xp = (stat.xp || 0) + gainedXp;
      const requiredXp = (stat.level || 1) * (stat.level || 1) * 100;
      let levelUpNote = "";
      if (stat.xp >= requiredXp) {
        stat.level = (stat.level || 1) + 1;
        levelUpNote = `\n🎉 **Tebrikler!** Seviye atladınız: **Seviye ${stat.level}**!`;
      }
      await stat.save();

      return message.reply(MessageFormatter.v2(
        `🔮 **Çift XP Parşömeni Etkinleştirildi!**\n\n▫️ **Kullanıcı:** <@${message.author.id}>\n▫️ **Kazanılan Ek XP:** \`+${gainedXp.toLocaleString("tr-TR")} XP\`\n▫️ **Güncel XP:** \`${stat.xp.toLocaleString("tr-TR")} XP\`${levelUpNote}\n-# ⚡ Çift XP Güçlendirici : Deneyim puanlarınız katlandı!`
      ));
    }

    if (itemKey === "item_mucehver") {
      eco.inventory.splice(itemIndex, 1);
      const sellPrice = 16000;
      eco.wallet = (eco.wallet || 0) + sellPrice;
      eco.markModified("inventory");
      await eco.save();

      return message.reply(MessageFormatter.v2(
        `💎 **Safir Ejderha Mücevheri Tüccara Satıldı!**\n\n▫️ **Kullanıcı:** <@${message.author.id}>\n▫️ **Elde Edilen Gelir:** \`+${sellPrice.toLocaleString("tr-TR")} Coin\`\n▫️ **Yeni Cüzdan Bakiyesi:** **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin**\n-# 💰 Yatırım & Emtia : Başarılı karlı satış yapıldı!`
      ));
    }

    if (itemKey === "item_sigorta") {
      return message.reply(MessageFormatter.v2(
        `📜 **Kraliyet Hırsızlık Sigortası Zaten Aktif!**\n\n▫️ **Durum:** Envanterinizde bulunduğu sürece soygun girişimlerine karşı paranızı otomatik olarak %100 sigortalar ve hırsızı püskürtür.`
      ));
    }

    if (itemKey === "item_piyango") {
      return message.reply(MessageFormatter.warn(
        "Doğrudan Çekiliş",
        "Altın Piyango Biletinizi kullanmak için doğrudan `.piyango` komutunu çalıştırmanız yeterlidir. Çekilişte otomatik olarak 5 kat çarpanla kullanılacaktır."
      ));
    }

    return message.reply(MessageFormatter.warn(
      "Kullanılamaz Eşya",
      "Bu eşya pasif bir ekipmandır ve envanterinizde bulunduğu sürece otomatik olarak etki gösterir."
    ));
  }
};
