import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "soygun",
  aliases: ["soy", "cal"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null);
    if (!targetUser || targetUser.bot || targetUser.id === message.author.id) {
      return message.reply({ embeds: [Embeds.warn("Geçersiz Hedef", "Lütfen soymak istediğiniz geçerli bir kullanıcıyı etiketleyin.", message.guild)] });
    }

    const robberEco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!robberEco || (robberEco.wallet || 0) < 200) {
      return message.reply({ embeds: [Embeds.error("Yetersiz Bakiye", "Soygun girişiminde bulunabilmek için cüzdanınızda en az 200 Coin olmalıdır.", message.guild)] });
    }

    const targetEco = await Economy.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!targetEco || (targetEco.wallet || 0) < 200) {
      return message.reply({ embeds: [Embeds.warn("Fakir Hedef", "Hedef kullanıcının cüzdanında soyulmaya değer para bulunmuyor.", message.guild)] });
    }

    const isSuccess = Math.random() < 0.45;

    if (isSuccess) {
      const stolen = Math.floor(targetEco.wallet * 0.25);
      await Economy.updateOne({ _id: targetEco._id }, { $inc: { wallet: -stolen } });
      await Economy.updateOne({ _id: robberEco._id }, { $inc: { wallet: stolen } });

      const embed = Embeds.success(
        "Soygun Başarılı!",
        `Harika bir planla ${targetUser} kullanıcısının cüzdanından **${stolen} Coin** aşırdınız!`,
        message.guild
      );
      return message.reply({ embeds: [embed] });
    } else {
      const fine = 150;
      await Economy.updateOne({ _id: robberEco._id }, { $inc: { wallet: -fine } });
      await Economy.updateOne({ _id: targetEco._id }, { $inc: { wallet: fine } });

      const embed = Embeds.error(
        "Yakalandınız!",
        `Soygun sırasında gardiyanlara yakalandınız ve mahkeme kararıyla mağdura **${fine} Coin** tazminat ödediniz.`,
        message.guild
      );
      return message.reply({ embeds: [embed] });
    }
  }
};
