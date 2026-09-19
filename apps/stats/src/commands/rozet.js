import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { Stat, Economy } from "@bot/database";
import { BadgeService } from "../services/BadgeService.js";

export default {
  name: "rozet",
  aliases: ["rozetler", "badge", "badges"],
  async execute({ client, message, args, config }) {
    const sub = args[0]?.toLowerCase();

    if (sub === "ver" || sub === "ekle") {
      if (!message.member.permissions.has("Administrator")) {
        return message.reply(MessageFormatter.error("Yetki Yetersiz", "Rozet tanımlamak için Yönetici yetkisi gereklidir."));
      }
      const targetMember = message.mentions.members.first()
        || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);
      const badgeId = args[2]?.toLowerCase();
      if (!targetMember || !badgeId) {
        return message.reply(MessageFormatter.warn("Eksik Parametre", "Kullanım: `.rozet ver @kullanici <rozetId>`"));
      }

      await BadgeService.awardBadge(message.guild.id, targetMember.id, badgeId);
      return message.reply(MessageFormatter.success(
        "Rozet Tanımlandı",
        `▫️ **Kullanıcı:** <@${targetMember.id}>\n▫️ **Tanımlanan Rozet:** \`${badgeId}\``
      ));
    }

    if (sub === "sil" || sub === "al") {
      if (!message.member.permissions.has("Administrator")) {
        return message.reply(MessageFormatter.error("Yetki Yetersiz", "Rozet almak için Yönetici yetkisi gereklidir."));
      }
      const targetMember = message.mentions.members.first()
        || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);
      const badgeId = args[2]?.toLowerCase();
      if (!targetMember || !badgeId) {
        return message.reply(MessageFormatter.warn("Eksik Parametre", "Kullanım: `.rozet sil @kullanici <rozetId>`"));
      }

      await BadgeService.removeBadge(message.guild.id, targetMember.id, badgeId);
      return message.reply(MessageFormatter.success(
        "Rozet Kaldırıldı",
        `▫️ **Kullanıcı:** <@${targetMember.id}>\n▫️ **Kaldırılan Rozet:** \`${badgeId}\``
      ));
    }

    if (sub === "sec" || sub === "aktif") {
      const selectedIds = args.slice(1).map((a) => a.toLowerCase().trim()).filter(Boolean);
      if (selectedIds.length === 0) {
        return message.reply(MessageFormatter.warn("Eksik Parametre", "Kullanım: `.rozet sec <rozetId1> [rozetId2] ...` (Maksimum 5 adet)"));
      }

      const stat = await BadgeService.setActiveBadges(message.guild.id, message.author.id, selectedIds);
      const activeNames = stat.activeBadges.map((id) => {
        const meta = BadgeService.getAllBadges(config).find((b) => b.id === id);
        return meta ? `${meta.emoji} ${meta.name}` : `\`${id}\``;
      }).join(", ") || "Seçim yapılmadı";

      return message.reply(MessageFormatter.success(
        "Kart Rozetleri Güncellendi",
        `▫️ Profil ve stat kartınızda sergilenecek rozetler:\n  ${activeNames}\n-# Artık .profil ve .stat kartlarınızda bu rozetler yer alacaktır.`
      ));
    }

    const stat = await Stat.findOne({ guildId: message.guild.id, userId: message.author.id })
      || await Stat.create({ guildId: message.guild.id, userId: message.author.id });
    const eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });

    const newlyEarned = await BadgeService.checkAndAwardBadges({
      guildId: message.guild.id,
      userId: message.author.id,
      stat,
      eco,
      config
    });

    const allBadges = BadgeService.getAllBadges(config);
    const userBadges = new Set(stat.badges || []);
    const activeSet = new Set(stat.activeBadges || []);

    const badgeLines = allBadges.map((b) => {
      const isOwned = userBadges.has(b.id);
      const isActive = activeSet.has(b.id);
      const tag = isOwned ? (isActive ? "⭐ **[KUŞANILDI]**" : "✅ **[AÇIK]**") : "🔒 *[KİLİTLİ]*";
      return `▫️ ${b.emoji} **${b.name}** (\`${b.id}\`) • ${tag}\n  └ *${b.desc}*`;
    });

    let headerNote = "";
    if (newlyEarned.length > 0) {
      headerNote = `🎉 **Tebrikler! ${newlyEarned.length} yeni başarım rozeti kazandınız:** ${newlyEarned.map((b) => `${b.emoji} ${b.name}`).join(", ")}\n\n`;
    }

    const content = [
      `### 🎖️ Rozet ve Başarım Koleksiyonu: ${message.author.username}`,
      `${headerNote}▫️ **Kullanıcı:** <@${message.author.id}>`,
      `▫️ **Kazanılan:** \`${userBadges.size} / ${allBadges.length} Rozet\``,
      `▫️ **Kuşanılan Rozetler:** ${stat.activeBadges?.length ? stat.activeBadges.map((id) => {
        const m = allBadges.find((b) => b.id === id);
        return m ? `${m.emoji} ${m.name}` : id;
      }).join(" ") : "Henüz seçilmedi"}`,
      "",
      `▫️ **Mevcut Rozetler Kataloğu:**`,
      badgeLines.join("\n"),
      "",
      `-# Kuşandığınız rozetleri değiştirmek için: \`.rozet sec <rozetId>\``
    ].join("\n");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`stats_user_period:${message.author.id}:all`)
        .setLabel("📊 İstatistikler")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`stats_level_view:${message.author.id}`)
        .setLabel("⭐ Seviye")
        .setStyle(ButtonStyle.Secondary)
    );

    const payload = MessageFormatter.v2(content, [row]);
    return message.reply(payload);
  }
};
