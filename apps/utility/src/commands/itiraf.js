import { Embeds } from "@bot/core";

export default {
  name: "itiraf",
  aliases: ["confess", "confession", "anonim"],
  async execute({ message, args, config }) {
    await message.delete().catch(() => null);

    const confession = args.join(" ").trim();
    if (!confession) {
      const dmChannel = await message.author.createDM().catch(() => null);
      if (dmChannel) {
        dmChannel.send("İtiraf mesajınızı boş bırakamazsınız. Örnek: `.itiraf Sunucudaki etkinlikleri çok seviyorum.`").catch(() => null);
      }
      return;
    }

    const embed = Embeds.base("🤫 Anonim Bir İtiraf Geldi", null, message.guild)
      .setDescription(`"${confession}"`)
      .setFooter({ text: "Anonim İtiraf Kutusu | Gönderenin Kimliği Tamamen Gizlidir", iconURL: message.guild.iconURL() });

    const targetChannel = (config.channels?.confessionChannel
      ? message.guild.channels.cache.get(config.channels.confessionChannel)
      : null) || message.channel;

    await targetChannel.send({ embeds: [embed] });
  }
};
