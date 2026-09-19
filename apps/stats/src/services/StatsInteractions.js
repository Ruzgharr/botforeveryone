import { Stat, StaffTask } from "@bot/database";
import { VisualCard } from "@bot/core";
import { AttachmentBuilder } from "discord.js";
import { StatsUI } from "./StatsUI.js";

export function registerStatsInteractions(client) {
  client.registerInteraction("stats_user_period", async ({ client: bot, interaction }) => {
    const parts = interaction.customId.split(":");
    const targetUserId = parts[1];
    const period = parts[2] || "all";

    const stat = await Stat.findOne({ guildId: interaction.guild.id, userId: targetUserId });
    const targetUser = await bot.users.fetch(targetUserId).catch(() => ({ id: targetUserId, username: targetUserId }));

    const payload = StatsUI.formatUserStatPayload({
      targetUser,
      stat,
      period
    });

    await interaction.update(payload);
  });

  client.registerInteraction("stats_top_tab", async ({ interaction }) => {
    const parts = interaction.customId.split(":");
    const category = parts[1] === "refresh" ? (parts[2] || "voice") : parts[1];

    const topVoice = await Stat.find({ guildId: interaction.guild.id }).sort({ totalVoiceMs: -1 }).limit(10);
    const topMessages = await Stat.find({ guildId: interaction.guild.id }).sort({ totalMessages: -1 }).limit(10);

    const payload = StatsUI.formatTopStatPayload({
      guild: interaction.guild,
      topVoice,
      topMessages,
      category
    });

    await interaction.update(payload);
  });

  client.registerInteraction("stats_level_view", async ({ client: bot, interaction, config }) => {
    const targetUserId = interaction.customId.split(":")[1];
    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    if (!member) {
      return interaction.reply({ content: "Üye sunucuda bulunamadı.", ephemeral: true });
    }

    const stat = await Stat.findOne({ guildId: interaction.guild.id, userId: targetUserId });
    const currentXp = stat?.xp || 0;
    const currentLvl = stat?.level || 1;

    const rank = await Stat.countDocuments({ guildId: interaction.guild.id, xp: { $gt: currentXp } }) + 1;
    const totalRanked = await Stat.countDocuments({ guildId: interaction.guild.id });

    const rewards = config.leveling?.roleRewards || [];
    const nextReward = rewards.find((r) => r.level > currentLvl);

    const payload = StatsUI.formatLevelPayload({
      targetMember: member,
      stat,
      rank,
      totalRanked,
      nextReward
    });

    await interaction.reply({ ...payload, ephemeral: true });
  });

  client.registerInteraction("stats_task_refresh", async ({ client: bot, interaction }) => {
    const targetUserId = interaction.customId.split(":")[1];
    const targetUser = await bot.users.fetch(targetUserId).catch(() => ({ id: targetUserId, username: targetUserId }));

    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    const year = now.getFullYear();

    const task = await StaffTask.findOne({ guildId: interaction.guild.id, userId: targetUserId, weekNumber, year });

    const currentVoiceHours = Math.floor((task?.currentVoiceMs || 0) / (1000 * 60 * 60));
    const targetVoiceHours = Math.floor((task?.targetVoiceMs || 36000000) / (1000 * 60 * 60));

    const currentMsgs = task?.currentMessages || 0;
    const targetMsgs = task?.targetMessages || 500;

    const currentRegs = task?.currentRegisters || 0;
    const targetRegs = task?.targetRegisters || 5;

    const payload = StatsUI.formatTaskPayload({
      targetUser,
      task,
      currentVoiceHours,
      targetVoiceHours,
      currentMsgs,
      targetMsgs,
      currentRegs,
      targetRegs
    });

    await interaction.update(payload);
  });

  client.registerInteraction("stats_anim_view", async ({ client: bot, interaction }) => {
    const targetUserId = interaction.customId.split(":")[1];
    await interaction.deferReply();
    const stat = await Stat.findOne({ guildId: interaction.guild.id, userId: targetUserId });
    const targetUser = await bot.users.fetch(targetUserId).catch(() => interaction.user);
    const hours = Math.round((stat?.totalVoiceMs || 0) / (1000 * 60 * 60));

    const gifBuffer = await VisualCard.renderAnimatedUserStatCard({
      user: targetUser,
      periodText: "Genel",
      voiceHours: hours,
      messageCount: stat?.totalMessages || 0,
      level: stat?.level || 1,
      rank: 1,
      theme: stat?.cardTheme || "sakura",
      format: "gif"
    });

    const attachment = new AttachmentBuilder(gifBuffer, { name: "stat-card.gif" });
    const payload = StatsUI.formatUserStatPayload({
      targetUser,
      stat,
      period: "all",
      mediaUrl: "attachment://stat-card.gif"
    });
    await interaction.editReply({
      ...payload,
      files: [attachment]
    });
  });

  client.registerInteraction("stats_level_anim", async ({ client: bot, interaction }) => {
    const targetUserId = interaction.customId.split(":")[1] || interaction.user.id;
    await interaction.deferReply();
    const stat = await Stat.findOne({ guildId: interaction.guild.id, userId: targetUserId });
    const targetUser = await bot.users.fetch(targetUserId).catch(() => interaction.user);
    const currentXp = stat?.xp || 0;
    const currentLvl = stat?.level || 1;
    const rank = await Stat.countDocuments({ guildId: interaction.guild.id, xp: { $gt: currentXp } }) + 1;
    const requiredXp = currentLvl * currentLvl * 100;

    const gifBuffer = await VisualCard.renderAnimatedLevelCard({
      user: targetUser,
      level: currentLvl,
      currentXp,
      requiredXp,
      rank,
      theme: stat?.cardTheme || "sakura",
      format: "gif"
    });

    const attachment = new AttachmentBuilder(gifBuffer, { name: "level-live.gif" });
    const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);
    const payload = StatsUI.formatLevelPayload({
      targetMember: member || { displayName: targetUser.username, user: targetUser },
      stat,
      rank,
      totalRanked: await Stat.countDocuments({ guildId: interaction.guild.id }),
      nextReward: null,
      mediaUrl: "attachment://level-live.gif"
    });
    await interaction.editReply({
      ...payload,
      files: [attachment]
    });
  });

  client.registerInteraction("bp_claim_tiers", async ({ interaction }) => {
    const targetUserId = interaction.customId.split(":")[1];
    if (targetUserId && targetUserId !== interaction.user.id) {
      return interaction.reply({ content: "Yalnızca kendi sezon ödüllerinizi toplayabilirsiniz.", ephemeral: true });
    }

    const { BattlePassService } = await import("./BattlePassService.js");
    const res = await BattlePassService.claimTierRewards(interaction.guild.id, interaction.user.id);
    if (!res.success) {
      return interaction.reply({ content: `⚠️ ${res.reason}`, ephemeral: true });
    }

    const itemNote = res.awardedItems.length > 0
      ? `\n▫️ **Envantere Eklenenler:** ${res.awardedItems.map((i) => `\`${i.name}\``).join(", ")}`
      : "";

    return interaction.reply({
      content: `🎉 **Sezon Ödülleri Toplandı!**\n▫️ **Kazanılan Coin:** \`+${res.totalCoins.toLocaleString("tr-TR")} Coin\`${itemNote}\n▫️ Toplanan Kademe Sayısı: **${res.unlockedCount} Kademe**`,
      ephemeral: true
    });
  });

  client.registerInteraction("bp_claim_all_quests", async ({ interaction }) => {
    const targetUserId = interaction.customId.split(":")[1];
    if (targetUserId && targetUserId !== interaction.user.id) {
      return interaction.reply({ content: "Yalnızca kendi görev ödüllerinizi toplayabilirsiniz.", ephemeral: true });
    }

    const { BattlePassService } = await import("./BattlePassService.js");
    const { userProgress } = await BattlePassService.getUserProgress(interaction.guild.id, interaction.user.id);

    let anyClaimed = false;
    let totalXp = 0;
    let totalCoin = 0;

    for (const dq of userProgress.dailyQuests || []) {
      if (dq.completed && !dq.claimed) {
        const res = await BattlePassService.claimQuestReward(interaction.guild.id, interaction.user.id, dq.questId, false);
        if (res.success) {
          anyClaimed = true;
          totalXp += res.gainedXp;
          totalCoin += res.gainedCoin;
        }
      }
    }

    for (const wq of userProgress.weeklyQuests || []) {
      if (wq.completed && !wq.claimed) {
        const res = await BattlePassService.claimQuestReward(interaction.guild.id, interaction.user.id, wq.questId, true);
        if (res.success) {
          anyClaimed = true;
          totalXp += res.gainedXp;
          totalCoin += res.gainedCoin;
        }
      }
    }

    if (!anyClaimed) {
      return interaction.reply({ content: "Şu anda ödülü toplanabilir tamamlanmış bir görev bulunmuyor.", ephemeral: true });
    }

    return interaction.reply({
      content: `🎉 **Görev Ödülleri Alındı!**\n▫️ Toplam **+${totalXp.toLocaleString("tr-TR")} Bilet XP** ve **+${totalCoin.toLocaleString("tr-TR")} Coin** hesabınıza eklendi!`,
      ephemeral: true
    });
  });

  client.registerInteraction("bp_vip_info", async ({ interaction }) => {
    return interaction.reply({
      content: `⭐ **VIP Sezon Bileti Nasıl Açılır?**\n\nVIP Sezon Bileti sayesinde her kademede standart ödüllerin yanı sıra **özel anime temaları, efsanevi aletler ve 3 kat daha fazla Coin** kazanırsınız!\n\n▫️ **Aktivasyon:** Envanterinizde \`item_vippass\` (VIP Pasaportu) bulunması yeterlidir.\n▫️ **Satın Alma:** \`.satınal item_vippass\` veya \`.itemmarket\` üzerinden edinebilirsiniz.`,
      ephemeral: true
    });
  });
}
