import { Embeds } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const STATIONS = [
  { id: 1, name: "Kral Pop", genre: "Türkçe Pop", url: "https://kralpopwmp.radyotvonline.net/lisansli" },
  { id: 2, name: "SlowTürk", genre: "Slow & Aşk", url: "https://slowturkwmp.radyotvonline.net" },
  { id: 3, name: "Power Türk", genre: "Hit Müzik", url: "https://listen.powerapp.com.tr/powerturk/mpeg/icecast.audio" },
  { id: 4, name: "Radyo Fenomen", genre: "Yabancı Hit", url: "https://listen.radyofenomen.com/fenomen/128/icecast.audio" },
  { id: 5, name: "Virgin Radio", genre: "Global Pop", url: "https://karnaval.medyatriple.com/virgin.mp3" }
];

export default {
  name: "radyo",
  aliases: ["radio", "istasyon"],
  async execute({ client, message, args }) {
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "liste") {
      const listStr = STATIONS.map((s) => `**${s.id}.** 📻 **${s.name}** \`[${s.genre}]\``).join("\n");
      const embed = Embeds.base(
        "📻 Canlı Radyo İstasyonları",
        `Aşağıdaki istasyonlardan dilediğinizi seçip \`.radyo oyna <No>\` komutu ile dinleyebilirsiniz:\n\n${listStr}`,
        message.guild
      ).setFooter({ text: "Radyo Modülü | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

      return message.reply({ embeds: [embed] });
    }

    if (sub === "oyna" || sub === "çal") {
      const stationId = parseInt(args[1], 10);
      const station = STATIONS.find((s) => s.id === stationId);

      if (!station) {
        return message.reply({
          embeds: [Embeds.warn("Geçersiz İstasyon", "Lütfen listedeki geçerli bir istasyon numarası girin (1-5 arası). İstasyonları görmek için: `.radyo liste`", message.guild)]
        });
      }

      const voiceChannel = message.member.voice?.channel;
      if (!voiceChannel) {
        return message.reply({
          embeds: [Embeds.warn("Seste Değilsiniz", "Radyo başlatabilmek için lütfen öncelikle bir ses kanalına bağlanın.", message.guild)]
        });
      }

      if (!client.activeRadio) {
        client.activeRadio = new Map();
      }

      client.activeRadio.set(message.guild.id, {
        channelId: voiceChannel.id,
        station
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("radio_stop")
          .setLabel("Durdur")
          .setEmoji("⏹️")
          .setStyle(ButtonStyle.Danger)
      );

      const embed = Embeds.success(
        "📻 Canlı Radyo Başlatıldı",
        `**İstasyon:** ${station.name}\n**Tür:** ${station.genre}\n**Kanal:** ${voiceChannel}\n\nİstasyon akışı başarıyla bağlandı. Keyifli dinlemeler!`,
        message.guild
      ).setFooter({ text: "7/24 Kesintisiz Radyo | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

      return message.reply({ embeds: [embed], components: [row] });
    }

    if (sub === "durdur" || sub === "kapat") {
      if (!client.activeRadio?.has(message.guild.id)) {
        return message.reply({ embeds: [Embeds.warn("Radyo Çalmıyor", "Bu sunucuda şu anda çalan bir radyo bulunmuyor.", message.guild)] });
      }

      client.activeRadio.delete(message.guild.id);
      return message.reply({ embeds: [Embeds.info("Radyo Durduruldu", "Canlı radyo akışı başarıyla sonlandırıldı.", message.guild)] });
    }
  }
};
