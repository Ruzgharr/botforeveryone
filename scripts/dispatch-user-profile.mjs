import { Client, GatewayIntentBits, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { environment, getActiveDatabaseUri } from "@bot/config";
import { connectDatabase, Stat, Economy } from "@bot/database";
import { VisualCard } from "@bot/core";

const TARGET_CHANNEL_ID = "1546256303230292069";
const TARGET_USER_ID = "1261311189577896027";

await connectDatabase(getActiveDatabaseUri());

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers
  ]
});

client.once("clientReady", async () => {
  console.log("Bot hazir: " + client.user.tag);
  try {
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID);
    if (!channel) {
      console.error("Kanal bulunamadi:", TARGET_CHANNEL_ID);
      process.exit(1);
    }

    const guild = channel.guild;
    const member = await guild.members.fetch(TARGET_USER_ID).catch(() => null);
    const user = member ? member.user : await client.users.fetch(TARGET_USER_ID);
    console.log("Kullanici bulundu: " + user.tag);

    const stat = await Stat.findOne({ guildId: guild.id, userId: user.id });
    const eco = await Economy.findOne({ guildId: guild.id, userId: user.id });

    const currentLvl = stat?.level || 1;
    const currentXp = stat?.xp || 0;
    const currentMsgs = stat?.totalMessages || 0;
    const voiceHours = Math.round((stat?.totalVoiceMs || 0) / (1000 * 60 * 60));
    const wallet = eco?.wallet || 0;
    const bank = eco?.bank || 0;
    const totalCoin = wallet + bank;

    console.log("Canli hareketli GIF ve MP4 Sakura kartlari render ediliyor...");

    const gifBuffer = await VisualCard.renderAnimatedUserStatCard({
      user,
      periodText: "Genel Profil",
      voiceHours,
      messageCount: currentMsgs,
      level: currentLvl,
      rank: 1,
      theme: "sakura",
      format: "gif"
    });

    const mp4Buffer = await VisualCard.renderAnimatedUserStatCard({
      user,
      periodText: "Genel Profil",
      voiceHours,
      messageCount: currentMsgs,
      level: currentLvl,
      rank: 1,
      theme: "sakura",
      format: "mp4"
    });

    const gifAttachment = new AttachmentBuilder(gifBuffer, { name: "profil-sakura-motion.gif" });
    const mp4Attachment = new AttachmentBuilder(mp4Buffer, { name: "profil-sakura-video.mp4" });

    const joinedTs = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
    const createdTs = Math.floor(user.createdTimestamp / 1000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_user_period:${user.id}:all`)
        .setLabel("Genel")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`stats_level_view:${user.id}`)
        .setLabel("⭐ Seviye Detayı")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`util_view_avatar:${user.id}`)
        .setLabel("👤 Profil Fotoğrafı")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`stats_anim_view:${user.id}`)
        .setLabel("🌸 Sakura Motion")
        .setStyle(ButtonStyle.Success)
    );

    const profileText = [
      `### 🌸 Kullanıcı Profili ve Canlı İstatistik: **${user.username}**`,
      `▫️ **Kullanıcı:** <@${user.id}> (\`${user.id}\`)`,
      `▫️ **Aktif Kart Teması:** 🌸 **Sakura Motion Edition** (15 FPS Canlı Anime Animasyonu)`,
      `▫️ **Mevcut Seviye:** Seviye **${currentLvl}** (\`${currentXp.toLocaleString("tr-TR")} XP\`)`,
      `▫️ **Toplam Mesaj:** \`${currentMsgs.toLocaleString("tr-TR")} mesaj\``,
      `▫️ **Ses Süresi:** \`${voiceHours} saat\``,
      `▫️ **Ekonomi Bakiyesi:** \`${wallet.toLocaleString("tr-TR")} Cüzdan\` | \`${totalCoin.toLocaleString("tr-TR")} Toplam Coin\``,
      `▫️ **Hesap Kuruluşu:** <t:${createdTs}:D> (<t:${createdTs}:R>)`,
      joinedTs ? `▫️ **Sunucuya Katılış:** <t:${joinedTs}:D> (<t:${joinedTs}:R>)` : "",
      "",
      `-# ✨ Otomatik oynayan Canlı GIF ve MP4 Video kartı aşağıda iletilmiştir.`
    ].filter(Boolean).join("\n");

    await channel.send({
      content: profileText,
      components: [row],
      files: [gifAttachment, mp4Attachment]
    });

    console.log("Profil ve videolu Sakura karti basariyla gonderildi!");
    process.exit(0);
  } catch (err) {
    console.error("Hata:", err);
    process.exit(1);
  }
});

client.login(environment.tokens.stats);
