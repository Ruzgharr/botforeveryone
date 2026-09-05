import { Embeds } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "kurallar",
  aliases: ["rules", "kurallaryaz"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu yalnızca sunucu yöneticileri kullanabilir.", message.guild)] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("rules_accept")
        .setLabel("Kuralları Okudum ve Kabul Ediyorum")
        .setStyle(ButtonStyle.Success)
        .setEmoji("✅")
    );

    const description = [
      "Sunucumuzun huzur ve düzenini korumak adına tüm üyelerin aşağıdaki temel kurallara uyması zorunludur:",
      "",
      "**1. Saygı ve Nezaket**",
      "Üyelere ve yetkililere karşı hakaret, küfür, aşağılama ve nefret söylemi kesinlikle yasaktır.",
      "",
      "**2. Reklam ve Tanıtım**",
      "Metin kanallarından, ses odalarından veya özel mesaj yoluyla reklam/davet paylaşımı yasaktır.",
      "",
      "**3. Spam ve Taşkınlık**",
      "Kanallarda flood, emoji/capslock spamı ve metin kirliliği oluşturmak yasaktır.",
      "",
      "**4. Uygunsuz İçerik**",
      "Cinsel, şiddet içeren veya yasa dışı hiçbir materyal sunucumuzda barındırılamaz.",
      "",
      "Aşağıdaki butona tıklayarak kuralları kabul edebilir ve sunucudaki sohbet kanallarına erişim sağlayabilirsiniz."
    ].join("\n");

    message.channel.send({
      embeds: [Embeds.info(`📜 ${message.guild.name} - Sunucu Kuralları`, description, message.guild)],
      components: [row]
    });

    if (message.deletable) {
      message.delete().catch(() => null);
    }
  }
};
