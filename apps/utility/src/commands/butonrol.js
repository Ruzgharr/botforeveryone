import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { Embeds } from "@bot/core";

export default {
  name: "butonrol",
  aliases: ["rolsecim", "buttonrole", "tepkirol"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator") && !client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Buton rol paneli oluşturmak için Yönetici yetkisine sahip olmalısınız.", message.guild)] });
    }

    const rawInput = args.join(" ").trim();
    if (!rawInput) {
      return message.reply({
        embeds: [Embeds.warn("Hatalı Kullanım", "Lütfen bir başlık ve roller belirtin.\n\n**Kullanım:**\n`.butonrol <Başlık> | <@Rol1 veya ID> | <@Rol2 veya ID>`\n\n**Örnek:**\n`.butonrol Oyun Rolleri | @Valorant | @League of Legends | @CS2`", message.guild)]
      });
    }

    const parts = rawInput.split("|").map((s) => s.trim()).filter(Boolean);
    const title = parts[0];
    const roleIdentifiers = parts.slice(1);

    if (roleIdentifiers.length === 0) {
      return message.reply({ embeds: [Embeds.warn("Eksik Rol", "En az bir adet geçerli rol belirtmelisiniz.", message.guild)] });
    }

    const validRoles = [];
    for (const rawRole of roleIdentifiers) {
      const cleanId = rawRole.replace(/[<@&>]/g, "").trim();
      const foundRole = message.guild.roles.cache.get(cleanId) || message.guild.roles.cache.find((r) => r.name.toLowerCase() === rawRole.toLowerCase());
      if (foundRole && foundRole.id !== message.guild.id && !foundRole.managed) {
        validRoles.push(foundRole);
      }
    }

    if (validRoles.length === 0) {
      return message.reply({ embeds: [Embeds.error("Roller Bulunamadı", "Belirttiğiniz roller sunucuda bulunamadı veya botun yönetemeyeceği bot rolleri.", message.guild)] });
    }

    const rows = [];
    let currentRow = new ActionRowBuilder();

    validRoles.forEach((role, idx) => {
      if (idx > 0 && idx % 5 === 0) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }

      currentRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`btnrole_${role.id}`)
          .setLabel(role.name)
          .setStyle(ButtonStyle.Primary)
      );
    });

    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }

    const description = "Aşağıdaki butonlara tıklayarak dilediğiniz rolü anında üzerinize alabilir veya tekrar tıklayarak üzerinizden çıkarabilirsiniz.\n\n"
      + validRoles.map((r) => `• ${r}`).join("\n");

    const embed = Embeds.base(`🎭 ${title}`, description, message.guild)
      .setFooter({ text: "Buton Rol Sistemi | Public Bot Ecosystem", iconURL: message.guild.iconURL() });

    await message.channel.send({ embeds: [embed], components: rows });
    await message.delete().catch(() => null);
  }
};
