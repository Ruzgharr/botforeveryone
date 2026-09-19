import { PermissionFlagsBits } from "discord.js";
import { Economy } from "@bot/database";
import { MessageFormatter } from "@bot/core";

export default {
  name: "coinver",
  aliases: ["coin-ver", "coinekle", "coin-ekle", "addcoin", "givecoin", "setcoin", "coin-al", "coinal"],
  async execute({ client, message, args, config }) {
    const isGuildOwner = message.guild.ownerId === message.author.id;
    const isBotOwner = client.isBotOwner ? client.isBotOwner(message.author.id, config) : false;
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isGuildOwner && !isBotOwner && !isAdmin) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu yalnızca Sunucu Sahibi, Bot Sahipleri ve Yöneticiler kullanabilir."));
    }

    const commandName = (message.content.slice(config.prefix?.length || 1).trim().split(/ +/g)[0] || "").toLowerCase();
    const isDeduct = ["coin-al", "coinal", "coinsil", "coin-sil"].includes(commandName);

    let targetUser = message.mentions.users.first();
    let amountStr = "";

    if (targetUser) {
      amountStr = args[1];
    } else if (args[0] && /^\d+$/.test(args[0]) && args[0].length > 15) {
      targetUser = await client.users.fetch(args[0]).catch(() => null);
      amountStr = args[1];
    } else if (args[0] && !isNaN(parseInt(args[0], 10))) {
      targetUser = message.author;
      amountStr = args[0];
    }

    if (!targetUser) {
      targetUser = message.author;
    }

    if (!amountStr) {
      return message.reply(MessageFormatter.warn(
        "Hatalı Kullanım",
        "Lütfen eklenecek veya alınacak coin miktarını belirtin.\n\n▫️ Kendine eklemek için: `.coin-ver <miktar>`\n▫️ Başkasına eklemek için: `.coin-ver @kullanici <miktar>`\n▫️ Coin almak için: `.coin-al @kullanici <miktar>`"
      ));
    }

    const cleanAmount = parseInt(amountStr.replace(/[^0-9]/g, ""), 10);
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      return message.reply(MessageFormatter.error("Geçersiz Tutar", "Lütfen 0'dan büyük geçerli bir sayı girin."));
    }

    const finalAmount = isDeduct ? -cleanAmount : cleanAmount;

    let profile = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!profile) {
      profile = await Economy.create({
        guildId: message.guild.id,
        userId: targetUser.id,
        wallet: 0,
        bank: 0
      });
    }

    profile.wallet = Math.max(0, (profile.wallet || 0) + finalAmount);
    await profile.save();

    const actionText = isDeduct ? "Silindi / Geri Alındı" : "Sınırsız Tanımlandı & Eklendi";
    const sign = isDeduct ? "-" : "+";

    const payload = MessageFormatter.v2(
      `💰 **Yönetici Coin İşlemi Başarılı**\n\n▫️ **Hedef Kullanıcı:** <@${targetUser.id}> \`(${targetUser.id})\`\n▫️ **İşlem Türü:** ${actionText}\n▫️ **Miktar:** \`${sign}${cleanAmount.toLocaleString("tr-TR")} Coin\`\n▫️ **Güncel Cüzdan Bakiyesi:** **${profile.wallet.toLocaleString("tr-TR")} Coin**\n▫️ **Yetkili:** <@${message.author.id}>`
    );

    return message.reply(payload);
  }
};
