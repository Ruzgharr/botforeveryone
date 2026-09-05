import { Embeds } from "@bot/core";
import { PermissionFlagsBits } from "discord.js";
import { parseDuration } from "../services/PenaltyWatcher.js";

export default {
  name: "kilit",
  aliases: ["lock", "kilitle", "kilitac", "unlock", "otokilit"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const durationMs = parseDuration(args[0]);

    if (durationMs) {
      await message.channel.permissionOverwrites.edit(message.guild.id, {
        SendMessages: false
      }).catch(() => null);

      const unlockTs = Math.floor((Date.now() + durationMs) / 1000);
      message.reply({
        embeds: [Embeds.warn(
          "Kanal Süreli Kilitlendi",
          `Bu kanal yetkililer haricindeki üyelerin yazmasına kapatıldı.\n\n• **Kilit Süresi:** ${args[0]}\n• **Otomatik Açılış:** <t:${unlockTs}:R>`,
          message.guild
        )]
      });

      setTimeout(async () => {
        const check = message.channel.permissionOverwrites.cache.get(message.guild.id);
        if (check?.deny.has(PermissionFlagsBits.SendMessages)) {
          await message.channel.permissionOverwrites.edit(message.guild.id, {
            SendMessages: null
          }).catch(() => null);

          message.channel.send({
            embeds: [Embeds.success("Süre Sona Erdi", "Kanal kilit süresi doldu ve sohbet kanalı tekrar tüm üyelere açıldı.", message.guild)]
          }).catch(() => null);
        }
      }, durationMs);
      return;
    }

    const currentOverwrites = message.channel.permissionOverwrites.cache.get(message.guild.id);
    const isLocked = currentOverwrites?.deny.has(PermissionFlagsBits.SendMessages);

    if (isLocked) {
      await message.channel.permissionOverwrites.edit(message.guild.id, {
        SendMessages: null
      }).catch(() => null);

      message.reply({ embeds: [Embeds.success("Kanal Kilidi Açıldı", "Bu kanal tüm üyelerin mesaj yazabilmesi için tekrar açıldı.", message.guild)] });
    } else {
      await message.channel.permissionOverwrites.edit(message.guild.id, {
        SendMessages: false
      }).catch(() => null);

      message.reply({ embeds: [Embeds.warn("Kanal Kilitlendi", "Bu kanal yetkililer haricindeki üyelerin mesaj yazmasına kapatıldı.", message.guild)] });
    }
  }
};
