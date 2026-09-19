import { MessageFormatter } from "@bot/core";

export default {
  name: "ses",
  aliases: ["nerede", "voiceinfo"],
  async execute({ client, message, args, config }) {
    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);
    if (!targetMember) {
      return message.reply(MessageFormatter.warn("Kullanıcı Bulunamadı", "Belirtilen kullanıcı sunucuda bulunamadı."));
    }

    const voiceState = targetMember.voice;
    if (!voiceState || !voiceState.channel) {
      return message.reply(MessageFormatter.info(
        "Ses Durumu",
        `${targetMember} kullanıcısı şu anda herhangi bir ses kanalında bulunmuyor.`
      ));
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

    const content = [
      `### 🎙️ ${targetMember.displayName} - Ses Detayları`,
      `▫️ **Kanal:** <#${channel.id}> (\`${channel.name}\`)`,
      `▫️ **Odada Kalma Süresi:** \`${durationStr}\``,
      `▫️ **Mikrofon:** ${micStatus} | **Kulaklık:** ${deafStatus}`,
      `▫️ **Yayın:** ${streamStatus} | **Kamera:** ${videoStatus}`,
      "",
      `▫️ **Odadaki Diğer Üyeler (${membersInChannel.size}):**`,
      `  ${memberList || "Yalnızca siz"}`,
      "",
      `-# Anlık ses kanalı durumu Discord API'si üzerinden alınmıştır.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

