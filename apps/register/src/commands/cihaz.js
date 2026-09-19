import { MessageFormatter } from "@bot/core";

export default {
  name: "cihaz",
  aliases: ["baglanti", "client", "aygit"],
  async execute({ message, args }) {
    const targetMember = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetMember) {
      return message.reply(MessageFormatter.error("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı."));
    }

    const presence = targetMember.presence;
    if (!presence || !presence.clientStatus) {
      return message.reply(MessageFormatter.warn(
        "Cihaz Bilgisi Alınamadı",
        `${targetMember} kullanıcısı şu anda **Çevrimdışı** veya cihaz bilgisi gizli.`
      ));
    }

    const statusMap = {
      online: "🟢 Çevrimiçi",
      idle: "🟡 Boşta",
      dnd: "🔴 Rahatsız Etmeyin",
      offline: "⚫ Çevrimdışı"
    };

    const devices = [];
    if (presence.clientStatus.desktop) {
      devices.push(`💻 **Bilgisayar Uygulaması (PC):** \`${statusMap[presence.clientStatus.desktop] || presence.clientStatus.desktop}\``);
    }
    if (presence.clientStatus.mobile) {
      devices.push(`📱 **Mobil Cihaz (Telefon/Tablet):** \`${statusMap[presence.clientStatus.mobile] || presence.clientStatus.mobile}\``);
    }
    if (presence.clientStatus.web) {
      devices.push(`🌐 **İnternet Tarayıcısı (Web):** \`${statusMap[presence.clientStatus.web] || presence.clientStatus.web}\``);
    }

    if (devices.length === 0) {
      devices.push("▫️ Aktif cihaz bağlantısı tespit edilemedi.");
    }

    message.reply(MessageFormatter.info(
      `Cihaz Durumu: ${targetMember.displayName}`,
      `**Kullanıcı:** ${targetMember} (\`${targetMember.id}\`)\n▫️ **Genel Durum:** \`${statusMap[presence.status] || presence.status}\`\n\n${devices.join("\n")}\n-# Cihaz ve Bağlantı Denetleyicisi | Public Bot Ecosystem`
    ));
  }
};
