import { Embeds } from "./Embeds.js";

export class MessageFormatter {
  static formatText(template, vars = {}) {
    if (!template) return "";
    let result = template;
    for (const [key, val] of Object.entries(vars)) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      result = result.replace(regex, val !== undefined && val !== null ? String(val) : "");
    }
    return result;
  }

  static render(templateKey, vars = {}, config = {}, guild = null) {
    const messageConfig = config.messages?.[templateKey];
    const rawTemplate = messageConfig?.content || vars.defaultText || "";
    const format = messageConfig?.format || "EMBED";

    const text = this.formatText(rawTemplate, {
      ...vars,
      guild: guild?.name || vars.guild || ""
    });

    const isEphemeral = Boolean(vars.ephemeral);

    if (format === "PLAIN") {
      return { content: text, embeds: [], components: vars.components || [], ephemeral: isEphemeral };
    }

    if (format === "COMPONENTS_V2") {
      const containerEmbed = Embeds.base(guild)
        .setDescription(`\`\`\`fix\n${guild?.name || "Sistem"}\n\`\`\`\n${text}`);
      if (vars.title) containerEmbed.setTitle(vars.title);
      if (vars.color) containerEmbed.setColor(vars.color);
      return { embeds: [containerEmbed], components: vars.components || [], ephemeral: isEphemeral };
    }

    const embed = Embeds.base(guild).setDescription(text);
    if (vars.title) embed.setTitle(vars.title);
    if (vars.color) embed.setColor(vars.color);
    return { embeds: [embed], components: vars.components || [], ephemeral: isEphemeral };
  }
}
