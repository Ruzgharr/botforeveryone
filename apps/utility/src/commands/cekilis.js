import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

export default {
  name: "cekilis",
  aliases: ["giveaway", "lottery"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Çekiliş başlatmak için yetkiniz bulunmuyor."));
    }

    const durationStr = args[0];
    const winnersCount = parseInt(args[1], 10) || 1;
    const prize = args.slice(2).join(" ");

    if (!durationStr || !prize) {
      return message.reply(MessageFormatter.warn(
        "Hatalı Kullanım",
        `Lütfen süreyi ve ödülü belirtin.\n\n▫️ Örnek: \`${config.prefix || "."}cekilis 30s 1 Nitro Classic\``
      ));
    }

    let durationMs = 30000;
    if (durationStr.endsWith("s")) durationMs = parseInt(durationStr, 10) * 1000;
    else if (durationStr.endsWith("m")) durationMs = parseInt(durationStr, 10) * 60 * 1000;
    else if (durationStr.endsWith("h")) durationMs = parseInt(durationStr, 10) * 60 * 60 * 1000;

    const participants = new Set();
    const endTimestamp = Math.floor((Date.now() + durationMs) / 1000);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("giveaway_join").setLabel("Katıl (0)").setEmoji("🎉").setStyle(ButtonStyle.Primary)
    );

    const content = [
      `### 🎉 ÇEKİLİŞ: ${prize}`,
      `Aşağıdaki butona tıklayarak çekilişe katılabilirsiniz!`,
      "",
      `▫️ **Ödül:** ${prize}`,
      `▫️ **Kazanan Sayısı:** ${winnersCount}`,
      `▫️ **Bitiş Zamanı:** <t:${endTimestamp}:R>`,
      `▫️ **Başlatan:** ${message.author}`,
      "",
      `-# Bol şanslar dileriz!`
    ].join("\n");

    const giveawayMsg = await message.channel.send({ content, embeds: [], components: [row] });

    if (!client.giveaways) {
      client.giveaways = new Map();
    }
    client.giveaways.set(giveawayMsg.id, {
      guildId: message.guild.id,
      channelId: message.channel.id,
      messageId: giveawayMsg.id,
      prize,
      winnersCount,
      participants,
      endTimestamp,
      ended: false
    });

    const collector = giveawayMsg.createMessageComponentCollector({
      filter: (i) => i.customId === "giveaway_join",
      time: durationMs
    });

    collector.on("collect", async (interaction) => {
      if (participants.has(interaction.user.id)) {
        participants.delete(interaction.user.id);
        await interaction.reply({ content: "Çekilişten ayrıldınız.", ephemeral: true });
      } else {
        participants.add(interaction.user.id);
        await interaction.reply({ content: "Çekilişe başarıyla katıldınız!", ephemeral: true });
      }

      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("giveaway_join").setLabel(`Katıl (${participants.size})`).setEmoji("🎉").setStyle(ButtonStyle.Primary)
      );

      await giveawayMsg.edit({ components: [updatedRow] }).catch(() => null);
    });

    collector.on("end", async () => {
      const candidates = Array.from(participants);
      if (candidates.length === 0) {
        return message.channel.send(MessageFormatter.warn(
          "Çekiliş Sona Erdi",
          `▫️ **Ödül:** ${prize}\n▫️ Yeterli katılım olmadığı için kazanan belirlenemedi.`
        ));
      }

      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, Math.min(winnersCount, shuffled.length)).map((id) => `<@${id}>`);

      const winContent = [
        `### 🎉 Çekiliş Sonuçlandı!`,
        `▫️ **Ödül:** ${prize}`,
        `▫️ **Kazananlar:** ${winners.join(", ")}`,
        "",
        `Tebrikler! Lütfen ödülünüz için yetkililerle iletişime geçin.`,
        "",
        `-# Çekiliş Sistemi | Public Bot Ecosystem`
      ].join("\n");

      await giveawayMsg.edit({ components: [] }).catch(() => null);
      const gData = client.giveaways?.get(giveawayMsg.id);
      if (gData) {
        gData.ended = true;
        gData.lastWinners = winners;
      }
      message.channel.send({ content: `${winners.join(" ")}\n\n${winContent}`, embeds: [], components: [] });
    });
  }
};

