import { MessageFormatter } from "@bot/core";

export default {
  name: "odapanel",
  aliases: ["jtcpanel", "ozelodapanel"],
  async execute({ client, message, config }) {
    if (!message.member.permissions.has("Administrator") && !client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu paneli göndermek için Yönetici yetkisine sahip olmalısınız."));
    }

    const generatorId = config.channels?.customVoiceChannel;
    const channelMention = generatorId ? `<#${generatorId}>` : "`Henüz panelden ayarlanmadı`";

    const content = [
      `### 🔊 Özel Ses Odası (JTC) Sistemi`,
      `Sunucumuzda kendinize ait özel ses odası oluşturmak ve yönetmek için ${channelMention} kanalına bağlanmanız yeterlidir.`,
      "",
      `▫️ **Oda Yöneticisi Özellikleri:**`,
      `  • ✏️ **İsim Değiştir:** Açılan formdan odanıza yeni isim verebilirsiniz.`,
      `  • 👥 **Kişi Limiti:** Odanızın üye kapasitesini sınırlandırabilirsiniz.`,
      `  • 🔒 **Odayı Kilitle:** Odanızı diğer tüm üyelere kapatabilirsiniz.`,
      `  • 🔓 **Kilidi Aç:** Oda kilidini kaldırarak katılıma açabilirsiniz.`,
      `  • 🚫 **Odadan At:** İstemediğiniz kullanıcıyı anında ses odasından çıkarabilirsiniz.`,
      `  • 🗑️ **Odayı Kapat:** Odanızı ve geçmişini silebilirsiniz.`,
      "",
      `-# Odadaki tüm üyeler ayrıldığında oda otomatik olarak silinir.`
    ].join("\n");

    await message.channel.send({ content, embeds: [], components: [] });
    await message.delete().catch(() => null);
  }
};

