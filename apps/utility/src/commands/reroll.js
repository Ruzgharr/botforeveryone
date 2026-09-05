import { Embeds } from "@bot/core";

export default {
  name: "reroll",
  aliases: ["yenidencek", "cekilis-yenile"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Çekilişi yeniden çekmek için yetkiniz bulunmuyor.", message.guild)] });
    }

    if (!client.giveaways || client.giveaways.size === 0) {
      return message.reply({ embeds: [Embeds.warn("Kayıt Bulunamadı", "Sistem hafızasında aktif veya yakın zamanda tamamlanmış bir çekiliş kaydı bulunamadı.", message.guild)] });
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
      return message.reply({ embeds: [Embeds.warn("Çekiliş Bulunamadı", "Belirtilen ID ile veya bu kanalda tamamlanmış bir çekiliş bulunamadı. Lütfen geçerli bir mesaj ID girin: `.reroll <MesajID>`", message.guild)] });
    }

    const participants = Array.from(targetGiveaway.participants || []);
    if (participants.length === 0) {
      return message.reply({ embeds: [Embeds.warn("Yetersiz Katılımcı", "Bu çekilişte hiçbir katılımcı bulunmadığı için yeni kazanan belirlenemedi.", message.guild)] });
    }

    const count = targetGiveaway.winnersCount || 1;
    const shuffled = participants.sort(() => Math.random() - 0.5);
    const newWinners = shuffled.slice(0, Math.min(count, shuffled.length)).map((id) => `<@${id}>`);

    const rerollEmbed = Embeds.success(
      "🎉 Çekiliş Yeniden Çekildi!",
      `**Ödül:** ${targetGiveaway.prize}\n**Yeni Kazanan(lar):** ${newWinners.join(", ")}\n\nTebrikler! Lütfen yetkili ekibiyle irtibata geçin.`,
      message.guild
    );

    message.channel.send({ content: newWinners.join(" "), embeds: [rerollEmbed] });
  }
};
