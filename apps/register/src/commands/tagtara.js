import { MessageFormatter } from "@bot/core";

export default {
  name: "tagtara",
  aliases: ["tag-tara", "tagsenkron", "tag-senkron"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "registerStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const tag = config.tag;
    const secondaryTag = config.secondaryTag;
    const tagRoleId = config.roles?.tagRole;

    if (!tag && !secondaryTag) {
      return message.reply(MessageFormatter.warn("Ayar Eksik", "Sunucu için herhangi bir tag tanımlanmamış. Panelden ayarlayınız."));
    }

    if (!tagRoleId) {
      return message.reply(MessageFormatter.warn("Ayar Eksik", "Sunucu için tag rolü tanımlanmamış. Panelden ayarlayınız."));
    }

    const statusMsg = await message.reply(MessageFormatter.info("Tag Taraması Başlatıldı", "Sunucudaki tüm üyeler taranıyor, lütfen bekleyin..."));

    const members = await message.guild.members.fetch();
    let addedCount = 0;
    let removedCount = 0;

    for (const member of members.values()) {
      if (member.user.bot) continue;

      const hasTag = (tag && (member.user.username.includes(tag) || member.displayName.includes(tag))) ||
                     (secondaryTag && (member.user.username.includes(secondaryTag) || member.displayName.includes(secondaryTag)));
      const hasRole = member.roles.cache.has(tagRoleId);

      if (hasTag && !hasRole) {
        await member.roles.add(tagRoleId).catch(() => null);
        addedCount++;
      } else if (!hasTag && hasRole) {
        await member.roles.remove(tagRoleId).catch(() => null);
        removedCount++;
      }
    }

    statusMsg.edit(MessageFormatter.success(
      "Tag Taraması Tamamlandı",
      `Tarama başarıyla sonuçlandı:\n\n▫️ Tagı olup rolü verilen: **${addedCount}**\n▫️ Tagı bulunmayıp rolü alınan: **${removedCount}**\n-# Tag Senkronizasyon Sistemi`
    ));
  }
};
