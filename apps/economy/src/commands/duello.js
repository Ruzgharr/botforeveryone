import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { Economy } from "@bot/database";
import { DuelService } from "../services/DuelService.js";

export default {
  name: "duello",
  aliases: ["duel", "vs", "meydanoku"],
  async execute({ message, args, config }) {
    const targetMember = message.mentions.members.first();
    const betArg = args.find((a) => !a.startsWith("<@") && !isNaN(parseInt(a, 10)));
    const bet = betArg ? parseInt(betArg, 10) : NaN;

    if (!targetMember || isNaN(bet) || bet <= 0) {
      return message.reply(MessageFormatter.warn(
        "Kullanım Formatı",
        "Bahisli düello başlatmak için:\n`.duello @kullanici <miktar>`\nÖrnek: `.duello @Ahmet 1000`"
      ));
    }

    if (targetMember.id === message.author.id) {
      return message.reply(MessageFormatter.error("Geçersiz Hedef", "Kendinize düello teklif edemezsiniz!"));
    }

    if (targetMember.user.bot) {
      return message.reply(MessageFormatter.error("Geçersiz Hedef", "Botlarla düello yapamazsınız!"));
    }

    const ecoAuthor = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!ecoAuthor || ecoAuthor.wallet < bet) {
      return message.reply(MessageFormatter.error(
        "Yetersiz Bakiye",
        `Cüzdanınızda düello bahsini karşılayacak kadar para yok. (Cüzdan: ${(ecoAuthor?.wallet || 0).toLocaleString("tr-TR")} Coin)`
      ));
    }

    const ecoTarget = await Economy.findOne({ guildId: message.guild.id, userId: targetMember.id });
    if (!ecoTarget || ecoTarget.wallet < bet) {
      return message.reply(MessageFormatter.error(
        "Hedef Bakiye Yetersiz",
        `Meydan okuduğunuz kullanıcının cüzdanında yeterli para yok. (Gereken: ${bet.toLocaleString("tr-TR")} Coin)`
      ));
    }

    const res = DuelService.createDuel({
      guildId: message.guild.id,
      challengerId: message.author.id,
      targetId: targetMember.id,
      bet,
      config
    });

    if (!res.success) {
      return message.reply(MessageFormatter.error("Düello Başlatılamadı", res.message));
    }

    const duel = res.duel;
    const content = [
      `### ⚔️ Düello Meydan Okuması!`,
      `▫️ <@${message.author.id}>, <@${targetMember.id}> kullanıcısına bahisli düello teklif etti!`,
      "",
      `▫️ 💰 **Bahis Miktarı:** \`${bet.toLocaleString("tr-TR")} Coin\``,
      `▫️ 🏆 **Ortak Ödül Havuzu:** \`${(bet * 2).toLocaleString("tr-TR")} Coin\``,
      `▫️ ⏳ **Kabul Süresi:** \`60 Saniye\``,
      "",
      `-# Davet edilen üye aşağıdaki butonlarla düelloyu kabul edebilir veya reddedebilir.`
    ].join("\n");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`duel_accept:${duel.id}`)
        .setLabel("⚔️ Kabul Et ve Dövüş")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`duel_decline:${duel.id}`)
        .setLabel("🏳️ Reddet / Vazgeç")
        .setStyle(ButtonStyle.Danger)
    );

    return message.reply({
      content: `<@${targetMember.id}>, sana bir düello teklifi var!`,
      ...MessageFormatter.v2(content, [row])
    });
  }
};
