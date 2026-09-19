import { Penalty } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { ModerationUI } from "../services/ModerationUI.js";

export default {
  name: "uyarilar",
  aliases: ["warns", "uyarılar", "uyarilistesi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Uyarı listesini görüntülemek için yetkiniz bulunmuyor."));
    }

    const targetUser = message.mentions.members.first()
      || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : message.member);

    if (!targetUser) {
      return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen uyarıları incelenecek üyeyi belirtin."));
    }

    const warns = await Penalty.find({
      guildId: message.guild.id,
      userId: targetUser.id,
      type: "WARN"
    }).sort({ createdAt: -1 });

    if (!warns || warns.length === 0) {
      const payload = MessageFormatter.info("Uyarı Bulunamadı", `${targetUser} kullanıcısına ait herhangi bir kayıtlı uyarı bulunmuyor.`);
      payload.components = [ModerationUI.buildWarnActionRow(targetUser.id, false)];
      return message.reply(payload);
    }

    const activeWarns = warns.filter((w) => w.active);
    const lines = warns.slice(0, 10).map((w) => {
      const timeStr = `<t:${Math.floor(new Date(w.createdAt).getTime() / 1000)}:d>`;
      const status = w.active ? "🔴 Aktif" : "⚪ Kaldırıldı";
      return `▫️ **#${w.caseId}** (${timeStr}) [${status}] • <@${w.executorId}>: *${w.reason}*`;
    }).join("\n");

    const payload = MessageFormatter.info(
      `Uyarı Geçmişi: ${targetUser.displayName}`,
      `Toplam **${warns.length} adet** uyarı (**${activeWarns.length} aktif**):\n\n${lines}\n-# Uyarı Takip Sistemi | Public Bot Ecosystem`
    );
    payload.components = [ModerationUI.buildWarnActionRow(targetUser.id, activeWarns.length > 0)];

    message.reply(payload);
  }
};
