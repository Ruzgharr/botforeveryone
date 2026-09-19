import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

const TICKET_COST = 100;
const JACKPOT_CHANCE = 0.02;
const JACKPOT_MULT = 50;
const WIN_CHANCE = 0.15;
const WIN_MULT = 5;
const PIYANGO_COOLDOWN = 24 * 60 * 60 * 1000;

export default {
  name: "piyango",
  aliases: ["lottery"],
  async execute({ message, config }) {
    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId: message.author.id, wallet: 100, bank: 0 });
    }

    const goldenTicketIndex = (eco.inventory || []).findIndex((i) => i.itemId === "item_piyango");
    const hasGoldenTicket = goldenTicketIndex !== -1;

    const now = Date.now();
    const lastPiyango = eco.lastPiyango ? new Date(eco.lastPiyango).getTime() : 0;
    if (!hasGoldenTicket && now - lastPiyango < PIYANGO_COOLDOWN) {
      const remaining = Math.ceil((PIYANGO_COOLDOWN - (now - lastPiyango)) / 3600000);
      return message.reply(MessageFormatter.warn(
        "Bekleme Süresi",
        `Bir sonraki piyango bileti için **${remaining} saat** beklemeniz gerekiyor.\n▫️ İpucu: \`.itemmarket\` üzerinden **Altın Piyango Bileti** alarak beklemeden ve 5 kat ikramiyeyle oynayabilirsiniz!`
      ));
    }

    if (!hasGoldenTicket && eco.wallet < TICKET_COST) {
      return message.reply(MessageFormatter.error(
        "Yetersiz Bakiye",
        `Piyango bileti satın almak için en az **${TICKET_COST} Coin** gerekiyor.`
      ));
    }

    if (hasGoldenTicket) {
      eco.inventory.splice(goldenTicketIndex, 1);
      eco.markModified("inventory");
    } else {
      eco.wallet -= TICKET_COST;
      eco.lastPiyango = new Date();
    }

    const roll = Math.random();
    const jackpotChance = hasGoldenTicket ? 0.08 : JACKPOT_CHANCE;
    const winChance = hasGoldenTicket ? 0.40 : WIN_CHANCE;
    const multBonus = hasGoldenTicket ? 5 : 1;

    if (roll < jackpotChance) {
      const prize = TICKET_COST * JACKPOT_MULT * multBonus;
      eco.wallet += prize;
      await eco.save();

      const bonusNote = hasGoldenTicket ? "\n▫️ 🎫 **Altın Bilet Çarpanı:** 5 Kat Büyük İkramiye!" : "";
      return message.reply(MessageFormatter.render("lotteryWin", {
        status: "BÜYÜK İKRAMİYE (JACKPOT)!",
        amount: prize.toLocaleString("tr-TR"),
        balance: (eco.wallet || 0).toLocaleString("tr-TR"),
        defaultText: `### 🎟️ Piyango - BÜYÜK İKRAMİYE!\n▫️ 🌟 **Kazanılan:** \`+{amount}\` Coin\n▫️ 💳 **Güncel Cüzdan:** \`{balance}\` Coin${bonusNote}\n-# 🎊 Şanslı Talihli : Bilet numaranız çekilişte kazandı`
      }, config, message.guild));
    } else if (roll < jackpotChance + winChance) {
      const prize = TICKET_COST * WIN_MULT * multBonus;
      eco.wallet += prize;
      await eco.save();

      const bonusNote = hasGoldenTicket ? "\n▫️ 🎫 **Altın Bilet Çarpanı:** 5 Kat Ödül!" : "";
      return message.reply(MessageFormatter.render("lotteryWin", {
        status: "Tebrikler Kazandınız!",
        amount: prize.toLocaleString("tr-TR"),
        balance: (eco.wallet || 0).toLocaleString("tr-TR"),
        defaultText: `### 🎟️ Piyango - Kazandınız!\n▫️ 🌟 **Kazanılan:** \`+{amount}\` Coin\n▫️ 💳 **Güncel Cüzdan:** \`{balance}\` Coin${bonusNote}\n-# 🎊 Şanslı Talihli : Bilet numaranız çekilişte kazandı`
      }, config, message.guild));
    } else {
      await eco.save();
      const spentText = hasGoldenTicket ? "1 Adet Altın Piyango Bileti kullanıldı" : `**${TICKET_COST} Coin** harcandı`;
      return message.reply(MessageFormatter.warn(
        "Kaybettiniz",
        `▫️ Biletiniz tutmadı. ${spentText}.\n▫️ Kalan Cüzdan: **${(eco.wallet || 0).toLocaleString("tr-TR")} Coin**`
      ));
    }
  }
};

