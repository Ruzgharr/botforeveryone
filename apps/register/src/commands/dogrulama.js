import { MessageFormatter } from "@bot/core";
import { RegisterUI } from "../services/RegisterUI.js";

export default {
  name: "dogrulama",
  aliases: ["captcha", "guvenlikdogrulama", "verify"],
  async execute({ message }) {
    if (!message.member.permissions.has("Administrator") && message.guild.ownerId !== message.author.id) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu paneli kurmak için Yönetici yetkisine sahip olmalısınız."));
    }

    const payload = RegisterUI.formatVerifyPanel();
    await message.channel.send(payload);
    await message.delete().catch(() => null);
  }
};
