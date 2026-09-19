import { Client, GatewayIntentBits, AttachmentBuilder } from "discord.js";
import { environment } from "@bot/config";
import { VisualCard } from "@bot/core";

const TARGET_CHANNEL_ID = "1546256303230292069";
const TARGET_USER_ID = "1261311189577896027";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

client.once("ready", async () => {
  console.log("Bot hazir: " + client.user.tag);
  try {
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!channel) {
      console.error("Kanal bulunamadi:", TARGET_CHANNEL_ID);
      process.exit(1);
    }

    const user = await client.users.fetch(TARGET_USER_ID);
    console.log("Kullanici bulundu: " + user.tag);

    console.log("Canli hareketli GIF stat karti render ediliyor...");
    const gifBuffer = await VisualCard.renderAnimatedUserStatCard({
      user,
      periodText: "Otomatik Oynayan GIF",
      voiceHours: 42,
      messageCount: 1250,
      level: 18,
      rank: 1,
      theme: "sakura",
      format: "gif"
    });

    const gifAttachment = new AttachmentBuilder(gifBuffer, { name: "stat-card-animated.gif" });

    await channel.send({
      content: "✨ **Canlı Otomatik Oynayan Hareketli Stat Kartı (Animated GIF)**\n▫️ **Kullanıcı:** <@" + user.id + "> (" + user.tag + ")\n▫️ **Tema:** 🌸 Sakura Motion Edition\n▫️ Discord'a düştüğü anda tıklama gerektirmeden otomatik ve sonsuz döngüde oynar!\n▫️ Komut: `.stat video` veya butondan `📹 Hareketli`",
      files: [gifAttachment]
    });

    console.log("Hareketli GIF kart Discord kanalina iletildi!");

    console.log("Yeni anime arkaplanli kartlardan secme ornekler gonderiliyor...");
    const sampleThemes = ["cyberpunk", "starry-sky", "ghibli-forest", "midnight-moon", "blood-moon"];

    for (const themeId of sampleThemes) {
      const t = VisualCard.getTheme(themeId);
      const cardBuffer = await VisualCard.renderUserStatCard({
        user,
        periodText: t.name + " Arka Plan",
        voiceHours: 42,
        messageCount: 1250,
        level: 18,
        rank: 1,
        theme: themeId
      });

      const cardAttachment = new AttachmentBuilder(cardBuffer, { name: "theme-" + themeId + ".png" });
      await channel.send({
        content: "🖼️ **Yeni 8K Anime Görsel Arka Planı : " + t.name + "** " + t.badge + "\n▫️ Fiyat: **" + t.price.toLocaleString("tr-TR") + " Coin** | Kod: \`.satınal tema_" + themeId + "\`",
        files: [cardAttachment]
      });

      await new Promise(r => setTimeout(r, 600));
    }

    console.log("Tum ornekler basariyla gonderildi!");
    process.exit(0);
  } catch (err) {
    console.error("Hata olustu:", err);
    process.exit(1);
  }
});

client.login(environment.tokens.stats);
