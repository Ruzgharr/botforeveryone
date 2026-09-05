import { Embeds } from "@bot/core";

export default {
  name: "sesac",
  aliases: ["toplusesac", "voiceunmuteall", "odakonus"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const channel = message.member.voice?.channel
      || (args[0] ? message.guild.channels.cache.get(args[0]) : null);

    if (!channel || !channel.isVoiceBased()) {
      return message.reply({ embeds: [Embeds.warn("Kanal Bulunamadı", "Lütfen bir ses kanalına bağlanın veya bir ses kanalı ID'si girin.", message.guild)] });
    }

    const members = channel.members.filter((m) => !m.user.bot && m.voice.serverMute);
    if (members.size === 0) {
      return message.reply({ embeds: [Embeds.warn("Üye Bulunamadı", "Bu ses kanalında susturulmuş bir üye bulunmuyor.", message.guild)] });
    }

    let unmutedCount = 0;
    for (const member of members.values()) {
      try {
        await member.voice.setMute(false, `Toplu ses açma: ${message.author.tag}`);
        unmutedCount++;
      } catch {}
    }

    const embed = Embeds.success(
      "Toplu Ses Açıldı",
      `${channel} kanalındaki **${unmutedCount} üyenin** mikrofon susturması kaldırıldı.`,
      message.guild
    );

    await message.reply({ embeds: [embed] });
  }
};
