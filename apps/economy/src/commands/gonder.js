import { Economy } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "gönder",
  aliases: ["gonder", "transfer", "pay"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    const amount = parseInt(args[1], 10);

    if (!targetUser || targetUser.bot || targetUser.id === message.author.id || isNaN(amount) || amount <= 0) {
      return message.reply({ embeds: [Embeds.warn("Format Hatası", "Formatı kullanın: `.gönder @kullanıcı [miktar]`", message.guild)] });
    }

    let senderProfile = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!senderProfile || senderProfile.wallet < amount) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", "Göndermek istediğiniz miktarda bakiyeniz bulunmuyor.", message.guild)] });
    }

    let receiverProfile = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!receiverProfile) {
      receiverProfile = await Economy.create({ guildId: message.guild.id, userId: targetUser.id });
    }

    senderProfile.wallet -= amount;
    receiverProfile.wallet += amount;

    await senderProfile.save();
    await receiverProfile.save();

    const payload = MessageFormatter.render("coinTransferSuccess", {
      user: message.author,
      target: targetUser,
      amount,
      title: "Transfer Başarılı"
    }, config, message.guild);

    message.reply(payload);
  }
};
