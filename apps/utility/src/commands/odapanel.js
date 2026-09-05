import { Embeds } from "@bot/core";

export default {
  name: "odapanel",
  aliases: ["jtcpanel", "ozelodapanel"],
  async execute({ client, message, config }) {
    if (!message.member.permissions.has("Administrator") && !client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu paneli göndermek için Yönetici yetkisine sahip olmalısınız.", message.guild)] });
    }

    const generatorId = config.channels?.customVoiceChannel;
    const channelMention = generatorId ? `<#${generatorId}>` : "`Henüz panelden ayarlanmadı`";

    const embed = Embeds.info(
      "🔊 Özel Ses Odası (JTC) Sistemi",
      `Sunucumuzda kendinize ait özel ses odası oluşturmak ve yönetmek için ${channelMention} kanalına bağlanmanız yeterlidir.\n\n`
      + "**Oda Yöneticisi Özellikleri ve Butonlar:**\n"
      + "✏️ **İsim Değiştir:** Açılan pencere üzerinden odanıza dilediğiniz yeni ismi verebilirsiniz.\n"
      + "👥 **Kişi Limiti:** Odanızın üye kapasitesini sınırsız, 2, 5 veya 10 kişi olarak değiştirebilirsiniz.\n"
      + "🔒 **Odayı Kilitle:** Odanızı diğer tüm üyelere kapatarak yalnızca izin verdiklerinizin girmesini sağlarsınız.\n"
      + "🔓 **Kilidi Aç:** Oda kilidini kaldırarak sunucu üyelerinin tekrar odaya katılabilmesini sağlarsınız.\n"
      + "🚫 **Odadan At:** Menüden seçeceğiniz kullanıcıyı anında ses odasından düşürür ve tekrar girişini engeller.\n"
      + "🗑️ **Odayı Kapat:** Odanızı ve mesaj geçmişini doğrudan silebilirsiniz.\n\n"
      + "*Not: Odadaki tüm üyeler ayrıldığında oda otomatik olarak silinir.*",
      message.guild
    ).setFooter({ text: "Join to Create | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.channel.send({ embeds: [embed] });
    await message.delete().catch(() => null);
  }
};
