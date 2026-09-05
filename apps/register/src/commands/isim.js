import { UserAccount } from "@bot/database";
import { Embeds, MessageFormatter } from "@bot/core";

export default {
  name: "isim",
  aliases: ["i", "nick", "setnick"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "İsim değiştirme yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetMember) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen bir kullanıcı belirtin.", message.guild)] });
    }

    const name = args[1];
    const age = parseInt(args[2], 10);

    if (!name) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", `Formatı kullanın: \`${config.prefix || "."}isim @kullanıcı İsim [Yaş]\``, message.guild)] });
    }

    const tag = config.tag ? `${config.tag} ` : "";
    const formattedNick = isNaN(age) ? `${tag}${name}` : `${tag}${name} | ${age}`;

    await targetMember.setNickname(formattedNick).catch(() => null);

    await UserAccount.findOneAndUpdate(
      { guildId: message.guild.id, userId: targetMember.id },
      {
        $set: { name, age: isNaN(age) ? 0 : age },
        $push: {
          namesHistory: {
            name,
            age: isNaN(age) ? 0 : age,
            roleAssigned: "İsim Değişikliği",
            staffId: message.author.id,
            date: new Date()
          }
        }
      },
      { upsert: true }
    );

    const payload = MessageFormatter.render("nameChanged", {
      user: targetMember,
      name: formattedNick,
      staff: message.author,
      title: "İsim Güncellendi"
    }, config, message.guild);

    message.reply(payload);
  }
};
