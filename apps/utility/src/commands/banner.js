import { MessageFormatter } from "@bot/core";
import { UtilityUI } from "../services/UtilityUI.js";

export default {
  name: "banner",
  aliases: ["afis", "afiş"],
  async execute({ client, message, args }) {
    const targetUserId = message.mentions.users.first()?.id || args[0] || message.author.id;
    const targetUser = await client.users.fetch(targetUserId, { force: true }).catch(() => null);

    if (!targetUser) {
      return message.reply(MessageFormatter.error("Kullanıcı Bulunamadı", "Belirtilen kullanıcı bulunamadı."));
    }

    const bannerUrl = targetUser.bannerURL({ size: 2048, dynamic: true });

    if (!bannerUrl) {
      return message.reply(MessageFormatter.warn("Afiş Bulunamadı", `${targetUser.username} kullanıcısının özel bir profil afişi (banner) bulunmuyor.`));
    }

    const payload = UtilityUI.formatBannerPayload({ targetUser, bannerUrl });
    return message.reply(payload);
  }
};

