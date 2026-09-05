import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Embeds } from "@bot/core";

export default {
  name: "cekilis",
  aliases: ["giveaway", "lottery"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Çekiliş başlatmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const durationStr = args[0];
    const winnersCount = parseInt(args[1], 10) || 1;
    const prize = args.slice(2).join(" ");

    if (!durationStr || !prize) {
      return message.reply({ embeds: [Embeds.warn("Hatalı Kullanım", "Lütfen süreyi ve ödülü belirtin. Örnek: `.cekilis 30s 1 Nitro Classic`", message.guild)] });
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

    const embed = Embeds.info(
      `🎉 ÇEKİLİŞ: ${prize}`,
      `Aşağıdaki butona tıklayarak çekilişe katılabilirsiniz!\n\n` +
      `• **Ödül:** ${prize}\n` +
      `• **Kazanan Sayısı:** ${winnersCount}\n` +
      `• **Bitiş Zamanı:** <t:${endTimestamp}:R>\n` +
      `• **Başlatan:** ${message.author}`,
      message.guild
    );

    const giveawayMsg = await message.channel.send({ embeds: [embed], components: [row] });

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
        return message.channel.send({
          embeds: [Embeds.warn("Çekiliş Sona Erdi", `**Ödül:** ${prize}\nYeterli katılım olmadığı için kazanan belirlenemedi.`, message.guild)]
        });
      }

      const shuffled = candidates.sort(() => Math.random() - 0.5);
      const winners = shuffled.slice(0, Math.min(winnersCount, shuffled.length)).map((id) => `<@${id}>`);

      const winEmbed = Embeds.success(
        "🎉 Çekiliş Sonuçlandı!",
        `**Ödül:** ${prize}\n**Kazananlar:** ${winners.join(", ")}\n\nTebrikler! Lütfen yetkililerle iletişime geçin.`,
        message.guild
      );

      await giveawayMsg.edit({ components: [] }).catch(() => null);
      const gData = client.giveaways?.get(giveawayMsg.id);
      if (gData) {
        gData.ended = true;
        gData.lastWinners = winners;
      }
      message.channel.send({ content: winners.join(" "), embeds: [winEmbed] });
    });
  }
};
