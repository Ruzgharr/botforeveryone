import { Embeds } from "@bot/core";
import mongoose from "mongoose";

export default {
  name: "ping",
  aliases: ["gecikme", "latency"],
  async execute({ client, message, args, config }) {
    const wsPing = Math.round(client.ws.ping);
    const startMsg = Date.now();
    const sent = await message.reply({ embeds: [Embeds.info("Gecikme Ölçülüyor...", "Lütfen bekleyin, sistem yanıt süreleri hesaplanıyor.", message.guild)] });
    const msgPing = Date.now() - startMsg;

    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping().catch(() => null);
    const dbPing = Date.now() - dbStart;

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    const description = [
      `• **WebSocket Gecikmesi:** \`${wsPing} ms\``,
      `• **Mesaj Gönderme Yanıtı:** \`${msgPing} ms\``,
      `• **Veritabanı Yanıtı:** \`${dbPing} ms\``,
      `• **Bot Çalışma Süresi:** \`${hours} saat ${minutes} dakika\``,
      `• **Sistem Durumu:** ${wsPing < 150 ? "🟢 Mükemmel" : wsPing < 300 ? "🟡 Normal" : "🔴 Yüksek Gecikme"}`
    ].join("\n");

    sent.edit({
      embeds: [Embeds.success("Sistem Gecikme Raporu", description, message.guild)]
    });
  }
};
