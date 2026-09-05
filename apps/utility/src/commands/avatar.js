import { Embeds } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "avatar",
  aliases: ["av", "pp"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!targetUser) {
      return message.reply({ embeds: [Embeds.error("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı.", message.guild)] });
    }

    const avatarUrl = targetUser.displayAvatarURL({ size: 2048, dynamic: true });

    const embed = Embeds.info(
      `${targetUser.username} - Profil Fotoğrafı`,
      `[Tam Boyut İçin Tıklayın](${avatarUrl})`,
      message.guild
    );
    embed.setImage(avatarUrl);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel("Tarayıcıda Aç").setStyle(ButtonStyle.Link).setURL(avatarUrl)
    );

    message.reply({ embeds: [embed], components: [row] });
  }
};
