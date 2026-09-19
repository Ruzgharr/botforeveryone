import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { BattlePassService } from "../services/BattlePassService.js";

export default {
  name: "gorev",
  aliases: ["gorevler", "quests", "tasks", "dailyquest"],
  async execute({ message, args, config }) {
    const { season, userProgress } = await BattlePassService.getUserProgress(message.guild.id, message.author.id);

    if (args[0] === "al" || args[0] === "claim") {
      const targetQuestId = (args[1] || "").toLowerCase().trim();
      if (!targetQuestId) {
        let anyClaimed = false;
        let totalXp = 0;
        let totalCoin = 0;

        for (const dq of userProgress.dailyQuests || []) {
          if (dq.completed && !dq.claimed) {
            const res = await BattlePassService.claimQuestReward(message.guild.id, message.author.id, dq.questId, false);
            if (res.success) {
              anyClaimed = true;
              totalXp += res.gainedXp;
              totalCoin += res.gainedCoin;
            }
          }
        }

        for (const wq of userProgress.weeklyQuests || []) {
          if (wq.completed && !wq.claimed) {
            const res = await BattlePassService.claimQuestReward(message.guild.id, message.author.id, wq.questId, true);
            if (res.success) {
              anyClaimed = true;
              totalXp += res.gainedXp;
              totalCoin += res.gainedCoin;
            }
          }
        }

        if (!anyClaimed) {
          return message.reply(MessageFormatter.warn("Ödül Yok", "Şu anda ödülü toplanabilir tamamlanmış bir görev bulunmuyor."));
        }

        return message.reply(MessageFormatter.success(
          "Görev Ödülleri Alındı!",
          `▫️ Tamamlanan görevlerden toplam **+${totalXp.toLocaleString("tr-TR")} Bilet XP** ve **+${totalCoin.toLocaleString("tr-TR")} Coin** hesabınıza eklendi!\n▫️ Sezon biletinizi incelemek için: \`.bilet\``
        ));
      }

      const isWeekly = (userProgress.weeklyQuests || []).some((q) => q.questId === targetQuestId);
      const res = await BattlePassService.claimQuestReward(message.guild.id, message.author.id, targetQuestId, isWeekly);
      if (!res.success) {
        return message.reply(MessageFormatter.warn("Hata", res.reason));
      }

      return message.reply(MessageFormatter.success(
        "Görev Ödülü Alındı!",
        `▫️ **${res.title}** görevi tamamlandı!\n▫️ **Kazanılan:** \`+${res.gainedXp} Bilet XP\` ve \`+${res.gainedCoin} Coin\`\n▫️ **Güncel Bilet Seviyesi:** Kademe **${res.newPassLevel}**`
      ));
    }

    const dailyCfgMap = new Map((season.dailyQuestsConfig || []).map((q) => [q.id, q]));
    const dailyRows = (userProgress.dailyQuests || []).map((dq) => {
      const cfg = dailyCfgMap.get(dq.questId);
      if (!cfg) return null;

      let statusBadge = `⏳ **${dq.current}/${dq.target}**`;
      if (dq.completed) {
        statusBadge = dq.claimed ? "✅ *(Toplandı)*" : "🎁 **[Toplanabilir: .gorev al]**";
      }

      return `▫️ **${cfg.title}** : ${statusBadge}\n  *${cfg.description}*\n  Ödül: \`+${cfg.xpReward} Bilet XP\` • \`+${cfg.coinReward} Coin\``;
    }).filter(Boolean).join("\n\n");

    const weeklyCfgMap = new Map((season.weeklyQuestsConfig || []).map((q) => [q.id, q]));
    const weeklyRows = (userProgress.weeklyQuests || []).map((wq) => {
      const cfg = weeklyCfgMap.get(wq.questId);
      if (!cfg) return null;

      let statusBadge = `⏳ **${wq.current}/${wq.target}**`;
      if (wq.completed) {
        statusBadge = wq.claimed ? "✅ *(Toplandı)*" : "🎁 **[Toplanabilir: .gorev al]**";
      }

      return `▫️ **${cfg.title}** : ${statusBadge}\n  *${cfg.description}*\n  Ödül: \`+${cfg.xpReward} Bilet XP\` • \`+${cfg.coinReward} Coin\``;
    }).filter(Boolean).join("\n\n");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bp_claim_all_quests:${message.author.id}`)
        .setLabel("🎁 Tamamlananları Topla")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`bp_view_pass:${message.author.id}`)
        .setLabel("🎫 Sezon Bileti")
        .setStyle(ButtonStyle.Primary)
    );

    const content = [
      `# 📜 Sezon Görevleri : ${season.seasonName}`,
      `Görevleri tamamlayarak Sezon Bileti XP'si ve ekstra Coin kazanın. Günlük görevler her gece yarısı otomatik yenilenir.`,
      "",
      `### ☀️ Günlük Görevler`,
      dailyRows || "Aktif günlük görev bulunmuyor.",
      "",
      `### 🌟 Haftalık Büyük Görevler`,
      weeklyRows || "Aktif haftalık görev bulunmuyor.",
      "",
      `-# 💡 Tamamlanan ödülleri almak için \`.gorev al\` yazabilir veya aşağıdaki yeşil butona basabilirsiniz.`
    ].join("\n");

    return message.reply(MessageFormatter.v2(content, [row]));
  }
};
