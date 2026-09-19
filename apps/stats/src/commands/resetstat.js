import { MessageFormatter } from "@bot/core";
import { Stat } from "@bot/database";

export default {
  name: "statsıfırla",
  aliases: ["statsifirla", "resetstat"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu yalnızca sunucu yöneticileri kullanabilir."));
    }

    const type = (args[0] || "").toLowerCase();
    const targetMember = message.mentions.members.first() || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);

    if (type === "haftalık" || type === "haftalik") {
      if (targetMember) {
        await Stat.updateOne(
          { guildId: message.guild.id, userId: targetMember.id },
          { $set: { weeklyMessages: 0, weeklyVoiceMs: 0 } }
        );
        return message.reply(MessageFormatter.success("Sıfırlama Tamamlandı", `${targetMember} kullanıcısının haftalık istatistikleri sıfırlandı.`));
      } else {
        await Stat.updateMany(
          { guildId: message.guild.id },
          { $set: { weeklyMessages: 0, weeklyVoiceMs: 0 } }
        );
        return message.reply(MessageFormatter.success("Genel Sıfırlama Tamamlandı", "Tüm sunucunun haftalık istatistikleri sıfırlandı."));
      }
    }

    if (targetMember) {
      await Stat.deleteOne({ guildId: message.guild.id, userId: targetMember.id });
      return message.reply(MessageFormatter.success("Sıfırlama Tamamlandı", `${targetMember} kullanıcısının tüm istatistik verileri temizlendi.`));
    }

    return message.reply(MessageFormatter.warn(
      "Kullanım Rehberi",
      `▫️ Tek üye sıfırlamak için: \`${config.prefix || "."}statsıfırla @üye\`\n▫️ Haftalık liderliği sıfırlamak için: \`${config.prefix || "."}statsıfırla haftalık\``
    ));
  }
};

