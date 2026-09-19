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

    const themes = VisualCard.getThemesList();
    console.log("Toplam tema sayisi: " + themes.length);

    await channel.send({
      content: "🎬 **TÜM ANİME ARKA PLANLARI : CANLI HAREKETLİ VİDEO & GİF KOLEKSİYONU**\n▫️ 16 temanın tamamı özel parçacık ve hareketli anime efektleriyle otomatik oynayan GIF formatında aşağıda sunulmaktadır.\n▫️ Kullanım: `.stat video <tema>` veya `.tema video <tema>`"
    });

    for (let i = 0; i < themes.length; i++) {
      const t = themes[i];
      console.log(`[${i + 1}/${themes.length}] Render ediliyor: ${t.id} (${t.name})...`);

      const gifBuffer = await VisualCard.renderAnimatedUserStatCard({
        user,
        periodText: t.name,
        voiceHours: 42 + i * 3,
        messageCount: 1250 + i * 85,
        level: 18 + i,
        rank: i + 1,
        theme: t.id,
        format: "gif"
      });

      const gifAttachment = new AttachmentBuilder(gifBuffer, { name: `stat-${t.id}-animated.gif` });

      await channel.send({
        content: `✨ **[${i + 1}/${themes.length}] ${t.name}** ${t.badge}\n▫️ **Tema Efekti:** ${t.desc}\n▫️ **Fiyat:** ${t.price.toLocaleString("tr-TR")} Coin | **Koleksiyon:** ${t.set.toUpperCase()}\n▫️ **Canlı Komut:** \`.stat video ${t.id}\` | **Satın Al:** \`.satınal tema_${t.id}\``,
        files: [gifAttachment]
      });

      console.log(`Gonderildi: ${t.id}`);
      await new Promise(r => setTimeout(r, 1200));
    }

    console.log("Tum 16 canli hareketli tema basariyla iletildi!");
    process.exit(0);
  } catch (err) {
    console.error("Hata olustu:", err);
    process.exit(1);
  }
});

client.login(environment.tokens.stats);
