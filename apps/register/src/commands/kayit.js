import { Embeds } from "@bot/core";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
  name: "kayıt",
  aliases: ["kayit", "e", "k", "erkek", "kadın", "kadin", "kız"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Kayıt işlemi yapmak için yetkiniz bulunmuyor.", message.guild)] });
    }

    const targetMember = message.mentions.members.first() || (args[0] ? await message.guild.members.fetch(args[0]).catch(() => null) : null);
    if (!targetMember) {
      return message.reply({ embeds: [Embeds.warn("Eksik Bilgi", "Lütfen kayıt edilecek üyeyi etiketleyin veya ID belirtin.", message.guild)] });
    }

    const name = args[1];
    const age = parseInt(args[2], 10);

    if (!name || isNaN(age)) {
      return message.reply({
        embeds: [Embeds.warn("Format Hatası", `Lütfen formata uygun yazın: \`${config.prefix || "."}kayıt @kullanıcı İsim Yaş\``, message.guild)]
      });
    }

    if (age < 14) {
      return message.reply({
        embeds: [Embeds.error("Yaş Sınırı İhlali", "Sunucumuzun minimum kayıt yaşı 14'tür. 14 yaşından küçük üyelerin kaydı gerçekleştirilemez.", message.guild)]
      });
    }

    const tag = config.tag ? `${config.tag} ` : "";
    const formattedNick = `${tag}${name} | ${age}`;
    await targetMember.setNickname(formattedNick).catch(() => null);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reg_man_${targetMember.id}_${name}_${age}`)
        .setLabel("Erkek")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`reg_woman_${targetMember.id}_${name}_${age}`)
        .setLabel("Kadın")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`reg_member_${targetMember.id}_${name}_${age}`)
        .setLabel("Üye")
        .setStyle(ButtonStyle.Success)
    );

    message.reply({
      embeds: [
        Embeds.info(
          "Cinsiyet Seçimi",
          `${targetMember} kullanıcısının ismi **${formattedNick}** olarak ayarlandı. Lütfen aşağıdaki butonlardan cinsiyet rolünü seçin.`,
          message.guild
        )
      ],
      components: [row]
    });
  }
};
