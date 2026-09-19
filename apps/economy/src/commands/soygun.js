import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "soygun",
  aliases: ["soy", "cal"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser || targetUser.bot || targetUser.id === message.author.id) {
      return message.reply(MessageFormatter.warn("Geçersiz Hedef", "Lütfen soymak istediğiniz geçerli bir kullanıcıyı etiketleyin."));
    }

    const robberEco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!robberEco || (robberEco.wallet || 0) < 200) {
      return message.reply(MessageFormatter.error("Yetersiz Bakiye", "Soygun girişiminde bulunabilmek için cüzdanınızda en az 200 Coin olmalıdır."));
    }

    const targetEco = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!targetEco || (targetEco.wallet || 0) < 200) {
      return message.reply(MessageFormatter.warn("Fakir Hedef", "Hedef kullanıcının cüzdanında soyulmaya değer para bulunmuyor."));
    }

    const hasShield = (targetEco.inventory || []).some((i) => i.itemId === "item_kalkan");
    const hasInsurance = (targetEco.inventory || []).some((i) => i.itemId === "item_sigorta");
    if (hasShield || hasInsurance) {
      const shieldFine = hasInsurance ? 600 : 300;
      const itemName = hasInsurance ? "Kraliyet Hırsızlık Sigortası" : "Çelik Güvenlik Kalkanı";
      await Economy.updateOne({ _id: robberEco._id }, { $inc: { wallet: -shieldFine } });
      await Economy.updateOne({ _id: targetEco._id }, { $inc: { wallet: shieldFine } });

      return message.reply(MessageFormatter.error(
        `🛡️ ${itemName} Engeli!`,
        `▫️ ${targetUser} kullanıcısının **${itemName}** soygun girişimini püskürttü!\n▫️ Güvenlik sistemleri devreye girdi ve hırsıza kesilen **${shieldFine} Coin** ceza doğrudan hedefin cüzdanına aktarıldı.\n▫️ Kalan Cüzdanınız: **${Math.max(0, (robberEco.wallet || 0) - shieldFine).toLocaleString("tr-TR")} Coin**`
      ));
    }

    const hasMaymuncuk = (robberEco.inventory || []).some((i) => i.itemId === "item_maymuncuk");
    const winRate = hasMaymuncuk ? 0.75 : 0.45;
    const stealRate = hasMaymuncuk ? 0.40 : 0.25;

    const isSuccess = Math.random() < winRate;

    if (isSuccess) {
      const stolen = Math.floor(targetEco.wallet * stealRate);
      await Economy.updateOne({ _id: targetEco._id }, { $inc: { wallet: -stolen } });
      await Economy.updateOne({ _id: robberEco._id }, { $inc: { wallet: stolen } });

      const maymuncukNote = hasMaymuncuk ? "\n▫️ 🗝️ **Usta Maymuncuk:** Devreye girdi (%75 başarı ve %40 soygun hacmi)" : "";
      return message.reply(MessageFormatter.success(
        "Soygun Başarılı!",
        `▫️ Gizlice sızarak ${targetUser} kullanıcısının cüzdanından **${stolen.toLocaleString("tr-TR")} Coin** aşırdınız!${maymuncukNote}\n▫️ Yeni Cüzdanınız: **${((robberEco.wallet || 0) + stolen).toLocaleString("tr-TR")} Coin**`
      ));
    } else {
      const fine = 150;
      await Economy.updateOne({ _id: robberEco._id }, { $inc: { wallet: -fine } });
      await Economy.updateOne({ _id: targetEco._id }, { $inc: { wallet: fine } });

      return message.reply(MessageFormatter.error(
        "Yakalandınız!",
        `▫️ Soygun sırasında gardiyanlara yakalandınız ve mahkeme kararıyla mağdura **${fine} Coin** tazminat ödediniz.\n▫️ Kalan Cüzdanınız: **${Math.max(0, (robberEco.wallet || 0) - fine).toLocaleString("tr-TR")} Coin**`
      ));
    }
  }
};

