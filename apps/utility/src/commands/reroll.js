import { MessageFormatter } from "@bot/core";

export default {
  name: "reroll",
  aliases: ["yenidencek", "cekilis-yenile"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Çekilişi yeniden çekmek için yetkiniz bulunmuyor."));
    }

    if (!client.giveaways || client.giveaways.size === 0) {
      return message.reply(MessageFormatter.warn("Kayıt Bulunamadı", "Sistem hafızasında aktif veya yakın zamanda tamamlanmış bir çekiliş kaydı bulunamadı."));
    }

    let targetGiveaway = null;
    const msgId = args[0];

    if (msgId) {
      targetGiveaway = client.giveaways.get(msgId);
    } else {
      const channelGiveaways = Array.from(client.giveaways.values())
        .filter((g) => g.channelId === message.channel.id)
        .reverse();
      targetGiveaway = channelGiveaways[0] || null;
    }

    if (!targetGiveaway) {
      return message.reply(MessageFormatter.warn(
        "Çekiliş Bulunamadı",
        `Belirtilen ID ile veya bu kanalda tamamlanmış bir çekiliş bulunamadı.\n\n▫️ Örnek: \`${config.prefix || "."}reroll <MesajID>\``
      ));
    }

    const participants = Array.from(targetGiveaway.participants || []);
    if (participants.length === 0) {
      return message.reply(MessageFormatter.warn("Yetersiz Katılımcı", "Bu çekilişte hiçbir katılımcı bulunmadığı için yeni kazanan belirlenemedi."));
    }

    const count = targetGiveaway.winnersCount || 1;
    const shuffled = participants.sort(() => Math.random() - 0.5);
    const newWinners = shuffled.slice(0, Math.min(count, shuffled.length)).map((id) => `<@${id}>`);

    const winContent = [
      `### 🎉 Çekiliş Yeniden Çekildi!`,
      `▫️ **Ödül:** ${targetGiveaway.prize}`,
      `▫️ **Yeni Kazanan(lar):** ${newWinners.join(", ")}`,
      "",
      `Tebrikler! Lütfen ödül teslimi için yetkili ekibiyle irtibata geçin.`,
      "",
      `-# Çekiliş Yenileme Modülü | Public Bot Ecosystem`
    ].join("\n");

    return message.channel.send({
      content: `${newWinners.join(" ")}\n\n${winContent}`,
      embeds: [],
      components: []
    });
  }
};

