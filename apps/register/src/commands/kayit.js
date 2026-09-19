import { MessageFormatter } from "@bot/core";
import { RegisterUI } from "../services/RegisterUI.js";

export default {
  name: "kayıt",
  aliases: ["kayit", "e", "k", "erkek", "kadın", "kadin", "kız"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Kayıt işlemi yapmak için yetkiniz bulunmuyor."));
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetMember) {
      return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen kayıt edilecek üyeyi etiketleyin veya ID belirtin."));
    }

    const name = args[1];
    const age = parseInt(args[2], 10);

    if (!name || isNaN(age)) {
      return message.reply(MessageFormatter.warn(
        "Format Hatası",
        `Lütfen formata uygun yazın: \`${config.prefix || "."}kayıt @kullanıcı İsim Yaş\``
      ));
    }

    if (age < 14) {
      return message.reply(MessageFormatter.error(
        "Yaş Sınırı İhlali",
        "Sunucumuzun minimum kayıt yaşı 14'tür. 14 yaşından küçük üyelerin kaydı gerçekleştirilemez."
      ));
    }

    const tag = config.tag ? `${config.tag} ` : "";
    const formattedNick = `${tag}${name} | ${age}`;
    await targetMember.setNickname(formattedNick).catch(() => null);

    const payload = RegisterUI.formatRegisterPrompt({
      targetMember,
      name,
      age,
      formattedNick,
      staffUser: message.author
    });

    return message.reply(payload);
  }
};
