import { EmbedBuilder } from "discord.js";

export class Embeds {
  static defaultColor = 0x2b2d31;
  static successColor = 0x57F287;
  static errorColor = 0xED4245;
  static warnColor = 0xFEE75C;
  static primaryColor = 0x5865F2;

  static base(guild = null) {
    const embed = new EmbedBuilder()
      .setColor(this.defaultColor)
      .setTimestamp();

    if (guild && guild.iconURL()) {
      embed.setFooter({ text: guild.name, iconURL: guild.iconURL() });
    }
    return embed;
  }

  static success(title, description, guild = null) {
    return this.base(guild)
      .setColor(this.successColor)
      .setTitle(title ? `✓ ${title}` : null)
      .setDescription(description);
  }

  static error(title, description, guild = null) {
    return this.base(guild)
      .setColor(this.errorColor)
      .setTitle(title ? `✗ ${title}` : null)
      .setDescription(description);
  }

  static warn(title, description, guild = null) {
    return this.base(guild)
      .setColor(this.warnColor)
      .setTitle(title ? `! ${title}` : null)
      .setDescription(description);
  }

  static info(title, description, guild = null) {
    return this.base(guild)
      .setColor(this.primaryColor)
      .setTitle(title)
      .setDescription(description);
  }
}
