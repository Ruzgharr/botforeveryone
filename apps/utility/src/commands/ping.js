import { MessageFormatter } from "@bot/core";
import mongoose from "mongoose";
import { UtilityUI } from "../services/UtilityUI.js";

export default {
  name: "ping",
  aliases: ["gecikme", "latency"],
  async execute({ client, message, args, config }) {
    const wsPing = Math.round(client.ws.ping);
    const startMsg = Date.now();
    const sent = await message.reply(MessageFormatter.info("Gecikme Ölçülüyor...", "Lütfen bekleyin, sistem yanıt süreleri hesaplanıyor."));
    const msgPing = Date.now() - startMsg;

    const dbStart = Date.now();
    await mongoose.connection.db?.admin().ping().catch(() => null);
    const dbPing = Date.now() - dbStart;

    const uptimeSeconds = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    const statusText = wsPing < 150 ? "🟢 Mükemmel" : wsPing < 300 ? "🟡 Normal" : "🔴 Yüksek Gecikme";

    const payload = UtilityUI.formatPingPayload({
      wsPing,
      msgPing,
      dbPing,
      hours,
      minutes,
      statusText
    });

    await sent.edit(payload);
  }
};

