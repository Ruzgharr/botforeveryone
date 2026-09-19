import { EmbedBuilder } from "discord.js";

export class Embeds {
  static defaultColor = 0x2b2d31;
  static successColor = 0x2b2d31;
  static errorColor = 0x2b2d31;
  static warnColor = 0x2b2d31;
  static primaryColor = 0x2b2d31;

  static base(titleOrGuild = null, description = null, suppliedGuild = null) {
    const hasTitle = typeof titleOrGuild === "string";
    const guild = hasTitle ? suppliedGuild : titleOrGuild;
    const embed = new EmbedBuilder()
      .setColor(this.defaultColor)
      .setTimestamp();

    if (hasTitle) embed.setTitle(titleOrGuild);
    if (description != null) embed.setDescription(description);

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
