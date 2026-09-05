import { Embeds } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "banner",
  aliases: ["afis", "afiş"],
  async execute({ client, message, args, config }) {
    const targetUserId = message.mentions.users.first()?.id || args[0] || message.author.id;
    const targetUser = await client.users.fetch(targetUserId, { force: true }).catch(() => null);

    if (!targetUser) {
      return message.reply({ embeds: [Embeds.error("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı.", message.guild)] });
    }

    const bannerUrl = targetUser.bannerURL({ size: 2048, dynamic: true });

    if (!bannerUrl) {
      return message.reply({ embeds: [Embeds.warn("Afiş Bulunamadı", `${targetUser.username} kullanıcısının özel bir profil afişi (banner) bulunmuyor.`, message.guild)] });
    }

    const embed = Embeds.info(
      `${targetUser.username} - Profil Afişi`,
      `[Tam Boyut İçin Tıklayın](${bannerUrl})`,
      message.guild
    );
    embed.setImage(bannerUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Tarayıcıda Aç").setStyle(ButtonStyle.Link).setURL(bannerUrl)
    );

    message.reply({ embeds: [embed], components: [row] });
  }
};
