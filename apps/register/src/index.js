import { BaseBot, Embeds, MessageFormatter } from "@bot/core";
import { environment } from "@bot/config";
import { UserAccount, StaffTask, StaffKpi, InviteRecord } from "@bot/database";

import kayitCmd from "./commands/kayit.js";
import isimCmd from "./commands/isim.js";
import isimlerCmd from "./commands/isimler.js";
import sayCmd from "./commands/say.js";
import tagtaraCmd from "./commands/tagtara.js";
import kayitbilgiCmd from "./commands/kayitbilgi.js";
import kayitsizCmd from "./commands/kayitsiz.js";
import topteyitCmd from "./commands/topteyit.js";
import vipCmd from "./commands/vip.js";
import davetCmd from "./commands/davet.js";
import davetekleCmd from "./commands/davetekle.js";
import cihazCmd from "./commands/cihaz.js";
import kayitsifirlaCmd from "./commands/kayitsifirla.js";
import teyitsifirlaCmd from "./commands/teyitsifirla.js";
import dogrulamaCmd from "./commands/dogrulama.js";
import gckontrolCmd from "./commands/gckontrol.js";

const client = new BaseBot({
  serviceName: "REGISTER",
  token: environment.tokens.register
});

client.guildInvites = new Map();

client.registerCommand(kayitCmd);
client.registerCommand(isimCmd);
client.registerCommand(isimlerCmd);
client.registerCommand(sayCmd);
client.registerCommand(tagtaraCmd);
client.registerCommand(kayitbilgiCmd);
client.registerCommand(kayitsizCmd);
client.registerCommand(topteyitCmd);
client.registerCommand(vipCmd);
client.registerCommand(davetCmd);
client.registerCommand(davetekleCmd);
client.registerCommand(cihazCmd);
client.registerCommand(kayitsifirlaCmd);
client.registerCommand(teyitsifirlaCmd);
client.registerCommand(dogrulamaCmd);
client.registerCommand(gckontrolCmd);

client.registerInteraction("verify_human", async ({ interaction, config }) => {
  const unregRoles = config.roles?.unregistered || [];
  if (unregRoles.length > 0) {
    await interaction.member.roles.add(unregRoles).catch(() => null);
  }
  await interaction.reply({
    content: "✅ İnsan doğrulamanız başarıyla tamamlandı! Kayıt odalarına ve sohbet kanallarına erişebilirsiniz.",
    ephemeral: true
  });
});

client.registerInteraction("reg_", async ({ client, interaction, config }) => {
  if (!client.hasStaffPermission(interaction.member, config, "registerStaff")) {
    return interaction.reply({ content: "Bu işlemi yapabilmek için yetkiniz bulunmuyor.", ephemeral: true });
  }

  const parts = interaction.customId.split("_");
  const genderType = parts[1];
  const targetId = parts[2];
  const name = parts[3];
  const age = parseInt(parts[4], 10);

  const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
  if (!targetMember) {
    return interaction.reply({ content: "Kullanıcı sunucuda bulunamadı.", ephemeral: true });
  }

  let rolesToAdd = [];
  let roleLabel = "";
  let genderEnum = "UNREGISTERED";

  if (genderType === "man") {
    rolesToAdd = config.roles?.man || [];
    roleLabel = "Erkek";
    genderEnum = "MAN";
  } else if (genderType === "woman") {
    rolesToAdd = config.roles?.woman || [];
    roleLabel = "Kadın";
    genderEnum = "WOMAN";
  } else {
    rolesToAdd = config.roles?.member || [];
    roleLabel = "Üye";
    genderEnum = "MEMBER";
  }

  const unregRoles = config.roles?.unregistered || [];
  if (unregRoles.length > 0) {
    await targetMember.roles.remove(unregRoles).catch(() => null);
  }

  if (rolesToAdd.length > 0) {
    await targetMember.roles.add(rolesToAdd).catch(() => null);
  }

  await UserAccount.findOneAndUpdate(
    { guildId: interaction.guild.id, userId: targetMember.id },
    {
      $set: {
        name,
        age,
        gender: genderEnum,
        registeredBy: interaction.user.id,
        registeredAt: new Date()
      },
      $push: {
        namesHistory: {
          name,
          age,
          roleAssigned: roleLabel,
          staffId: interaction.user.id,
          date: new Date()
        }
      }
    },
    { upsert: true }
  );

  const now = new Date();
  const weekNumber = Math.ceil(now.getDate() / 7);
  const year = now.getFullYear();

  await StaffTask.findOneAndUpdate(
    { guildId: interaction.guild.id, userId: interaction.user.id, weekNumber, year },
    { $inc: { currentRegisters: 1, points: 5 } },
    { upsert: true }
  );

  const regLogId = config.channels?.registerLog;
  if (regLogId) {
    const regLog = interaction.guild.channels.cache.get(regLogId);
    if (regLog) {
      regLog.send({
        embeds: [
          Embeds.success(
            "Kayıt İşlemi Başarılı",
            `• **Kaydedilen:** ${targetMember} (${targetMember.id})\n• **Yetkili:** ${interaction.user} (${interaction.user.id})\n• **Cinsiyet / Rol:** ${roleLabel}\n• **İsim / Yaş:** ${name} | ${age}`,
            interaction.guild
          )
        ]
      });
    }
  }

  const successPayload = MessageFormatter.render("registerSuccess", {
    user: targetMember,
    staff: interaction.user,
    gender: roleLabel,
    title: "Kayıt Başarılı"
  }, config, interaction.guild);

  await StaffKpi.findOneAndUpdate(
    { guildId: interaction.guild.id, staffId: interaction.user.id, period: "WEEKLY" },
    { $inc: { registers: 1, totalScore: 5 } },
    { upsert: true }
  ).catch(() => {});

  interaction.update({
    ...successPayload,
    components: []
  });
});

client.on("ready", async () => {
  for (const guild of client.guilds.cache.values()) {
    try {
      const firstInvites = await guild.invites.fetch();
      client.guildInvites.set(guild.id, new Map(firstInvites.map((inv) => [inv.code, inv.uses])));
    } catch {}
  }
});

client.on("guildMemberAdd", async (member) => {
  const config = await client.getGuildConfig(member.guild.id);
  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  const hasNoAvatar = !member.user.avatar;
  const isSuspicious = accountAgeDays < 7 || (accountAgeDays < 14 && hasNoAvatar);

  let usedInvite = null;
  const cachedInvites = client.guildInvites?.get(member.guild.id);
  if (cachedInvites) {
    try {
      const newInvites = await member.guild.invites.fetch();
      for (const [code, inv] of newInvites.entries()) {
        const cachedUses = cachedInvites.get(code) || 0;
        if (inv.uses > cachedUses) {
          usedInvite = inv;
          break;
        }
      }
      client.guildInvites.set(member.guild.id, new Map(newInvites.map((inv) => [inv.code, inv.uses])));
    } catch {}
  }

  if (usedInvite && usedInvite.inviter) {
    const inviterId = usedInvite.inviter.id;
    if (isSuspicious) {
      await InviteRecord.findOneAndUpdate(
        { guildId: member.guild.id, userId: inviterId },
        {
          $inc: { fake: 1 },
          $push: { invitedUsers: { userId: member.id, isFake: true, joinedAt: new Date() } }
        },
        { upsert: true }
      );
    } else {
      await InviteRecord.findOneAndUpdate(
        { guildId: member.guild.id, userId: inviterId },
        {
          $inc: { regular: 1 },
          $push: { invitedUsers: { userId: member.id, isFake: false, joinedAt: new Date() } }
        },
        { upsert: true }
      );
    }

    const inviteLogId = config.channels?.inviteLog;
    if (inviteLogId) {
      const inviteLog = member.guild.channels.cache.get(inviteLogId);
      if (inviteLog) {
        const invRecord = await InviteRecord.findOne({ guildId: member.guild.id, userId: inviterId });
        const totalInv = Math.max(0, (invRecord?.regular || 0) + (invRecord?.bonus || 0) - (invRecord?.leaves || 0));
        inviteLog.send({
          embeds: [
            Embeds.info(
              "Üye Katıldı",
              `• **Katılan:** ${member} (\`${member.id}\`)\n• **Davet Eden:** <@${inviterId}> (\`${inviterId}\`)\n• **Davet Sayısı:** \`${totalInv}\` davet\n• **Davet Kodu:** \`${usedInvite.code}\``,
              member.guild
            )
          ]
        }).catch(() => null);
      }
    }
  }

  if (isSuspicious) {
    const suspiciousRoleId = config.roles?.suspicious;
    if (suspiciousRoleId) {
      await member.roles.add(suspiciousRoleId).catch(() => null);
    }
    const regChatId = config.channels?.registerChat;
    if (regChatId) {
      const regChat = member.guild.channels.cache.get(regChatId);
      if (regChat) {
        const susPayload = MessageFormatter.render("suspiciousAlert", {
          user: member,
          title: "Şüpheli Hesap Karantinası"
        }, config, member.guild);
        regChat.send({ content: `${member}`, ...susPayload });
      }
    }
    return;
  }

  const unregRoles = config.roles?.unregistered || [];
  if (unregRoles.length > 0) {
    await member.roles.add(unregRoles).catch(() => null);
  }

  const initialNick = config.tag ? `${config.tag} İsim | Yaş` : "İsim | Yaş";
  await member.setNickname(initialNick).catch(() => null);

  const regChatId = config.channels?.registerChat;
  if (regChatId) {
    const regChat = member.guild.channels.cache.get(regChatId);
    if (regChat) {
      const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / (24 * 60 * 60 * 1000));
      const trustBadge = accountAgeDays >= 7 ? "🟢 Güvenilir Hesap" : "🔴 Şüpheli Hesap (7 günden yeni)";
      const staffPing = (config.roles?.registerStaff || []).map((r) => `<@&${r}>`).join(" ");

      const welcomeEmbed = Embeds.base("Aramıza Hoş Geldin!", null, member.guild)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(
          `Merhaba ${member}, **${member.guild.name}** sunucumuza hoş geldin!\n\n`
          + `• **Hesap Kuruluş:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R> (${trustBadge})\n`
          + `• **Sunucu Nüfusu:** **${member.guild.memberCount}.** üyemizsin\n`
          + `• **Tag Durumu:** Sunucu tagımızı (\`${config.tag || "Yok"}\`) alarak ailemize katılabilirsin.\n\n`
          + `Kayıt olmak için lütfen ses teyit odalarına bağlanın. Yetkili ekibimiz sizinle ilgilenecektir.`
        )
        .setFooter({ text: "Kayıt ve Teyit Sistemi | Public Bot Ecosystem", iconURL: member.guild.iconURL() });

      regChat.send({ content: `${member} ${staffPing}`.trim(), embeds: [welcomeEmbed] }).catch(() => null);
    }
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  if (!oldState.channelId && newState.channelId && !newState.member?.user?.bot) {
    const config = await client.getGuildConfig(newState.guild.id);
    const welcomeVoiceChannels = config.channels?.welcomeVoice || [];
    if (welcomeVoiceChannels.includes(newState.channelId)) {
      const unregRoles = config.roles?.unregistered || [];
      const isUnregistered = unregRoles.some((r) => newState.member.roles.cache.has(r));
      if (isUnregistered) {
        const regChatId = config.channels?.registerChat;
        if (regChatId) {
          const regChat = newState.guild.channels.cache.get(regChatId);
          if (regChat) {
            const staffRoles = config.roles?.registerStaff || [];
            const pingStr = staffRoles.length > 0 ? staffRoles.map((r) => `<@&${r}>`).join(" ") : "Yetkililer";
            regChat.send({
              content: `🔔 ${pingStr}, ${newState.member} kullanıcısı <#${newState.channelId}> ses teyit odasına katıldı ve kayıt bekliyor!`
            }).catch(() => null);
          }
        }
      }
    }
  }
});

client.on("guildMemberRemove", async (member) => {
  const config = await client.getGuildConfig(member.guild.id);
  const invRecord = await InviteRecord.findOne({
    guildId: member.guild.id,
    "invitedUsers.userId": member.id
  });

  if (invRecord) {
    await InviteRecord.updateOne(
      { _id: invRecord._id },
      { $inc: { leaves: 1 } }
    );

    const inviteLogId = config.channels?.inviteLog;
    if (inviteLogId) {
      const inviteLog = member.guild.channels.cache.get(inviteLogId);
      if (inviteLog) {
        const totalInv = Math.max(0, invRecord.regular + invRecord.bonus - (invRecord.leaves + 1));
        inviteLog.send({
          embeds: [
            Embeds.warn(
              "Üye Ayrıldı",
              `• **Ayrılan:** ${member.user.tag} (\`${member.id}\`)\n• **Davet Eden:** <@${invRecord.userId}>\n• **Kalan Davet:** \`${totalInv}\` davet`,
              member.guild
            )
          ]
        }).catch(() => null);
      }
    }
  }
});

client.on("userUpdate", async (oldUser, newUser) => {
  if (oldUser.username === newUser.username && oldUser.globalName === newUser.globalName) return;

  for (const guild of client.guilds.cache.values()) {
    const config = await client.getGuildConfig(guild.id);
    if (!config.tag || !config.roles?.tagRole) continue;

    const member = await guild.members.fetch(newUser.id).catch(() => null);
    if (!member) continue;

    const tag = config.tag;
    const oldHasTag = (oldUser.username && oldUser.username.includes(tag)) || (oldUser.globalName && oldUser.globalName.includes(tag));
    const newHasTag = (newUser.username && newUser.username.includes(tag)) || (newUser.globalName && newUser.globalName.includes(tag));

    if (!oldHasTag && newHasTag) {
      await member.roles.add(config.roles.tagRole).catch(() => null);
      const regChatId = config.channels?.registerChat || config.channels?.generalChat;
      if (regChatId) {
        const channel = guild.channels.cache.get(regChatId);
        if (channel) {
          channel.send({
            embeds: [
              Embeds.success("Tag Aldı!", `${member} sunucu tagımızı (\`${tag}\`) ismine ekleyerek aramıza katıldı!`, guild)
            ]
          }).catch(() => null);
        }
      }
    } else if (oldHasTag && !newHasTag) {
      await member.roles.remove(config.roles.tagRole).catch(() => null);
      const regLogId = config.channels?.registerLog;
      if (regLogId) {
        const logChannel = guild.channels.cache.get(regLogId);
        if (logChannel) {
          logChannel.send({
            embeds: [
              Embeds.warn("Tag Bıraktı", `${member} sunucu tagımızı (\`${tag}\`) isminden çıkardı ve tag rolü alındı.`, guild)
            ]
          }).catch(() => null);
        }
      }
    }
  }
});

export default client;

if (process.argv[1]?.endsWith("apps/register/src/index.js") || process.argv[1]?.endsWith("apps\\register\\src\\index.js")) {
  client.start();
}
