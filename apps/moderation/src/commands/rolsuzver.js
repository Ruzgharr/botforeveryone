import { Embeds } from "@bot/core";

export default {
  name: "rolsüzver",
  aliases: ["rolsuzver", "rolsuz-ver", "unreg-ver"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator")) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Bu komutu yalnızca sunucu yöneticileri kullanabilir.", message.guild)] });
    }

    const unregRoles = config.roles?.unregistered || [];
    if (unregRoles.length === 0) {
      return message.reply({ embeds: [Embeds.warn("Ayar Hatası", "Kayıtsız rolü sistemde ayarlanmamış.", message.guild)] });
    }

    const sent = await message.reply({
      embeds: [Embeds.info("Tarama Başlatıldı", "Rolsüz üyeler taranıyor ve kayıtsız rolü tanımlanıyor, lütfen bekleyin...", message.guild)]
    });

    await message.guild.members.fetch().catch(() => null);

    const membersWithoutRoles = message.guild.members.cache.filter((m) => {
      if (m.user.bot) return false;
      const validRoles = m.roles.cache.filter((r) => r.id !== message.guild.id);
      return validRoles.size === 0;
    });

    let assignedCount = 0;
    for (const member of membersWithoutRoles.values()) {
      try {
        await member.roles.add(unregRoles);
        assignedCount++;
      } catch {}
    }

    sent.edit({
      embeds: [
        Embeds.success(
          "İşlem Tamamlandı",
          `• **Taranan Rolsüz Üye:** ${membersWithoutRoles.size} kişi\n• **Rol Verilen Üye:** ${assignedCount} kişi\n• **Verilen Roller:** ${unregRoles.map((r) => `<@&${r}>`).join(", ")}`,
          message.guild
        )
      ]
    });
  }
};
