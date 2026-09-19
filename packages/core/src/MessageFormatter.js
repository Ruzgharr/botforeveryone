import { Embeds } from "./Embeds.js";

function formatBody(text, defaultSubtext = "") {
  if (!text) return defaultSubtext ? `\n-# ${defaultSubtext}` : "";
  const trimmed = String(text).trim();
  const hasBullet = trimmed.startsWith("▫️") || trimmed.startsWith("-#") || trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("```") || trimmed.startsWith("•");
  const body = hasBullet ? trimmed : `▫️ ${trimmed}`;
  if (defaultSubtext && !body.includes("-#")) {
    return `${body}\n-# ${defaultSubtext}`;
  }
  return body;
}

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

  static v2(content, components = [], ephemeral = false, mediaUrl = null) {
    const text = String(content || "").trim();
    const actionRows = (components || []).map((c) => (typeof c?.toJSON === "function" ? c.toJSON() : c));

    const isEphemeral = typeof ephemeral === "object" ? Boolean(ephemeral.ephemeral) : Boolean(ephemeral);
    const media = typeof ephemeral === "object" ? ephemeral.mediaUrl : mediaUrl;

    const containerComponents = [];
    if (text) {
      containerComponents.push({
        type: 10,
        content: text
      });
    }

    if (media) {
      containerComponents.push({
        type: 12,
        items: [{ media: { url: media } }]
      });
    }

    containerComponents.push(...actionRows);

    const payload = {
      flags: 32768 | (isEphemeral ? 64 : 0),
      components: [
        {
          type: 17,
          components: containerComponents
        }
      ]
    };

    if (isEphemeral) payload.ephemeral = true;
    return payload;
  }

  static render(templateKey, vars = {}, config = {}, guild = null) {
    const messageConfig = config.messages?.[templateKey];
    const rawTemplate = messageConfig?.content || vars.defaultText || "";
    const format = messageConfig?.format || "COMPONENTS_V2";

    const text = this.formatText(rawTemplate, {
      ...vars,
      guild: guild?.name || vars.guild || ""
    });

    const isEphemeral = Boolean(vars.ephemeral);

    if (format === "COMPONENTS_V2") {
      let fullContent = "";
      if (vars.title && !text.includes(vars.title)) {
        fullContent += `### ⚡ ${vars.title}\n`;
      }
      fullContent += text;
      if (!fullContent.trim()) {
        fullContent = vars.defaultText || "▫️ İşlem tamamlandı.";
      }
      return this.v2(fullContent, vars.components, isEphemeral);
    }

    if (format === "PLAIN") {
      let fullContent = "";
      if (vars.title && !text.includes(vars.title)) {
        fullContent += `### ⚡ ${vars.title}\n`;
      }
      fullContent += text;
      if (!fullContent.trim()) {
        fullContent = vars.defaultText || "▫️ İşlem tamamlandı.";
      }
      return {
        content: fullContent.trim(),
        embeds: [],
        components: vars.components || [],
        ephemeral: isEphemeral
      };
    }

    const embed = Embeds.base(guild).setDescription(text || vars.defaultText || "▫️ İşlem tamamlandı.");
    if (vars.title) embed.setTitle(vars.title);
    if (vars.color) {
      try {
        embed.setColor(vars.color);
      } catch {
        embed.setColor(0x2b2d31);
      }
    }
    return { embeds: [embed], components: vars.components || [], ephemeral: isEphemeral };
  }

  static success(title, text, components = [], ephemeral = false) {
    const formatted = formatBody(text, "⚡ Sistem Onayı • İşlem başarıyla tamamlandı");
    return this.v2(`### 🟢 ${title}\n${formatted}`, components, ephemeral);
  }

  static error(title, text, components = [], ephemeral = false) {
    const formatted = formatBody(text, "⛔ Hata Protokolü • İşlem gerçekleştirilemedi");
    return this.v2(`### 🔴 ${title}\n${formatted}`, components, ephemeral);
  }

  static warn(title, text, components = [], ephemeral = false) {
    const formatted = formatBody(text, "⚠️ Uyarı Protokolü • Parametreleri kontrol ediniz");
    return this.v2(`### 🟡 ${title}\n${formatted}`, components, ephemeral);
  }

  static info(title, text, components = [], ephemeral = false) {
    const formatted = formatBody(text, "ℹ️ Bilgi Servisi • Public Bot Altyapısı");
    return this.v2(`### 🔵 ${title}\n${formatted}`, components, ephemeral);
  }
}
