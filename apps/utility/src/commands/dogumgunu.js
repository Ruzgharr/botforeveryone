import { UserAccount } from "@bot/database";
import { MessageFormatter } from "@bot/core";

const MONTH_NAMES = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

export default {
  name: "dogumgunu",
  aliases: ["birthday", "doğumgünü", "bday"],
  async execute({ message, args }) {
    const day = parseInt(args[0], 10);
    const month = parseInt(args[1], 10);

    if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) {
      const existing = await UserAccount.findOne({ guildId: message.guild.id, userId: message.author.id });
      let currentBday = "Kayıtlı doğum gününüz bulunmuyor.";
      if (existing?.birthday?.day && existing?.birthday?.month) {
        currentBday = `Kayıtlı Doğum Gününüz: **${existing.birthday.day} ${MONTH_NAMES[existing.birthday.month]}**`;
      }

      return message.reply(MessageFormatter.warn(
        "Hatalı Format",
        `${currentBday}\n\n▫️ Doğum gününüzü kaydetmek için gün ve ay numarasını belirtin.\n▫️ Örnek: \`.dogumgunu 23 4\` (23 Nisan)`
      ));
    }

    await UserAccount.updateOne(
      { guildId: message.guild.id, userId: message.author.id },
      { $set: { "birthday.day": day, "birthday.month": month } },
      { upsert: true }
    );

    return message.reply(MessageFormatter.success(
      "Doğum Gününüz Kaydedildi",
      `▫️ Doğum gününüz **${day} ${MONTH_NAMES[month]}** olarak başarıyla kaydedildi.\n▫️ O gün geldiğinde sunucumuzda otomatik olarak kutlanacaktır!`
    ));
  }
};

