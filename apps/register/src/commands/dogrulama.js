import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Embeds } from "@bot/core";

export default {
  name: "dogrulama",
  aliases: ["captcha", "guvenlikdogrulama", "verify"],
  async execute({ message }) {
    if (!message.member.permissions.has("Administrator") && message.guild.ownerId !== message.author.id) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu paneli kurmak için Yönetici yetkisine sahip olmalısınız.", message.guild)] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_human")
        .setLabel("Ben İnsanım / Doğrula")
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Success)
    );

    const embed = Embeds.base(
      "🛡️ Sunucu Güvenlik Doğrulaması",
      "Sunucumuza hoş geldiniz! Zararlı bot ve sahte hesap saldırılarını önlemek adına lütfen aşağıdaki butona tıklayarak insan olduğunuzu doğrulayın.\n\nDoğrulama sonrasında kayıt odalarına erişiminiz anında açılacaktır.",
      message.guild
    ).setFooter({ text: "Güvenlik Doğrulama Paneli | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.channel.send({ embeds: [embed], components: [row] });
    await message.delete().catch(() => null);
  }
};
