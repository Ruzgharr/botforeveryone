import { Embeds } from "@bot/core";

export default {
  name: "yetkililer",
  aliases: ["yetkilisay", "staff", "yetkili-durum"],
  async execute({ client, message, args, config }) {
    const staffRoleIds = config.roles?.staffRoles || [];
    if (staffRoleIds.length === 0) {
      return message.reply({ embeds: [Embeds.warn("Ayar Hatası", "Sistemde yetkili rolleri henüz tanımlanmamış.", message.guild)] });
    }

    await message.guild.members.fetch().catch(() => null);

    const staffMembers = message.guild.members.cache.filter((m) => {
      if (m.user.bot) return false;
      return staffRoleIds.some((rId) => m.roles.cache.has(rId));
    });

    if (staffMembers.size === 0) {
      return message.reply({ embeds: [Embeds.info("Yetkili Bulunamadı", "Sunucuda yetkili rolüne sahip üye bulunmuyor.", message.guild)] });
    }

    const inVoice = staffMembers.filter((m) => m.voice?.channelId);
    const notInVoice = staffMembers.filter((m) => !m.voice?.channelId);

    const voiceList = inVoice.size > 0
      ? inVoice.map((m) => `• <@${m.id}> (<#${m.voice.channelId}>)`).slice(0, 15).join("\n")
      : "Şu anda seste yetkili bulunmuyor.";

    const extraVoiceCount = inVoice.size > 15 ? `\n...ve ${inVoice.size - 15} yetkili daha` : "";

    const description = [
      `• **Toplam Yetkili Sayısı:** \`${staffMembers.size}\` kişi`,
      `• **Sesteki Yetkililer:** \`${inVoice.size}\` kişi`,
      `• **Seste Olmayan Yetkililer:** \`${notInVoice.size}\` kişi`,
      "",
      "### 🎙️ Sesteki Yetkili Listesi",
      voiceList + extraVoiceCount
    ].join("\n");

    message.reply({
      embeds: [Embeds.info("Yetkili Canlı Aktivite Tablosu", description, message.guild)]
    });
  }
};
