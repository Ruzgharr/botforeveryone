import { MessageFormatter } from "@bot/core";

export default {
  name: "seskapat",
  aliases: ["topluseskapat", "voicemuteall", "odasus"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const channel = message.member.voice?.channel
      || (args[0] ? message.guild.channels.cache.get(args[0]) : null);

    if (!channel || !channel.isVoiceBased()) {
      return message.reply(MessageFormatter.warn("Kanal Bulunamadı", "Lütfen bir ses kanalına bağlanın veya bir ses kanalı ID'si girin."));
    }

    const members = channel.members.filter((m) => !m.user.bot && m.id !== message.author.id);
    if (members.size === 0) {
      return message.reply(MessageFormatter.warn("Üye Bulunamadı", "Bu ses kanalında susturulacak başka bir üye bulunmuyor."));
    }

    let mutedCount = 0;
    for (const member of members.values()) {
      try {
        await member.voice.setMute(true, `Toplu ses susturma: ${message.author.tag}`);
        mutedCount++;
      } catch {}
    }

    message.reply(MessageFormatter.success(
      "Toplu Ses Kapatıldı",
      `${channel} kanalındaki **${mutedCount} üye** mikrofondan susturuldu.`
    ));
  }
};
