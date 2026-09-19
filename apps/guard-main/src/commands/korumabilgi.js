import { MessageFormatter } from "@bot/core";
import { Backup } from "@bot/database";
import { GuardUI } from "../services/GuardUI.js";

export default {
  name: "korumabilgi",
  aliases: ["guard", "koruma", "guvenlik", "guvenlikbilgi"],
  async execute({ message, config }) {
    const isOwner = message.guild.ownerId === message.author.id;
    if (!isOwner && !message.member.permissions.has("Administrator")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Güvenlik durumunu görüntülemek için Yönetici yetkisine sahip olmalısınız."));
    }

    const latestBackup = await Backup.findOne({ guildId: message.guild.id }).sort({ createdAt: -1 });
    const payload = GuardUI.formatStatusPayload({ config, latestBackup });
    return message.reply(payload);
  }
};

