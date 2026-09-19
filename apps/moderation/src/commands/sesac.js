import { MessageFormatter } from "@bot/core";

export default {
  name: "sesac",
  aliases: ["toplusesac", "voiceunmuteall", "odakonus"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const channel = message.member.voice?.channel
      || (args[0] ? message.guild.channels.cache.get(args[0]) : null);

    if (!channel || !channel.isVoiceBased()) {
      return message.reply(MessageFormatter.warn("Kanal Bulunamadı", "Lütfen bir ses kanalına bağlanın veya bir ses kanalı ID'si girin."));
    }

    const members = channel.members.filter((m) => !m.user.bot && m.voice.serverMute);
    if (members.size === 0) {
      return message.reply(MessageFormatter.warn("Üye Bulunamadı", "Bu ses kanalında susturulmuş bir üye bulunmuyor."));
    }

    let unmutedCount = 0;
    for (const member of members.values()) {
      try {
        await member.voice.setMute(false, `Toplu ses açma: ${message.author.tag}`);
        unmutedCount++;
      } catch {}
    }

    message.reply(MessageFormatter.success(
      "Toplu Ses Açıldı",
      `${channel} kanalındaki **${unmutedCount} üyenin** mikrofon susturması kaldırıldı.`
    ));
  }
};
