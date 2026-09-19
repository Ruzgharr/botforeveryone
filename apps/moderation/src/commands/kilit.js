import { MessageFormatter } from "@bot/core";
import { PermissionFlagsBits } from "discord.js";
import { parseDuration } from "../services/PenaltyWatcher.js";
import { ModerationUI } from "../services/ModerationUI.js";

export default {
  name: "kilit",
  aliases: ["lock", "kilitle", "kilitac", "unlock", "otokilit"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const durationMs = parseDuration(args[0]);

    if (durationMs) {
      await message.channel.permissionOverwrites.edit(message.guild.id, {
        SendMessages: false
      }).catch(() => null);

      const unlockTs = Math.floor((Date.now() + durationMs) / 1000);
      const payload = MessageFormatter.render("lockChannel", {
        staff: message.author,
        duration: `${args[0]} (Otomatik Açılış: <t:${unlockTs}:R>)`,
        title: "Kanal Süreli Kilitlendi"
      }, config, message.guild);
      payload.components = [ModerationUI.buildLockActionRow(true)];
      message.reply(payload);

      setTimeout(async () => {
        const check = message.channel.permissionOverwrites.cache.get(message.guild.id);
        if (check?.deny.has(PermissionFlagsBits.SendMessages)) {
          await message.channel.permissionOverwrites.edit(message.guild.id, {
            SendMessages: null
          }).catch(() => null);

          const unlockPayload = MessageFormatter.render("unlockChannel", {
            title: "Süre Sona Erdi - Kanal Açıldı"
          }, config, message.guild);
          unlockPayload.components = [ModerationUI.buildLockActionRow(false)];
          message.channel.send(unlockPayload).catch(() => null);
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

      const payload = MessageFormatter.render("unlockChannel", {
        title: "Kanal Kilidi Açıldı"
      }, config, message.guild);
      payload.components = [ModerationUI.buildLockActionRow(false)];
      message.reply(payload);
    } else {
      await message.channel.permissionOverwrites.edit(message.guild.id, {
        SendMessages: false
      }).catch(() => null);

      const payload = MessageFormatter.render("lockChannel", {
        staff: message.author,
        duration: "Süresiz (Manuel)",
        title: "Kanal Kilitlendi"
      }, config, message.guild);
      payload.components = [ModerationUI.buildLockActionRow(true)];
      message.reply(payload);
    }
  }
};
