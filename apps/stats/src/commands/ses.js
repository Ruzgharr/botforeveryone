import { Embeds } from "@bot/core";

export default {
  name: "ses",
  aliases: ["nerede", "voiceinfo"],
  async execute({ client, message, args, config }) {
    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);
    if (!targetMember) {
      return message.reply({ embeds: [Embeds.warn("Kullanıcı Bulunamadı", "Belirtilen kullanıcı sunucuda bulunamadı.", message.guild)] });
    }

    const voiceState = targetMember.voice;
    if (!voiceState || !voiceState.channel) {
      return message.reply({
        embeds: [Embeds.info("Ses Durumu", `${targetMember} kullanıcısı şu anda herhangi bir ses kanalında bulunmuyor.`, message.guild)]
      });
    }

    const channel = voiceState.channel;
    const sessionKey = `${message.guild.id}_${targetMember.id}`;
    const session = client.voiceSessions?.get(sessionKey);

    let durationStr = "Bilinmiyor";
    if (session && session.joinedAt) {
      const diffMs = Date.now() - session.joinedAt;
      const mins = Math.floor(diffMs / 60000);
      const hours = Math.floor(mins / 60);
      durationStr = hours > 0 ? `${hours} saat ${mins % 60} dakika` : `${mins} dakika`;
    }

    const micStatus = voiceState.mute || voiceState.selfMute ? "Kapalı (Susturulmuş)" : "Açık";
    const deafStatus = voiceState.deaf || voiceState.selfDeaf ? "Kapalı (Sağırlaştırılmış)" : "Açık";
    const streamStatus = voiceState.streaming ? "Aktif" : "Kapalı";
    const videoStatus = voiceState.selfVideo ? "Aktif" : "Kapalı";

    const membersInChannel = channel.members.filter((m) => !m.user.bot);
    const memberList = membersInChannel.size <= 8
      ? membersInChannel.map((m) => `<@${m.id}>`).join(", ")
      : `${membersInChannel.first(6).map((m) => `<@${m.id}>`).join(", ")} ve ${membersInChannel.size - 6} kişi daha`;

    const description = [
      `• **Kanal:** ${channel.name} (\`${channel.id}\`)`,
      `• **Odada Kalma Süresi:** ${durationStr}`,
      `• **Mikrofon Durumu:** ${micStatus}`,
      `• **Kulaklık Durumu:** ${deafStatus}`,
      `• **Ekran Yayını:** ${streamStatus}`,
      `• **Kamera Durumu:** ${videoStatus}`,
      `• **Odadaki Üyeler (${membersInChannel.size}):** ${memberList || "Yalnızca siz"}`
    ].join("\n");

    message.reply({
      embeds: [
        Embeds.info(`${targetMember.displayName} - Ses Detayları`, description, message.guild)
      ]
    });
  }
};
