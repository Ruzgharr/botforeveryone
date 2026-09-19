import { MessageFormatter } from "@bot/core";
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
  async execute({ client, message, args, config }) {
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "liste") {
      const listStr = STATIONS.map((s) => `▫️ **${s.id}.** 📻 **${s.name}** \`[${s.genre}]\``).join("\n");
      const content = [
        "### 📻 Canlı Radyo İstasyonları",
        `Aşağıdaki istasyonlardan dilediğinizi seçip \`${config?.prefix || "."}radyo oyna <No>\` komutu ile dinleyebilirsiniz:`,
        "",
        listStr,
        "",
        "-# 7/24 Canlı Radyo | Public Bot Ecosystem"
      ].join("\n");

      return message.reply({ content, embeds: [] });
    }

    if (sub === "oyna" || sub === "çal") {
      const stationId = parseInt(args[1], 10);
      const station = STATIONS.find((s) => s.id === stationId);

      if (!station) {
        return message.reply(
          MessageFormatter.warn(
            "Geçersiz İstasyon",
            `Lütfen listedeki geçerli bir istasyon numarası girin (1-5 arası).\n\n▫️ İstasyon listesi için: \`${config?.prefix || "."}radyo liste\``
          )
        );
      }

      const voiceChannel = message.member.voice?.channel;
      if (!voiceChannel) {
        return message.reply(
          MessageFormatter.warn(
            "Seste Değilsiniz",
            "Radyo başlatabilmek için lütfen öncelikle bir ses kanalına bağlanın."
          )
        );
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

      const content = [
        "### 📻 Canlı Radyo Başlatıldı",
        `▫️ **İstasyon:** **${station.name}** \`[${station.genre}]\``,
        `▫️ **Kanal:** ${voiceChannel}`,
        "",
        "Canlı radyo akışı başarıyla bağlandı. Keyifli dinlemeler!",
        "",
        "-# 7/24 Kesintisiz Radyo | Public Bot Ecosystem"
      ].join("\n");

      return message.reply({ content, embeds: [], components: [row] });
    }

    if (sub === "durdur" || sub === "kapat") {
      if (!client.activeRadio?.has(message.guild.id)) {
        return message.reply(
          MessageFormatter.warn(
            "Radyo Çalmıyor",
            "Bu sunucuda şu anda çalan bir radyo yayını bulunmuyor."
          )
        );
      }

      client.activeRadio.delete(message.guild.id);
      return message.reply(
        MessageFormatter.success(
          "Radyo Durduruldu",
          "Canlı radyo akışı başarıyla sonlandırıldı."
        )
      );
    }
  }
};
