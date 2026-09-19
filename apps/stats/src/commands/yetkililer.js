import { MessageFormatter } from "@bot/core";

export default {
  name: "yetkililer",
  aliases: ["yetkilisay", "staff", "yetkili-durum"],
  async execute({ client, message, args, config }) {
    const staffRoleIds = config.roles?.staffRoles || [];
    if (staffRoleIds.length === 0) {
      return message.reply(MessageFormatter.warn("Ayar Hatası", "Sistemde yetkili rolleri henüz tanımlanmamış."));
    }

    await message.guild.members.fetch().catch(() => null);

    const staffMembers = message.guild.members.cache.filter((m) => {
      if (m.user.bot) return false;
      return staffRoleIds.some((rId) => m.roles.cache.has(rId));
    });

    if (staffMembers.size === 0) {
      return message.reply(MessageFormatter.info("Yetkili Bulunamadı", "Sunucuda yetkili rolüne sahip üye bulunmuyor."));
    }

    const inVoice = staffMembers.filter((m) => m.voice?.channelId);
    const notInVoice = staffMembers.filter((m) => !m.voice?.channelId);

    const voiceList = inVoice.size > 0
      ? inVoice.map((m) => `  • <@${m.id}> (<#${m.voice.channelId}>)`).slice(0, 15).join("\n")
      : "  • Şu anda seste yetkili bulunmuyor.";

    const extraVoiceCount = inVoice.size > 15 ? `\n  • ...ve ${inVoice.size - 15} yetkili daha` : "";

    const content = [
      `### 🛡️ Yetkili Canlı Aktivite Tablosu`,
      `▫️ **Toplam Yetkili:** \`${staffMembers.size}\` kişi`,
      `▫️ **Sesteki Yetkililer:** \`${inVoice.size}\` kişi`,
      `▫️ **Seste Olmayan Yetkililer:** \`${notInVoice.size}\` kişi`,
      "",
      `▫️ **Sesteki Yetkili Listesi:**`,
      voiceList + extraVoiceCount,
      "",
      `-# Yetkili denetimi ve ses takibi anlık olarak yürütülmektedir.`
    ].join("\n");

    return message.reply({
      content,
      embeds: [],
      components: []
    });
  }
};

