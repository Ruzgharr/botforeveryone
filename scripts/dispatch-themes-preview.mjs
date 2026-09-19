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
    console.log("Hedef kullanici bulundu: " + user.tag + " (" + user.id + ")");

    const themes = VisualCard.getThemesList();
    console.log("Toplam " + themes.length + " tema gonderilecek...");

    await channel.send({
      content: "🎨 **16+ Ozel Anime & Grafik Kart Temalari Onizleme Katalogu**\n▫️ **Kullanici:** <@" + user.id + "> (" + user.tag + ")\n▫️ Toplam **" + themes.length + "** adet tema olusturuldu.\n▫️ Temanizi degistirmek icin: `.tema <tema-adi>` komutunu kullanabilirsiniz."
    });

    for (let i = 0; i < themes.length; i++) {
      const t = themes[i];
      console.log("[" + (i + 1) + "/" + themes.length + "] Tema ciziliyor: " + t.name + " (" + t.id + ")...");

      const cardBuffer = await VisualCard.renderUserStatCard({
        user,
        periodText: t.name + " Onizleme",
        voiceHours: 42,
        messageCount: 1250,
        level: 18,
        rank: 1,
        theme: t.id
      });

      const attachment = new AttachmentBuilder(cardBuffer, { name: "theme-" + t.id + ".png" });

      await channel.send({
        content: "🖼️ **Tema " + (i + 1) + "/" + themes.length + " : " + t.name + "** " + t.badge + "\n▫️ Komut: `.tema " + t.id + "`",
        files: [attachment]
      });

      await new Promise(r => setTimeout(r, 600));
    }

    console.log("Tum temalar basariyla Discord kanalina iletildi!");
    process.exit(0);
  } catch (err) {
    console.error("Hata olustu:", err);
    process.exit(1);
  }
});

client.login(environment.tokens.stats);
