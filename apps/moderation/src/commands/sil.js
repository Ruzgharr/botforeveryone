import { MessageFormatter } from "@bot/core";

export default {
  name: "sil",
  aliases: ["temizle", "clear", "purge"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const amount = parseInt(args[0], 10);
    if (!amount || amount < 1 || amount > 100) {
      return message.reply(MessageFormatter.warn("Hatalı Miktar", "Lütfen 1 ile 100 arasında silinecek mesaj sayısı belirtin. Örnek: `.sil 50`"));
    }

    await message.delete().catch(() => null);

    const deleted = await message.channel.bulkDelete(amount, true).catch(() => null);
    const count = deleted ? deleted.size : 0;

    const alertMsg = await message.channel.send(MessageFormatter.success(
      "Mesajlar Temizlendi",
      `Başarıyla **${count} adet** mesaj temizlendi.`
    ));

    if (alertMsg) {
      setTimeout(() => alertMsg.delete().catch(() => null), 4000);
    }
  }
};
