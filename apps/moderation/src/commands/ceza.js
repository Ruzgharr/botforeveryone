import { Penalty } from "@bot/database";
import { MessageFormatter } from "@bot/core";
import { ModerationUI } from "../services/ModerationUI.js";

export default {
  name: "ceza",
  aliases: ["cezasorgu", "ceza-bilgi"],
  async execute({ client, message, args, config }) {
    if (!client.hasStaffPermission(message.member, config, "moderationStaff")) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Bu komutu kullanmak için yetkiniz bulunmuyor."));
    }

    const caseIdArg = parseInt(args[0], 10);
    if (isNaN(caseIdArg) || caseIdArg <= 0) {
      return message.reply(MessageFormatter.warn("Geçersiz Numara", `Lütfen sorgulanacak ceza numarasını belirtin: \`${config.prefix || "."}ceza 15\``));
    }

    const penalty = await Penalty.findOne({ caseId: caseIdArg, guildId: message.guild.id });
    if (!penalty) {
      return message.reply(MessageFormatter.warn("Bulunamadı", `#${caseIdArg} numaralı ceza kaydı veritabanında bulunamadı.`));
    }

    const payload = ModerationUI.formatCezaPayload(penalty);
    return message.reply(payload);
  }
};
