import { Economy } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";
import { PetService } from "../services/PetService.js";

export default {
  name: "rulet",
  aliases: ["roulette"],
  async execute({ message, args, config }) {
    const color = args[0]?.toLowerCase();
    const bet = parseInt(args[1], 10);

    const validColors = ["kırmızı", "kirmizi", "siyah", "yeşil", "yesil", "red", "black", "green"];
    if (!validColors.includes(color) || isNaN(bet) || bet <= 0) {
      return message.reply(MessageFormatter.warn(
        "Format Hatası",
        `Formatı kullanın: \`.rulet [kırmızı/siyah/yeşil] [miktar]\`\nÖrnek: \`.rulet kırmızı 50\``
      ));
    }

    const minBet = config.casinoSettings?.minBet || 10;
    const maxBet = config.casinoSettings?.maxBet || 50000;
    if (bet < minBet || bet > maxBet) {
      return message.reply(MessageFormatter.warn(
        "Bahis Limiti",
        `Rulet bahsi minimum **${minBet.toLocaleString("tr-TR")}**, maksimum **${maxBet.toLocaleString("tr-TR")} Coin** olabilir.`
      ));
    }

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!profile || profile.wallet < bet) {
      return message.reply(MessageFormatter.error("Yetersiz Bakiye", `Cüzdanınızda yeterli para yok. (Mevcut: ${profile?.wallet || 0} Coin)`));
    }

    const random = Math.floor(Math.random() * 37);
    let resultColor = "";
    if (random === 0) {
      resultColor = "yeşil";
    } else if (random % 2 === 0) {
      resultColor = "siyah";
    } else {
      resultColor = "kırmızı";
    }

    const normalizedChoice = (color === "red" || color === "kirmizi" || color === "kırmızı") ? "kırmızı" : (color === "black" || color === "siyah") ? "siyah" : "yeşil";

    let isWin = normalizedChoice === resultColor;
    const hasSans = (profile.inventory || []).some((i) => i.itemId === "item_sans");
    let sansTriggered = false;
    if (!isWin && hasSans && Math.random() < 0.20) {
      resultColor = normalizedChoice;
      isWin = true;
      sansTriggered = true;
    }

    const petBonus = await PetService.calculateBonus(message.guild.id, message.author.id, "gambling");
    let petTriggered = false;
    if (!isWin && petBonus.active && Math.random() < 0.15) {
      resultColor = normalizedChoice;
      isWin = true;
      petTriggered = true;
    }

    if (isWin) {
      const multiplier = resultColor === "yeşil" ? 14 : 2;
      const winAmount = bet * multiplier;
      profile.wallet += winAmount - bet;
      await profile.save();

      const sansBonusText = sansTriggered ? "\n▫️ 🍀 **Şanslı Yonca:** Top son anda sizin renginize sıçradı!" : "";
      const petBonusText = petTriggered ? `\n▫️ ${petBonus.meta.emoji} **${petBonus.pet.name}:** Şans ilhamıyla çarkı lehinize çevirdi!` : "";

      const payload = MessageFormatter.render("ruletWin", {
        color: resultColor === "yeşil" ? 0x2ecc71 : (resultColor === "kırmızı" ? 0xe74c3c : 0x2c2f33),
        colorName: resultColor.toUpperCase(),
        number: random,
        amount: winAmount.toLocaleString("tr-TR"),
        balance: (profile.wallet || 0).toLocaleString("tr-TR"),
        title: "Rulet - Kazandınız!",
        defaultText: `### 🎡 Rulet - Kazandınız!\n▫️ 🎯 **Gelen Sonuç:** ${resultColor.toUpperCase()} (${random})\n▫️ 💰 **Kazanılan:** +${winAmount.toLocaleString("tr-TR")} Coin\n▫️ 💳 **Güncel Bakiye:** ${(profile.wallet || 0).toLocaleString("tr-TR")} Coin${sansBonusText}${petBonusText}\n-# 🍀 Çark Döndü : İsabetli tahminle kazandınız`
      }, config, message.guild);

      message.reply(payload);
    } else {
      profile.wallet -= bet;
      await profile.save();

      const payload = MessageFormatter.render("ruletLose", {
        color: resultColor === "yeşil" ? 0x2ecc71 : (resultColor === "kırmızı" ? 0xe74c3c : 0x2c2f33),
        colorName: resultColor.toUpperCase(),
        number: random,
        amount: bet.toLocaleString("tr-TR"),
        balance: (profile.wallet || 0).toLocaleString("tr-TR"),
        title: "Rulet - Kaybettiniz",
        defaultText: `### 🎡 Rulet - Kaybettiniz\n▫️ 🎯 **Gelen Sonuç:** ${resultColor.toUpperCase()} (${random})\n▫️ 📉 **Kaybedilen:** -${bet.toLocaleString("tr-TR")} Coin\n▫️ 💳 **Güncel Bakiye:** ${(profile.wallet || 0).toLocaleString("tr-TR")} Coin\n-# 🎲 Şans • Top beklenen bölgeye düşmedi`
      }, config, message.guild);

      message.reply(payload);
    }
  }
};
