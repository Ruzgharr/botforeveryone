import { SlashCommandBuilder } from "discord.js";
import { Stat } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  data: new SlashCommandBuilder()
    .setName("grafik")
    .setDescription("Sunucunun en aktif kanal istatistiklerini gösterir.")
    .addIntegerOption((opt) =>
      opt.setName("limit").setDescription("Kac kanal gosterilsin? (1-15)").setMinValue(1).setMaxValue(15).setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const limit = interaction.options.getInteger("limit") || 10;

    const stats = await Stat.find({ guildId: interaction.guild.id });

    const channelTotals = new Map();

    for (const s of stats) {
      if (s.channelMessages instanceof Map) {
        for (const [chId, count] of s.channelMessages.entries()) {
          channelTotals.set(chId, (channelTotals.get(chId) || 0) + count);
        }
      } else if (s.channelMessages && typeof s.channelMessages === "object") {
        for (const [chId, count] of Object.entries(s.channelMessages)) {
          channelTotals.set(chId, (channelTotals.get(chId) || 0) + count);
        }
      }
    }

    const sorted = [...channelTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    if (sorted.length === 0) {
      return interaction.editReply({ content: "Henuz kanal istatistigi bulunmuyor." });
    }

    const maxCount = sorted[0][1];
    const lines = sorted.map(([chId, count], idx) => {
      const barLength = Math.round((count / maxCount) * 20);
      const bar = String.fromCodePoint(0x2588).repeat(barLength) + String.fromCodePoint(0x2591).repeat(20 - barLength);
      return `**${idx + 1}.** <#${chId}>\n\`${bar}\` **${count.toLocaleString("tr-TR")}** mesaj`;
    });

    const embed = Embeds.info(
      `En Aktif ${sorted.length} Kanal`,
      lines.join("\n\n"),
      interaction.guild
    );

    return interaction.editReply({ embeds: [embed] });
  }
};
