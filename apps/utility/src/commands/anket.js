import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Embeds } from "@bot/core";

export default {
  name: "anket",
  aliases: ["poll", "oylama"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Oylama veya anket başlatmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const rawInput = args.join(" ").trim();
    if (!rawInput) {
      return message.reply({
        embeds: [Embeds.warn("Hatalı Kullanım", "Lütfen bir soru veya seçenekli bir anket girin.\n\n**Örnekler:**\n`.anket Bu akşam etkinlik yapalım mı?`\n`.anket Hangi oyunu oynayalım? | Valorant | League of Legends | CS2`", message.guild)]
      });
    }

    const parts = rawInput.split("|").map((s) => s.trim()).filter(Boolean);
    const question = parts[0];
    const customOptions = parts.slice(1, 6);

    let options = [];
    let buttons = [];

    if (customOptions.length >= 2) {
      const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"];
      options = customOptions.map((opt, idx) => ({
        label: opt,
        emoji: emojis[idx] || "🔹",
        votes: new Set()
      }));

      const row = new ActionRowBuilder();
      options.forEach((opt, idx) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_opt_${idx}`)
            .setLabel(`${opt.label} (0)`)
            .setEmoji(opt.emoji)
            .setStyle(ButtonStyle.Secondary)
        );
      });
      buttons.push(row);
    } else {
      options = [
        { label: "Evet", emoji: "👍", votes: new Set() },
        { label: "Hayır", emoji: "👎", votes: new Set() }
      ];

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("poll_opt_0")
          .setLabel("Evet (0)")
          .setEmoji("👍")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("poll_opt_1")
          .setLabel("Hayır (0)")
          .setEmoji("👎")
          .setStyle(ButtonStyle.Danger)
      );
      buttons.push(row);
    }

    const embed = Embeds.info("📊 SUNUCU ANKETİ & OYLAMA", `**Soru:** ${question}\n\nAşağıdaki butonlara tıklayarak oyunuzu kullanabilirsiniz. Her üye tek bir oy hakkına sahiptir.`, message.guild)
      .setFooter({ text: `Oylamayı Başlatan: ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

    const pollMessage = await message.channel.send({ embeds: [embed], components: buttons });

    if (!client.activePolls) {
      client.activePolls = new Map();
    }

    client.activePolls.set(pollMessage.id, {
      messageId: pollMessage.id,
      guildId: message.guild.id,
      channelId: message.channel.id,
      question,
      options,
      voters: new Map()
    });
  }
};
