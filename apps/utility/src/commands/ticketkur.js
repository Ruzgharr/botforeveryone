import { Embeds } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "ticketkur",
  aliases: ["destekkur", "ticket-setup"],
  async execute({ message }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak icin Yonetici yetkisi gereklidir.", message.guild)] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create_general")
        .setLabel("Destek Talebi Olustur")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📩")
    );

    await message.channel.send({
      embeds: [
        Embeds.info(
          "Sunucu Destek Sistemi",
          "Bir sorun, sikayet veya yetkili basvurusu icin asagidaki butona tiklayarak yetkililerle ozel gorusme kanali acabilirsiniz.",
          message.guild
        )
      ],
      components: [row]
    });

    message.reply({ content: "Destek paneli basariyla kuruldu." }).catch(() => null);
  }
};
