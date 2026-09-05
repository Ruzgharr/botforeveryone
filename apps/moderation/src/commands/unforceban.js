import { ForceBan } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "unforceban",
  aliases: ["forcebankaldır", "forcebankaldir", "af-forceban"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komut yalnızca yöneticiler tarafından kullanılabilir.", message.guild)] });
    }

    const userId = args[0]?.replace(/[<@!>]/g, "");
    if (!userId) {
      return message.reply({
        embeds: [Embeds.warn("Eksik Bilgi", `Lütfen kalıcı banı kaldırılacak kullanıcı ID'sini girin: \`${config.prefix || "."}unforceban <ID>\``, message.guild)]
      });
    }

    const record = await ForceBan.findOne({ guildId: message.guild.id, userId, active: true });
    if (!record) {
      return message.reply({
        embeds: [Embeds.warn("Kayıt Yok", "Bu kullanıcı kalıcı karaliste (ForceBan) listesinde bulunmuyor.", message.guild)]
      });
    }

    await ForceBan.updateOne({ _id: record._id }, { $set: { active: false } });
    await message.guild.members.unban(userId, `[UNFORCEBAN] ${message.author.tag} tarafından kaldırıldı`).catch(() => null);

    const logChannelId = config.channels?.penaltyLog;
    if (logChannelId) {
      const logChannel = message.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        logChannel.send({
          embeds: [
            Embeds.info(
              "Kalıcı Yasaklama Kaldırıldı",
              `• **Kullanıcı ID:** \`${userId}\`\n• **Kaldıran Yetkili:** ${message.author} (\`${message.author.id}\`)\n• **Durum:** Kullanıcı artık sunucuya katılabilir.`,
              message.guild
            )
          ]
        });
      }
    }

    message.reply({
      embeds: [
        Embeds.success("İşlem Başarılı", `\`${userId}\` kullanıcısının kalıcı ban kaydı ve sunucu yasağı başarıyla kaldırıldı.`, message.guild)
      ]
    });
  }
};
