import { Embeds } from "@bot/core";
import { GuildConfig } from "@bot/database";

export default {
  name: "medyakanal",
  aliases: ["galeri", "medya", "onlymedia"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator") && !client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Medya kanalı ayarlarını yönetmek için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetChannel = message.mentions.channels.first()
      || message.guild.channels.cache.get(args[0])
      || message.channel;

    const currentMediaChannels = config.channels?.mediaChannels || [];
    const isAlreadyMedia = currentMediaChannels.includes(targetChannel.id);

    let updatedList;
    if (isAlreadyMedia) {
      updatedList = currentMediaChannels.filter((id) => id !== targetChannel.id);
    } else {
      updatedList = [...currentMediaChannels, targetChannel.id];
    }

    await GuildConfig.updateOne(
      { guildId: message.guild.id },
      { $set: { "channels.mediaChannels": updatedList } },
      { upsert: true }
    );

    if (isAlreadyMedia) {
      return message.reply({
        embeds: [Embeds.success("Medya Kanalı Kaldırıldı", `${targetChannel} artık normal bir metin kanalı olarak çalışacak (Yazı engeli kaldırıldı).`, message.guild)]
      });
    } else {
      return message.reply({
        embeds: [Embeds.success("Medya Kanalı Ayarlandı", `${targetChannel} artık sadece resim, video ve bağlantı (medya) kabul edecek. Düz metin mesajları otomatik temizlenecektir.`, message.guild)]
      });
    }
  }
};
