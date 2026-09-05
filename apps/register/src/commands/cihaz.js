import { Embeds } from "@bot/core";

export default {
  name: "cihaz",
  aliases: ["baglanti", "client", "aygit"],
  async execute({ message, args }) {
    const targetMember = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetMember) {
      return message.reply({ embeds: [Embeds.error("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı.", message.guild)] });
    }

    const presence = targetMember.presence;
    if (!presence || !presence.clientStatus) {
      return message.reply({
        embeds: [Embeds.warn("Cihaz Bilgisi Alınamadı", `${targetMember} kullanıcısı şu anda **Çevrimdışı** veya cihaz bilgisi gizli.`, message.guild)]
      });
    }

    const statusMap = {
      online: "🟢 Çevrimiçi",
      idle: "🟡 Boşta",
      dnd: "🔴 Rahatsız Etmeyin",
      offline: "⚫ Çevrimdışı"
    };

    const devices = [];
    if (presence.clientStatus.desktop) {
      devices.push(`💻 **Bilgisayar Uygulaması (PC):** ${statusMap[presence.clientStatus.desktop] || presence.clientStatus.desktop}`);
    }
    if (presence.clientStatus.mobile) {
      devices.push(`📱 **Mobil Cihaz (Telefon/Tablet):** ${statusMap[presence.clientStatus.mobile] || presence.clientStatus.mobile}`);
    }
    if (presence.clientStatus.web) {
      devices.push(`🌐 **İnternet Tarayıcısı (Web):** ${statusMap[presence.clientStatus.web] || presence.clientStatus.web}`);
    }

    if (devices.length === 0) {
      devices.push("Aktif cihaz bağlantısı tespit edilemedi.");
    }

    const embed = Embeds.base(`Cihaz Durumu: ${targetMember.displayName}`, null, message.guild)
      .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Kullanıcı", value: `${targetMember} (\`${targetMember.id}\`)`, inline: true },
        { name: "Genel Durum", value: statusMap[presence.status] || presence.status, inline: true },
        { name: "Aktif Cihazlar", value: devices.join("\n"), inline: false }
      )
      .setFooter({ text: "Cihaz ve Bağlantı Denetleyicisi | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.reply({ embeds: [embed] });
  }
};
