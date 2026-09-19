import { MessageFormatter } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "ticketkur",
  aliases: ["destekkur", "ticket-setup"],
  async execute({ message }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için Yönetici yetkisi gereklidir."));
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create_general")
        .setLabel("Destek Talebi Oluştur")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📩")
    );

    const content = [
      `### 📩 Sunucu Destek Talebi (Ticket) Sistemi`,
      `Bir sorun, şikayet, soru veya yetkili başvurusu için aşağıdaki butona tıklayarak yetkili ekibimizle özel bir görüşme kanalı açabilirsiniz.`,
      "",
      `▫️ Talepler yalnızca siz ve yetkili ekip tarafından görüntülenebilir.`,
      "",
      `-# Lütfen gereksiz talep açmaktan kaçınınız.`
    ].join("\n");

    await message.channel.send({
      content,
      embeds: [],
      components: [row]
    });

    message.reply(MessageFormatter.success("Destek Paneli Kuruldu", "Destek paneli başarıyla bu kanala gönderildi.")).catch(() => null);
  }
};

