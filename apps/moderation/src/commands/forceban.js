import { ForceBan, Penalty } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "forceban",
  aliases: ["akıllıban", "akilliban", "kalıcıban", "kaliciban"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komut yalnızca sunucu yöneticileri tarafından kullanılabilir.", message.guild)] });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        embeds: [Embeds.warn("Eksik Bilgi", `Lütfen kalıcı ban atılacak kullanıcıyı belirtin: \`${config.prefix || "."}forceban <ID/@üye> [sebep]\``, message.guild)]
      });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ embeds: [Embeds.error("Geçersiz İşlem", "Kendinize kalıcı ban uygulayamazsınız.", message.guild)] });
    }

    const reason = args.slice(1).join(" ") || "Sunucu güvenliğini tehlikeye atan eylem (Kalıcı Karaliste)";

    await ForceBan.findOneAndUpdate(
      { guildId: message.guild.id, userId: targetUser.id },
      { $set: { staffId: message.author.id, reason, active: true } },
      { upsert: true }
    );

    await message.guild.members.ban(targetUser.id, { reason: `[FORCEBAN] ${reason}` }).catch(() => null);

    const caseCount = (await Penalty.countDocuments()) + 1;
    await Penalty.create({
      caseId: caseCount,
      guildId: message.guild.id,
      userId: targetUser.id,
      executorId: message.author.id,
      type: "BAN",
      reason: `[FORCEBAN] ${reason}`,
      points: 100,
      active: true
    });

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.error(
              `Kalıcı Yasaklama (ForceBan) - Ceza #${caseCount}`,
              `• **Kullanıcı:** ${targetUser} (\`${targetUser.id}\`)\n• **Yetkili:** ${message.author} (\`${message.author.id}\`)\n• **Sebep:** ${reason}\n• **Durum:** Bu kullanıcının yasağı af edilse dahi bot tarafından anında tekrar banlanacaktır.`,
              message.guild
            )
          ]
        });
      }
    }

    message.reply({
      embeds: [
        Embeds.success(
          "Kalıcı Yasaklama Uygulandı",
          `${targetUser} (\`${targetUser.id}\`) kullanıcısı kalıcı karalisteye eklendi ve sunucudan kalıcı olarak yasaklandı.`,
          message.guild
        )
      ]
    });
  }
};
