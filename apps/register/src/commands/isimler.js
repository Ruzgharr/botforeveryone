import { UserAccount } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "isimler",
  aliases: ["geçmişisimler", "gecmisisimler", "names"],
  async execute({ client, message, args, config }) {
    const targetUser = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);

    const account = await UserAccount.findOne({ guildId: message.guild.id, userId: targetUser.id });
    if (!account || !account.namesHistory || account.namesHistory.length === 0) {
      return message.reply({
        embeds: [Embeds.info("Geçmiş Bulunamadı", `${targetUser} kullanıcısına ait geçmiş isim kaydı bulunamadı.`, message.guild)]
      });
    }

    const list = account.namesHistory.slice(-10).reverse().map((entry) => {
      const dateStr = entry.date ? new Date(entry.date).toISOString().substring(0, 10) : "";
      const ageStr = entry.age ? ` | ${entry.age}` : "";
      const staffStr = entry.staffId ? ` (<@${entry.staffId}>)` : "";
      return `• **${entry.name}${ageStr}** - [${entry.roleAssigned || "Kayıt"}] ${dateStr}${staffStr}`;
    }).join("\n");

    const payload = MessageFormatter.render("nameHistory", {
      user: targetUser,
      count: account.namesHistory.length,
      records: list,
      title: `${targetUser.tag} - İsim Geçmişi`
    }, config, message.guild);

    message.reply(payload);
  }
};
