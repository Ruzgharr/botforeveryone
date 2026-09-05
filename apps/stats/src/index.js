import { BaseBot } from "@bot/core";
import { environment } from "@bot/config";
import { Stat, StaffTask } from "@bot/database";
import { Collection } from "discord.js";

import statCmd from "./commands/stat.js";
import topstatCmd from "./commands/topstat.js";
import gorevCmd from "./commands/gorev.js";
import yoklamaCmd from "./commands/yoklama.js";
import sesCmd from "./commands/ses.js";
import meCmd from "./commands/me.js";
import resetstatCmd from "./commands/resetstat.js";
import topkanalCmd from "./commands/topkanal.js";
import yetkililerCmd from "./commands/yetkililer.js";
import seviyeCmd from "./commands/seviye.js";
import topseviyeCmd from "./commands/topseviye.js";
import yetkilistatCmd from "./commands/yetkilistat.js";
import grafikCmd from "./commands/grafik.js";

const client = new BaseBot({
  serviceName: "STATS",
  token: environment.tokens.stats
});

client.voiceSessions = new Collection();

client.registerCommand(statCmd);
client.registerCommand(topstatCmd);
client.registerCommand(gorevCmd);
client.registerCommand(yoklamaCmd);
client.registerCommand(sesCmd);
client.registerCommand(meCmd);
client.registerCommand(resetstatCmd);
client.registerCommand(topkanalCmd);
client.registerCommand(yetkililerCmd);
client.registerCommand(seviyeCmd);
client.registerCommand(topseviyeCmd);
client.registerCommand(yetkilistatCmd);
client.registerCommand(grafikCmd);

client.on("ready", async () => {
  for (const guild of client.guilds.cache.values()) {
    const channels = guild.channels.cache.filter((c) => c.isVoiceBased());
    for (const channel of channels.values()) {
      for (const member of channel.members.values()) {
        if (member.user.bot) continue;
        const sessionKey = `${guild.id}_${member.id}`;
        if (!client.voiceSessions.has(sessionKey)) {
          client.voiceSessions.set(sessionKey, {
            joinedAt: Date.now(),
            channelId: channel.id,
            categoryId: channel.parentId || "uncategorized"
          });
        }
      }
    }
  }
  client.logger.success("Ses kanallarındaki mevcut üyeler başarıyla oturum hafızasına alındı.");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const config = await client.getGuildConfig(message.guild.id);
  const now = new Date();
  const weekNumber = Math.ceil(now.getDate() / 7);
  const year = now.getFullYear();
  const msgXp = config.leveling?.messageXp || 15;

  const stat = await Stat.findOneAndUpdate(
    { guildId: message.guild.id, userId: message.author.id },
    {
      $inc: {
        totalMessages: 1,
        dailyMessages: 1,
        weeklyMessages: 1,
        monthlyMessages: 1,
        xp: msgXp,
        [`channelMessages.${message.channel.id}`]: 1
      },
      $set: { lastMessageDate: now }
    },
    { upsert: true, new: true }
  );

  if (config.leveling?.enabled && stat) {
    const currentLvl = stat.level || 1;
    const requiredXp = currentLvl * currentLvl * 100;
    if (stat.xp >= requiredXp) {
      await Stat.updateOne({ _id: stat._id }, { $inc: { level: 1 } });
      const rewards = config.leveling.roleRewards || [];
      const reward = rewards.find((r) => r.level === currentLvl + 1);
      if (reward?.roleId && message.member) {
        await message.member.roles.add(reward.roleId).catch(() => null);
      }
    }
  }

  await StaffTask.findOneAndUpdate(
    { guildId: message.guild.id, userId: message.author.id, weekNumber, year },
    { $inc: { currentMessages: 1 } },
    { upsert: true }
  );
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const sessionKey = `${member.guild.id}_${member.id}`;

  if (!oldState.channelId && newState.channelId) {
    client.voiceSessions.set(sessionKey, {
      joinedAt: Date.now(),
      channelId: newState.channelId,
      categoryId: newState.channel?.parentId || "uncategorized"
    });
  } else if (oldState.channelId && !newState.channelId) {
    const session = client.voiceSessions.get(sessionKey);
    if (session) {
      const duration = Date.now() - session.joinedAt;
      client.voiceSessions.delete(sessionKey);

      const config = await client.getGuildConfig(member.guild.id);
      const now = new Date();
      const weekNumber = Math.ceil(now.getDate() / 7);
      const year = now.getFullYear();
      const durationMinutes = Math.floor(duration / 60000);
      const voiceXp = durationMinutes * (config.leveling?.voiceXpPerMinute || 20);

      const updatedStat = await Stat.findOneAndUpdate(
        { guildId: member.guild.id, userId: member.id },
        {
          $inc: {
            totalVoiceMs: duration,
            dailyVoiceMs: duration,
            weeklyVoiceMs: duration,
            monthlyVoiceMs: duration,
            xp: voiceXp,
            [`categoryVoiceMs.${session.categoryId}`]: duration,
            [`channelVoiceMs.${session.channelId}`]: duration
          }
        },
        { upsert: true, new: true }
      );

      if (config.leveling?.enabled && updatedStat) {
        const currentLvl = updatedStat.level || 1;
        const requiredXp = currentLvl * currentLvl * 100;
        if (updatedStat.xp >= requiredXp) {
          await Stat.updateOne({ _id: updatedStat._id }, { $inc: { level: 1 } });
          const rewards = config.leveling.roleRewards || [];
          const reward = rewards.find((r) => r.level === currentLvl + 1);
          if (reward?.roleId) {
            await member.roles.add(reward.roleId).catch(() => null);
          }
        }
      }

      await StaffTask.findOneAndUpdate(
        { guildId: member.guild.id, userId: member.id, weekNumber, year },
        { $inc: { currentVoiceMs: duration } },
        { upsert: true }
      );
    }
  } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
    const session = client.voiceSessions.get(sessionKey);
    if (session) {
      const duration = Date.now() - session.joinedAt;
      const now = new Date();
      const weekNumber = Math.ceil(now.getDate() / 7);
      const year = now.getFullYear();

      await Stat.findOneAndUpdate(
        { guildId: member.guild.id, userId: member.id },
        {
          $inc: {
            totalVoiceMs: duration,
            [`categoryVoiceMs.${session.categoryId}`]: duration,
            [`channelVoiceMs.${session.channelId}`]: duration
          }
        },
        { upsert: true }
      );

      await StaffTask.findOneAndUpdate(
        { guildId: member.guild.id, userId: member.id, weekNumber, year },
        { $inc: { currentVoiceMs: duration } },
        { upsert: true }
      );
    }

    client.voiceSessions.set(sessionKey, {
      joinedAt: Date.now(),
      channelId: newState.channelId,
      categoryId: newState.channel?.parentId || "uncategorized"
    });
  }
});

async function runWeeklyRewards() {
  for (const guild of client.guilds.cache.values()) {
    const config = await client.getGuildConfig(guild.id).catch(() => null);
    if (!config) continue;

    const weeklyRewards = config.weeklyRewards || [];
    if (weeklyRewards.length === 0) continue;

    const now = new Date();
    const weekNumber = Math.ceil(now.getDate() / 7);
    const year = now.getFullYear();

    const topStats = await Stat.find({ guildId: guild.id })
      .sort({ weeklyMessages: -1 })
      .limit(weeklyRewards.length);

    for (let i = 0; i < weeklyRewards.length && i < topStats.length; i++) {
      const reward = weeklyRewards[i];
      if (!reward?.roleId) continue;
      const member = await guild.members.fetch(topStats[i].userId).catch(() => null);
      if (!member) continue;

      await member.roles.add(reward.roleId).catch(() => null);

      const logChannelId = config.channels?.weeklyRewardLog;
      if (logChannelId) {
        const logChannel = guild.channels.cache.get(logChannelId);
        if (logChannel) {
          logChannel.send({
            content: `Haftalik odul: <@${member.id}> bu haftanin en aktif ${i + 1}. uyesi! <@&${reward.roleId}> rolu verildi.`
          }).catch(() => null);
        }
      }
    }

    await Stat.updateMany({ guildId: guild.id }, { $set: { weeklyMessages: 0, weeklyVoiceMs: 0 } });
  }
}

function scheduleWeeklyRewards() {
  const now = new Date();
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7));
  nextSunday.setHours(23, 59, 0, 0);

  const delay = nextSunday.getTime() - now.getTime();
  setTimeout(async () => {
    await runWeeklyRewards().catch(() => null);
    setInterval(() => {
      runWeeklyRewards().catch(() => null);
    }, 7 * 24 * 60 * 60 * 1000);
  }, delay);
}

client.on("ready", () => {
  scheduleWeeklyRewards();
});

export default client;

if (process.argv[1]?.endsWith("apps/stats/src/index.js") || process.argv[1]?.endsWith("apps\\stats\\src\\index.js")) {
  client.start();
}
