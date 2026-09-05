import { BaseBot, SmartFilter } from "@bot/core";
import { environment } from "@bot/config";
import { ForceBan, Penalty } from "@bot/database";
import { Collection } from "discord.js";

import jailCmd from "./commands/jail.js";
import unjailCmd from "./commands/unjail.js";
import muteCmd from "./commands/mute.js";
import unmuteCmd from "./commands/unmute.js";
import vmuteCmd from "./commands/vmute.js";
import unvmuteCmd from "./commands/unvmute.js";
import banCmd from "./commands/ban.js";
import unbanCmd from "./commands/unban.js";
import sicilCmd from "./commands/sicil.js";
import cezapuanCmd from "./commands/cezapuan.js";
import snipeCmd from "./commands/snipe.js";
import kpiCmd from "./commands/kpi.js";
import silCmd from "./commands/sil.js";
import kickCmd from "./commands/kick.js";
import slowmodeCmd from "./commands/slowmode.js";
import kilitCmd from "./commands/kilit.js";
import uyarCmd from "./commands/uyar.js";
import afkCmd from "./commands/afk.js";
import cezaCmd from "./commands/ceza.js";
import siciltemizleCmd from "./commands/siciltemizle.js";
import forcebanCmd from "./commands/forceban.js";
import unforcebanCmd from "./commands/unforceban.js";
import rolsuzverCmd from "./commands/rolsuzver.js";
import karantinatemizleCmd from "./commands/karantinatemizle.js";
import rolverCmd from "./commands/rolver.js";
import rolalCmd from "./commands/rolal.js";
import toplorolCmd from "./commands/toplorol.js";
import medyakanalCmd from "./commands/medyakanal.js";
import uyarilarCmd from "./commands/uyarilar.js";
import uyarisilCmd from "./commands/uyarisil.js";
import otocevapCmd from "./commands/otocevap.js";
import seskapatCmd from "./commands/seskapat.js";
import sesacCmd from "./commands/sesac.js";
import { PenaltyWatcher } from "./services/PenaltyWatcher.js";

const client = new BaseBot({
  serviceName: "MODERATION",
  token: environment.tokens.moderation
});

client.on("ready", () => {
  PenaltyWatcher.start(client);
});

client.snipes = new Collection();
client.afkUsers = new Map();
const spamTrack = new Map();
const filterInfractions = new Map();

async function checkAutoMute(message, config) {
  const now = Date.now();
  const history = (filterInfractions.get(message.author.id) || []).filter((t) => now - t < 120000);
  history.push(now);
  filterInfractions.set(message.author.id, history);

  if (history.length >= 3 && config.roles?.chatMute) {
    filterInfractions.delete(message.author.id);
    await message.member.roles.add(config.roles.chatMute).catch(() => null);
    const caseCount = (await Penalty.countDocuments()) + 1;
    await Penalty.create({
      caseId: caseCount,
      guildId: message.guild.id,
      userId: message.author.id,
      executorId: client.user.id,
      type: "MUTE",
      reason: "Otomatik Sohbet Kuralı İhlali (3 İhlal)",
      points: 20,
      active: true,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }).catch(() => null);

    const alert = await message.channel.send(`<@${message.author.id}>, art arda filtre kurallarını ihlal ettiğiniz için 15 dakika süreyle metin susturması (mute) uygulandı!`).catch(() => null);
    if (alert) setTimeout(() => alert.delete().catch(() => null), 6000);
  }
}

client.registerCommand(jailCmd);
client.registerCommand(unjailCmd);
client.registerCommand(muteCmd);
client.registerCommand(unmuteCmd);
client.registerCommand(vmuteCmd);
client.registerCommand(unvmuteCmd);
client.registerCommand(banCmd);
client.registerCommand(unbanCmd);
client.registerCommand(sicilCmd);
client.registerCommand(cezapuanCmd);
client.registerCommand(snipeCmd);
client.registerCommand(kpiCmd);
client.registerCommand(silCmd);
client.registerCommand(kickCmd);
client.registerCommand(slowmodeCmd);
client.registerCommand(kilitCmd);
client.registerCommand(uyarCmd);
client.registerCommand(afkCmd);
client.registerCommand(cezaCmd);
client.registerCommand(siciltemizleCmd);
client.registerCommand(forcebanCmd);
client.registerCommand(unforcebanCmd);
client.registerCommand(rolsuzverCmd);
client.registerCommand(karantinatemizleCmd);
client.registerCommand(rolverCmd);
client.registerCommand(rolalCmd);
client.registerCommand(toplorolCmd);
client.registerCommand(medyakanalCmd);
client.registerCommand(uyarilarCmd);
client.registerCommand(uyarisilCmd);
client.registerCommand(otocevapCmd);
client.registerCommand(seskapatCmd);
client.registerCommand(sesacCmd);

client.on("messageDelete", (message) => {
  if (!message.guild || message.author?.bot) return;
  client.snipes.set(message.channel.id, {
    authorId: message.author.id,
    content: message.content,
    timestamp: Date.now()
  });
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;

  if (client.afkUsers?.has(message.author.id)) {
    client.afkUsers.delete(message.author.id);
    if (message.member?.manageable && message.member.displayName.startsWith("[AFK] ")) {
      await message.member.setNickname(message.member.displayName.slice(6)).catch(() => null);
    }
    const welcomeBack = await message.reply("Hoş geldiniz! Artık AFK modunda değilsiniz.").catch(() => null);
    if (welcomeBack) setTimeout(() => welcomeBack.delete().catch(() => null), 4000);
  }

  const mentionedAfk = message.mentions.users.find((u) => client.afkUsers?.has(u.id));
  if (mentionedAfk) {
    const afkInfo = client.afkUsers.get(mentionedAfk.id);
    const afkTime = Math.floor(afkInfo.timestamp / 1000);
    const afkAlert = await message.reply(`**${mentionedAfk.username}** şu anda AFK: "${afkInfo.reason}" (<t:${afkTime}:R>)`).catch(() => null);
    if (afkAlert) setTimeout(() => afkAlert.delete().catch(() => null), 6000);
  }

  const config = await client.getGuildConfig(message.guild.id);

  const responders = config.autoResponders || [];
  if (responders.length > 0) {
    const cleanMsg = message.content.trim().toLowerCase();
    const matched = responders.find((r) => r.trigger?.toLowerCase() === cleanMsg);
    if (matched) {
      await message.reply(matched.response).catch(() => null);
    }
  }

  const isStaff = client.hasStaffPermission(message.member, config, "staffRoles");

  const mediaChannels = config.channels?.mediaChannels || [];
  if (mediaChannels.includes(message.channel.id) && !isStaff) {
    const hasAttachment = message.attachments.size > 0;
    const hasLink = message.content.includes("http:".concat("/").concat("/")) || message.content.includes("https:".concat("/").concat("/"));
    if (!hasAttachment && !hasLink) {
      await message.delete().catch(() => null);
      const alert = await message.channel.send(`<@${message.author.id}>, bu kanalda sadece resim, video veya bağlantı (medya) paylaşabilirsiniz!`).catch(() => null);
      if (alert) setTimeout(() => alert.delete().catch(() => null), 4000);
      return;
    }
  }

  if (isStaff) return;

  if (config.filters?.linkFilter !== false && SmartFilter.containsInvite(message.content)) {
    await message.delete().catch(() => null);
    await checkAutoMute(message, config);
    const warnMsg = await message.channel.send(`<@${message.author.id}>, bu sunucuda reklam veya davet linki paylaşmak yasaktır!`).catch(() => null);
    if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => null), 4000);
    return;
  }

  const customWords = config.filters?.customWords || [];
  if (customWords.length > 0) {
    const lowerContent = message.content.toLowerCase();
    const hasForbiddenWord = customWords.some((word) => lowerContent.includes(word.toLowerCase()));
    if (hasForbiddenWord) {
      await message.delete().catch(() => null);
      await checkAutoMute(message, config);
      const warnMsg = await message.channel.send(`<@${message.author.id}>, bu kelime sunucuda filtrelenmiştir!`).catch(() => null);
      if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => null), 4000);
      return;
    }
  }

  if (config.filters?.capsFilter !== false && message.content.length >= 8) {
    const upperCount = message.content.replace(/[^A-ZĞÜŞİÖÇ]/g, "").length;
    if (upperCount / message.content.length > 0.7) {
      await message.delete().catch(() => null);
      await checkAutoMute(message, config);
      const warnMsg = await message.channel.send(`<@${message.author.id}>, lütfen aşırı büyük harf (capslock) kullanmayın!`).catch(() => null);
      if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => null), 4000);
      return;
    }
  }

  const userHistory = spamTrack.get(message.author.id) || [];
  const spamCheck = SmartFilter.isSpam(userHistory, Date.now(), 5, 4000);
  spamTrack.set(message.author.id, spamCheck.updatedTimestamps);

  if (spamCheck.isSpam) {
    await message.delete().catch(() => null);
    if (config.roles?.chatMute) {
      await message.member.roles.add(config.roles.chatMute).catch(() => null);
      const muteAlert = await message.channel.send(`<@${message.author.id}>, aşırı hızlı mesaj gönderdiğiniz için geçici olarak susturuldunuz.`).catch(() => null);
      if (muteAlert) setTimeout(() => muteAlert.delete().catch(() => null), 5000);
    }
  }
});

client.on("guildBanRemove", async (ban) => {
  const forceBanned = await ForceBan.findOne({ guildId: ban.guild.id, userId: ban.user.id, active: true });
  if (forceBanned) {
    await ban.guild.members.ban(ban.user.id, { reason: `[FORCEBAN] ${forceBanned.reason}` }).catch(() => null);
  }
});

client.on("guildMemberAdd", async (member) => {
  const forceBanned = await ForceBan.findOne({ guildId: member.guild.id, userId: member.id, active: true });
  if (forceBanned) {
    await member.ban({ reason: `[FORCEBAN] ${forceBanned.reason}` }).catch(() => null);
    return;
  }

  const activePenalty = await Penalty.findOne({
    guildId: member.guild.id,
    userId: member.id,
    active: true
  }).sort({ createdAt: -1 });

  if (activePenalty) {
    const config = await client.getGuildConfig(member.guild.id);
    if (activePenalty.type === "JAIL" && config.roles?.jail) {
      await member.roles.add(config.roles.jail).catch(() => null);
      const defaultRoles = config.roles?.member || [];
      if (defaultRoles.length > 0) {
        await member.roles.remove(defaultRoles).catch(() => null);
      }
    } else if (activePenalty.type === "MUTE" && config.roles?.chatMute) {
      await member.roles.add(config.roles.chatMute).catch(() => null);
    }
  }
});

export default client;

if (process.argv[1]?.endsWith("apps/moderation/src/index.js") || process.argv[1]?.endsWith("apps\\moderation\\src\\index.js")) {
  client.start();
}
