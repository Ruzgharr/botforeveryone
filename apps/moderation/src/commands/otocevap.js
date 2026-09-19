import { MessageFormatter } from "@bot/core";
import { GuildConfig } from "@bot/database";

export default {
  name: "otocevap",
  aliases: ["autoresponder", "otoyanit", "oto-cevap"],
  async execute({ client, message, args, config }) {
    if (!message.member.permissions.has("Administrator") && !client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Otomatik yanıt sistemini yönetmek için yetkiniz bulunmuyor."));
    }

    const action = args[0]?.toLowerCase();
    const responders = config.autoResponders || [];

    if (action === "ekle") {
      const payloadStr = args.slice(1).join(" ");
      const parts = payloadStr.split("|").map((s) => s.trim()).filter(Boolean);
      const trigger = parts[0]?.toLowerCase();
      const response = parts[1];

      if (!trigger || !response) {
        return message.reply(MessageFormatter.warn(
          "Hatalı Format",
          "Lütfen tetikleyici ve yanıtı dikey çizgi (|) ile ayırarak girin.\n\n**Örnek:**\n`.otocevap ekle kurallar | Sunucu kurallarımızı #kurallar kanalından okuyabilirsiniz.`"
        ));
      }

      const existingIdx = responders.findIndex((r) => r.trigger === trigger);
      if (existingIdx !== -1) {
        responders[existingIdx].response = response;
      } else {
        responders.push({ trigger, response });
      }

      await GuildConfig.updateOne(
        { guildId: message.guild.id },
        { $set: { autoResponders: responders } },
        { upsert: true }
      );

      return message.reply(MessageFormatter.success(
        "Otomatik Yanıt Eklendi",
        `**Tetikleyici:** \`${trigger}\`\n▫️ **Yanıt:** ${response}`
      ));
    }

    if (action === "sil") {
      const trigger = args.slice(1).join(" ").trim().toLowerCase();
      if (!trigger) {
        return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen silinecek tetikleyici kelimeyi belirtin."));
      }

      const filtered = responders.filter((r) => r.trigger !== trigger);
      if (filtered.length === responders.length) {
        return message.reply(MessageFormatter.warn("Bulunamadı", `\`${trigger}\` adında kayıtlı bir otomatik yanıt bulunamadı.`));
      }

      await GuildConfig.updateOne(
        { guildId: message.guild.id },
        { $set: { autoResponders: filtered } }
      );

      return message.reply(MessageFormatter.success(
        "Otomatik Yanıt Silindi",
        `\`${trigger}\` tetikleyicisi sistemden kaldırıldı.`
      ));
    }

    if (action === "liste" || !action) {
      if (responders.length === 0) {
        return message.reply(MessageFormatter.info(
          "Kayıtlı Yanıt Yok",
          "Sunucuda henüz kayıtlı bir otomatik yanıt bulunmuyor. `.otocevap ekle <Kelime> | <Yanıt>` komutu ile ekleyebilirsiniz."
        ));
      }

      const listStr = responders.map((r, i) => `▫️ **${i + 1}.** \`${r.trigger}\` ➔ ${r.response}`).join("\n");
      return message.reply(MessageFormatter.info(
        "Otomatik Yanıt Listesi (Auto-Responder)",
        `Sunucuda tanımlı **${responders.length} adet** otomatik yanıt:\n\n${listStr}\n-# Auto-Responder | Public Bot Ecosystem`
      ));
    }
  }
};
