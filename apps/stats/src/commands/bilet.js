import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { BattlePassService } from "../services/BattlePassService.js";

export default {
  name: "bilet",
  aliases: ["battlepass", "pass", "sezon", "sezonbileti"],
  async execute({ message, args, config }) {
    const { season, userProgress } = await BattlePassService.getUserProgress(message.guild.id, message.author.id);

    const userLvl = userProgress.passLevel || 1;
    const userXp = userProgress.passXp || 0;
    const hasVip = userProgress.hasVipPass;

    const currentTier = (season.tiers || []).find((t) => t.level === userLvl) || season.tiers?.[0];
    const nextTier = (season.tiers || []).find((t) => t.level === userLvl + 1);
    const requiredForNext = nextTier ? nextTier.requiredXp : (currentTier?.requiredXp || 100);

    const percent = Math.min(100, Math.max(0, Math.round((userXp / Math.max(1, requiredForNext)) * 100)));
    const filledBlocks = Math.round(percent / 10);
    const progressBar = "■".repeat(filledBlocks) + "□".repeat(10 - filledBlocks);

    const claimedFreeSet = new Set(userProgress.claimedFreeTiers || []);
    const claimedVipSet = new Set(userProgress.claimedVipTiers || []);

    const tierRows = (season.tiers || []).map((t) => {
      const isUnlocked = t.level <= userLvl;
      const isFreeClaimed = claimedFreeSet.has(t.level);
      const isVipClaimed = claimedVipSet.has(t.level);

      let freeStatus = "🔒 Kilitli";
      if (isUnlocked) {
        freeStatus = isFreeClaimed ? "✅ Toplandı" : "🎁 **Alınabilir**";
      }

      let vipStatus = "🔒 Kilitli";
      if (isUnlocked) {
        if (!hasVip) {
          vipStatus = "⭐ *VIP Gerekir*";
        } else {
          vipStatus = isVipClaimed ? "✅ Toplandı" : "🎁 **Alınabilir**";
        }
      }

      const activeBadge = t.level === userLvl ? " ◀ *Şu Anki Kademe*" : "";
      return `▫️ **Kademe ${t.level}** (\`${t.requiredXp} XP\`)${activeBadge}\n  • Ücretsiz: **${t.freeReward.name}** [${freeStatus}]\n  • VIP: **${t.vipReward.name}** [${vipStatus}]`;
    }).join("\n\n");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`bp_claim_tiers:${message.author.id}`)
        .setLabel("🎁 Ödülleri Topla")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`bp_view_quests:${message.author.id}`)
        .setLabel("📜 Görevlerim")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`bp_vip_info:${message.author.id}`)
        .setLabel("⭐ VIP Sezon Bileti")
        .setStyle(hasVip ? ButtonStyle.Secondary : ButtonStyle.Primary)
    );

    const vipBadge = hasVip ? "⭐ **VIP Bilet Aktif** (Çift Ödül Yolu Açık)" : "⚪ **Standart Bilet** (VIP Pasaportu ile çift ödül açılır)";

    const content = [
      `# 🎫 ${season.seasonName}`,
      `Sezon görevlerini tamamlayıp XP kazanın, ücretsiz ve VIP özel kademe ödüllerini toplayın!`,
      "",
      `▫️ **Kullanıcı:** <@${message.author.id}> | ${vipBadge}`,
      `▫️ **Mevcut Kademe:** **Seviye ${userLvl}** / ${season.tiers?.length || 10}`,
      `▫️ **Bilet İlerlemesi:** \`[${progressBar}] %${percent}\` (\`${userXp.toLocaleString("tr-TR")} / ${requiredForNext.toLocaleString("tr-TR")} XP\`)`,
      "",
      `### 🏆 Sezon Kademeleri ve Ödül Yolu`,
      tierRows,
      "",
      `-# 💡 Görevleri görmek için \`.gorev\`, ödülleri toplamak için \`.bilet topla\` veya aşağıdaki butonları kullanabilirsiniz.`
    ].join("\n");

    if (args[0] === "topla" || args[0] === "claim") {
      const claimResult = await BattlePassService.claimTierRewards(message.guild.id, message.author.id);
      if (!claimResult.success) {
        return message.reply(MessageFormatter.warn("Ödül Yok", claimResult.reason));
      }
      const itemNote = claimResult.awardedItems.length > 0
        ? `\n▫️ **Envantere Eklenenler:** ${claimResult.awardedItems.map((i) => `\`${i.name}\``).join(", ")}`
        : "";
      return message.reply(MessageFormatter.success(
        "Ödüller Toplandı!",
        `▫️ Açılan kademelerden toplam **+${claimResult.totalCoins.toLocaleString("tr-TR")} Coin** hesabınıza aktarıldı!${itemNote}\n▫️ Toplanan Kademe Sayısı: **${claimResult.unlockedCount} Kademe**`
      ));
    }

    return message.reply(MessageFormatter.v2(content, [row]));
  }
};
