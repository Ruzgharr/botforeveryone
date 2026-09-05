import { Embeds } from "@bot/core";
import { Backup } from "@bot/database";

export default {
  name: "korumabilgi",
  aliases: ["guard", "koruma", "guvenlik", "guvenlikbilgi"],
  async execute({ message, config }) {
    const isOwner = message.guild.ownerId === message.author.id;
    if (!isOwner && !message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Güvenlik durumunu görüntülemek için Yönetici yetkisine sahip olmalısınız.", message.guild)] });
    }

    const guardActive = config.guard?.active !== false;
    const panicActive = config.guardPanic?.enabled !== false;
    const blockBots = config.guard?.blockBots !== false;
    const blockWebhooks = config.guard?.blockWebhooks !== false;
    const permAudit = config.permissionAudit?.enabled !== false;

    const safeUsersCount = (config.guard?.safeUsers || []).length;
    const safeRolesCount = (config.guard?.safeRoles || []).length;
    const safeBotsCount = (config.guard?.safeBots || []).length;

    const latestBackup = await Backup.findOne({ guildId: message.guild.id }).sort({ createdAt: -1 });
    let backupInfo = "Henüz yedek alınmamış.";
    if (latestBackup) {
      const bTime = `<t:${Math.floor(new Date(latestBackup.createdAt).getTime() / 1000)}:R>`;
      backupInfo = `• Son Yedek: ${bTime}\n• Tür: **${latestBackup.type}**\n• ID: \`${latestBackup._id.toString()}\``;
    }

    const embed = Embeds.base("🛡️ Sunucu Güvenlik ve Koruma Durumu", null, message.guild)
      .addFields(
        { name: "Guard Ana Kalkanı", value: guardActive ? "🟢 **Aktif**" : "🔴 **Devre Dışı**", inline: true },
        { name: "Otomatik Panik Modu", value: panicActive ? `🟢 **Aktif** (${config.guardPanic?.threshold || 5} işlem / ${(config.guardPanic?.timeWindowMs || 5000) / 1000}s)` : "🔴 **Devre Dışı**", inline: true },
        { name: "Yetki Denetçisi", value: permAudit ? "🟢 **Aktif**" : "🔴 **Devre Dışı**", inline: true },
        { name: "Bot Giriş Engeli", value: blockBots ? "🔒 **Açık (İzinsiz Bot Engellenir)**" : "🔓 **Kapalı**", inline: true },
        { name: "Webhook Engeli", value: blockWebhooks ? "🔒 **Açık (İzinsiz Webhook Silinir)**" : "🔓 **Kapalı**", inline: true },
        { name: "Güvenli Beyaz Liste", value: `• Üyeler: **${safeUsersCount}**\n• Roller: **${safeRolesCount}**\n• Botlar: **${safeBotsCount}**`, inline: true },
        { name: "Sunucu Yedek Durumu", value: backupInfo, inline: false }
      )
      .setFooter({ text: "Guard Koruma Sistemi | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.reply({ embeds: [embed] });
  }
};
