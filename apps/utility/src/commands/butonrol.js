import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

export default {
  name: "butonrol",
  aliases: ["rolsecim", "buttonrole", "tepkirol"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator") && !client.hasStaffPermission(message.member, config, "staffRoles")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Buton rol paneli oluşturmak için Yönetici yetkisine sahip olmalısınız."));
    }

    const rawInput = args.join(" ").trim();
    if (!rawInput) {
      return message.reply(MessageFormatter.warn(
        "Hatalı Kullanım",
        `Lütfen bir başlık ve roller belirtin.\n\n▫️ **Kullanım:** \`.butonrol <Başlık> | <@Rol1 veya ID> | <@Rol2 veya ID>\`\n▫️ **Örnek:** \`.butonrol Oyun Rolleri | @Valorant | @League of Legends | @CS2\``
      ));
    }

    const parts = rawInput.split("|").map((s) => s.trim()).filter(Boolean);
    const title = parts[0];
    const roleIdentifiers = parts.slice(1);

    if (roleIdentifiers.length === 0) {
      return message.reply(MessageFormatter.warn("Eksik Rol", "En az bir adet geçerli rol belirtmelisiniz."));
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
      return message.reply(MessageFormatter.error("Roller Bulunamadı", "Belirttiğiniz roller sunucuda bulunamadı veya botun yönetemeyeceği entegrasyon rolleri."));
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

    const content = [
      `### 🎭 ${title}`,
      `Aşağıdaki butonlara tıklayarak dilediğiniz rolü anında üzerinize alabilir veya tekrar tıklayarak üzerinizden çıkarabilirsiniz.`,
      "",
      validRoles.map((r) => `▫️ ${r}`).join("\n"),
      "",
      `-# Buton Rol Sistemi | Public Bot Ecosystem`
    ].join("\n");

    await message.channel.send({ content, embeds: [], components: rows });
    await message.delete().catch(() => null);
  }
};

