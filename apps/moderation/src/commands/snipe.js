import { MessageFormatter } from "@bot/core";

export default {
  name: "snipe",
  aliases: ["sonsilinek", "silinen"],
  async execute({ client, message, config }) {
    const sniped = client.snipes?.get(message.channel.id);
    if (!sniped) {
      const payload = MessageFormatter.render("snipeEmpty", {
        title: "Bulunamadı"
      }, config, message.guild);
      return message.reply(payload);
    }

    const payload = MessageFormatter.render("snipeMessage", {
      authorId: sniped.authorId,
      content: sniped.content || "Görsel / Dosya Eki",
      time: `<t:${Math.floor(sniped.timestamp / 1000)}:R>`,
      title: "Son Silinen Mesaj"
    }, config, message.guild);

    message.reply(payload);
  }
};
