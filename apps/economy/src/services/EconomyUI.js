import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

export class EconomyUI {
  static formatCoinPayload({ targetUser, profile, mediaUrl = null }) {
    const wallet = profile?.wallet || 0;
    const bank = profile?.bank || 0;
    const total = wallet + bank;

    const content = `### 💳 Bakiye & Finansal Durum: ${targetUser.tag || targetUser.username}\n▫️ **Hesap Sahibi:** <@${targetUser.id}> (\`${targetUser.id}\`)\n▫️ 👛 **Cüzdan (Nakit):** \`${wallet.toLocaleString("tr-TR")} Coin\`\n▫️ 🏦 **Banka Hesabı:** \`${bank.toLocaleString("tr-TR")} Coin\`\n▫️ 💎 **Toplam Varlık:** \`${total.toLocaleString("tr-TR")} Coin\`\n-# Public Bot Ecosystem Finans Altyapısı`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("eco_coin_work")
        .setLabel("💼 Çalış")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("eco_coin_daily")
        .setLabel("🎁 Günlük Al")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("eco_top_view")
        .setLabel("🏆 Sıralama")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`eco_coin_refresh:${targetUser.id}`)
        .setLabel("🔄 Yenile")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`eco_coin_anim:${targetUser.id}`)
        .setLabel("🎬 Canlı Kart")
        .setStyle(ButtonStyle.Primary)
    );

    return MessageFormatter.v2(content, [row], false, mediaUrl);
  }

  static formatTopCoinPayload({ guild, enriched = [], mediaUrl = null }) {
    const medals = ["🥇", "🥈", "🥉", "4.", "5.", "6.", "7.", "8.", "9.", "10."];

    const lines = enriched.map((item, idx) => {
      const badge = medals[idx] || `${idx + 1}.`;
      return `▫️ ${badge} <@${item.userId}> • **${item.total.toLocaleString("tr-TR")} Coin**`;
    }).join("\n") || "Henüz bakiye verisi bulunmuyor.";

    const content = `### 🏆 Sunucu En Zenginleri: ${guild.name}\nSunucunun en yüksek toplam varlığına sahip ilk 10 üyesi:\n\n${lines}\n-# Toplam varlığa Nakit Cüzdan ve Banka dahildir.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("eco_coin_my_balance")
        .setLabel("👛 Kendi Bakiyem")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("eco_top_refresh")
        .setLabel("🔄 Sıralamayı Yenile")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row], false, mediaUrl);
  }

  static formatBlackjackTablePayload({ bet, playerCards, playerTotal, dealerCards, isFinished = false, resultText = "" }) {
    const dealerShow = isFinished ? dealerCards.join(" • ") : `${dealerCards[0]} • ❓`;
    const playerShow = playerCards.join(" • ");

    let footer = "-# Devam etmek için aşağıdaki butonları kullanın.";
    let statusLine = "";
    if (isFinished) {
      footer = "-# Oyun sona erdi.";
      statusLine = `\n▫️ **Sonuç:** ${resultText}\n`;
    }

    const content = `### 🃏 21 (Blackjack) Masası\n▫️ **Bahis:** \`${bet.toLocaleString("tr-TR")} Coin\`\n▫️ **Krupiye Eli:** \`${dealerShow}\`\n▫️ **Sizin Eliniz:** \`${playerShow}\` (Toplam: **${playerTotal}**)${statusLine}\n${footer}`;

    if (isFinished) {
      return MessageFormatter.v2(content, []);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("bj_hit")
        .setLabel("Kart Çek")
        .setEmoji("🃏")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("bj_stand")
        .setLabel("Kal")
        .setEmoji("🛑")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatDailySuccessPayload({ targetUser, reward, balance }) {
    const content = `### 🎁 Günlük Ödül Alındı\n▫️ **Kullanıcı:** <@${targetUser.id}>\n▫️ **Kazanılan Miktar:** \`+${reward.toLocaleString("tr-TR")} Coin\`\n▫️ **Yeni Cüzdan Bakiyesi:** \`${balance.toLocaleString("tr-TR")} Coin\`\n-# Her 24 saatte bir tekrar günlük ödülünüzü alabilirsiniz.`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`eco_coin_refresh:${targetUser.id}`)
        .setLabel("👛 Cüzdanı Gör")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("eco_coin_work")
        .setLabel("💼 Şimdi Çalış")
        .setStyle(ButtonStyle.Success)
    );

    return MessageFormatter.v2(content, [row]);
  }
}
