import { BaseBot, MessageFormatter } from "@bot/core";
import { environment } from "@bot/config";
import { Ticket } from "@bot/database";
import { ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, UserSelectMenuBuilder } from "discord.js";
import ticketkurCmd from "./commands/ticketkur.js";
import cekilisCmd from "./commands/cekilis.js";
import avatarCmd from "./commands/avatar.js";
import bannerCmd from "./commands/banner.js";
import sunucuCmd from "./commands/sunucu.js";
import pingCmd from "./commands/ping.js";
import rolbilgiCmd from "./commands/rolbilgi.js";
import kanalbilgiCmd from "./commands/kanalbilgi.js";
import kurallarCmd from "./commands/kurallar.js";
import rerollCmd from "./commands/reroll.js";
import kullanicibilgiCmd from "./commands/kullanicibilgi.js";
import anketCmd from "./commands/anket.js";
import odapanelCmd from "./commands/odapanel.js";
import butonrolCmd from "./commands/butonrol.js";
import radyoCmd from "./commands/radyo.js";
import birlikteCmd from "./commands/birlikte.js";
import oneriCmd from "./commands/oneri.js";
import itirafCmd from "./commands/itiraf.js";
import dogumgunuCmd from "./commands/dogumgunu.js";
import { registerUtilityInteractions } from "./services/UtilityInteractions.js";

const client = new BaseBot({
  serviceName: "UTILITY",
  token: environment.tokens.utility
});

registerUtilityInteractions(client);

client.activeCustomRooms = new Collection();
client.giveaways = new Collection();
client.activePolls = new Collection();
client.activeSuggestions = new Collection();
client.activeRadio = new Map();
client.afkVoiceTimers = new Map();

client.registerCommand(ticketkurCmd);
client.registerCommand(cekilisCmd);
client.registerCommand(avatarCmd);
client.registerCommand(bannerCmd);
client.registerCommand(sunucuCmd);
client.registerCommand(pingCmd);
client.registerCommand(rolbilgiCmd);
client.registerCommand(kanalbilgiCmd);
client.registerCommand(kurallarCmd);
client.registerCommand(rerollCmd);
client.registerCommand(kullanicibilgiCmd);
client.registerCommand(anketCmd);
client.registerCommand(odapanelCmd);
client.registerCommand(butonrolCmd);
client.registerCommand(radyoCmd);
client.registerCommand(birlikteCmd);
client.registerCommand(oneriCmd);
client.registerCommand(itirafCmd);
client.registerCommand(dogumgunuCmd);

client.on("voiceStateUpdate", async (oldState, newState) => {
  const member = newState.member || oldState.member;
  if (!member || member.user.bot) return;

  const config = await client.getGuildConfig(member.guild.id);
  const generatorChannelId = config.channels?.customVoiceChannel;

  if (newState.channelId && newState.channelId === generatorChannelId) {
    const parentCategory = config.channels?.customVoiceCategory || newState.channel?.parentId;

    const createdChannel = await member.guild.channels.create({
      name: `${member.displayName} Odası`,
      type: ChannelType.GuildVoice,
      parent: parentCategory || null,
      permissionOverwrites: [
        {
          id: member.guild.id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak]
        },
        {
          id: member.id,
          allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers]
        }
      ]
    }).catch(() => null);

    if (createdChannel) {
      client.activeCustomRooms.set(createdChannel.id, member.id);
      await member.voice.setChannel(createdChannel.id).catch(() => null);

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`jtc_lock_${createdChannel.id}`).setLabel("Kilitle").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`jtc_unlock_${createdChannel.id}`).setLabel("Kilidi Aç").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`jtc_limit_${createdChannel.id}`).setLabel("Kişi Sınırı").setStyle(ButtonStyle.Primary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`jtc_rename_${createdChannel.id}`).setLabel("İsim Değiştir").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`jtc_kick_${createdChannel.id}`).setLabel("Kullanıcı At").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`jtc_delete_${createdChannel.id}`).setLabel("Odayı Kapat").setStyle(ButtonStyle.Secondary)
      );

      const payload = MessageFormatter.render("customRoomCreated", {
        user: member,
        channel: createdChannel,
        title: "Özel Oda Kontrol Paneli",
        components: [row1, row2]
      }, config, member.guild);

      createdChannel.send(payload).catch(() => null);
    }
  }

  if (oldState.channelId && client.activeCustomRooms.has(oldState.channelId)) {
    const channel = oldState.channel;
    if (channel && channel.members.size === 0) {
      client.activeCustomRooms.delete(channel.id);
      await channel.delete().catch(() => null);
    }
  }

  const afkChannelId = member.guild.afkChannelId;
  const afkTimeout = 45 * 60 * 1000;

  if (newState.channelId && newState.channelId !== afkChannelId) {
    if (client.afkVoiceTimers.has(member.id)) {
      clearTimeout(client.afkVoiceTimers.get(member.id));
    }
    const timer = setTimeout(async () => {
      const freshMember = await member.guild.members.fetch(member.id).catch(() => null);
      if (!freshMember) return;
      if (!freshMember.voice?.channelId || freshMember.voice.channelId === afkChannelId) return;
      if (afkChannelId) {
        await freshMember.voice.setChannel(afkChannelId).catch(() => null);
      }
      client.afkVoiceTimers.delete(member.id);
    }, afkTimeout);
    client.afkVoiceTimers.set(member.id, timer);
  } else {
    if (client.afkVoiceTimers.has(member.id)) {
      clearTimeout(client.afkVoiceTimers.get(member.id));
      client.afkVoiceTimers.delete(member.id);
    }
  }
});

client.registerInteraction("jtc_", async ({ interaction, config }) => {
  const parts = interaction.customId.split("_");
  const action = parts[1];

  if (action === "modal" && parts[2] === "rename") {
    const channelId = parts[3];
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: "### ❌ Hata\nOda bulunamadı.", embeds: [], ephemeral: true });

    const newName = interaction.fields.getTextInputValue("room_name_input");
    await channel.setName(newName).catch(() => null);
    return interaction.reply({ content: `### ✅ Başarılı\nOda ismi başarıyla **${newName}** olarak değiştirildi.`, embeds: [], ephemeral: true });
  }

  if (action === "userkick") {
    const channelId = parts[2];
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: "### ❌ Hata\nOda bulunamadı.", embeds: [], ephemeral: true });

    const targetUserId = interaction.values?.[0];
    if (!targetUserId) return interaction.reply({ content: "### ⚠️ Uyarı\nKullanıcı seçilmedi.", embeds: [], ephemeral: true });

    const targetMember = interaction.guild.members.cache.get(targetUserId);
    if (targetMember && targetMember.voice?.channelId === channelId) {
      await targetMember.voice.disconnect().catch(() => null);
    }
    await channel.permissionOverwrites.edit(targetUserId, { Connect: false }).catch(() => null);
    return interaction.reply({ content: `### 🚪 Kullanıcı Uzaklaştırıldı\n<@${targetUserId}> odadan çıkarıldı ve odaya girişi engellendi.`, embeds: [], ephemeral: true });
  }

  const channelId = parts[2];
  const channel = interaction.guild.channels.cache.get(channelId);
  if (!channel) {
    return interaction.reply({ content: "### ❌ Hata\nOda bulunamadı.", embeds: [], ephemeral: true });
  }

  const ownerId = client.activeCustomRooms.get(channelId);
  if (interaction.user.id !== ownerId && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: "### ⛔ Yetkisiz İşlem\nBu odayı yönetmek için oda sahibi olmalısınız.", embeds: [], ephemeral: true });
  }

  if (action === "lock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false }).catch(() => null);
    const payload = MessageFormatter.render("roomLocked", {
      title: "Oda Kilitlendi",
      ephemeral: true
    }, config, interaction.guild);
    return interaction.reply(payload);
  } else if (action === "unlock") {
    await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true }).catch(() => null);
    const payload = MessageFormatter.render("roomUnlocked", {
      title: "Oda Kilidi Açıldı",
      ephemeral: true
    }, config, interaction.guild);
    return interaction.reply(payload);
  } else if (action === "limit") {
    const currentLimit = channel.userLimit || 0;
    const nextLimit = currentLimit === 0 ? 2 : currentLimit === 2 ? 5 : currentLimit === 5 ? 10 : 0;
    await channel.setUserLimit(nextLimit).catch(() => null);
    return interaction.reply({
      content: nextLimit === 0 ? "### 👥 Kişi Limiti\nOda kişi limiti kaldırıldı (Sınırsız)." : `### 👥 Kişi Limiti\nOda kişi limiti **${nextLimit} kişi** olarak ayarlandı.`,
      embeds: [],
      ephemeral: true
    });
  } else if (action === "rename") {
    const modal = new ModalBuilder()
      .setCustomId(`jtc_modal_rename_${channelId}`)
      .setTitle("Oda İsmini Değiştir");

    const nameInput = new TextInputBuilder()
      .setCustomId("room_name_input")
      .setLabel("Yeni Oda İsmi")
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(30)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
    return interaction.showModal(modal);
  } else if (action === "kick") {
    const otherMembers = channel.members.filter((m) => m.id !== interaction.user.id && !m.user.bot);
    if (otherMembers.size === 0) {
      return interaction.reply({ content: "### ⚠️ Uyarı\nOdanızda çıkarılabilecek başka bir kullanıcı bulunmuyor.", embeds: [], ephemeral: true });
    }

    const selectRow = new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`jtc_userkick_${channelId}`)
        .setPlaceholder("Odadan çıkarılacak kullanıcıyı seçin")
        .setMaxValues(1)
    );

    return interaction.reply({
      content: "Lütfen odadan çıkarmak istediğiniz kullanıcıyı seçin:",
      components: [selectRow],
      embeds: [],
      ephemeral: true
    });
  } else if (action === "delete") {
    await channel.delete().catch(() => null);
    client.activeCustomRooms.delete(channelId);
  }
});

client.registerInteraction("ticket_", async ({ interaction, config }) => {
  if (interaction.customId === "ticket_create_general") {
    const categoryId = config.channels?.ticketCategory;
    const ticketCount = (await Ticket.countDocuments()) + 1;

    const channel = await interaction.guild.channels.create({
      name: `destek-${ticketCount}`,
      type: ChannelType.GuildText,
      parent: categoryId || null,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles]
        }
      ]
    }).catch(() => null);

    if (!channel) {
      return interaction.reply({ content: "### ❌ Hata\nDestek kanalı oluşturulurken bir hata meydana geldi.", embeds: [], ephemeral: true });
    }

    await Ticket.create({
      ticketId: ticketCount,
      guildId: interaction.guild.id,
      channelId: channel.id,
      openerId: interaction.user.id,
      status: "OPEN"
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket_close_${channel.id}`).setLabel("Talebi Kapat").setStyle(ButtonStyle.Danger)
    );

    const ticketContent = [
      `### 🎫 Destek Talebi #${ticketCount}`,
      `▫️ **Talep Sahibi:** ${interaction.user}`,
      "",
      "Hoş geldiniz! Lütfen yetkililerimize iletmek istediğiniz durumu detaylı şekilde açıklayınız. En kısa sürede sizinle ilgilenilecektir.",
      "",
      "-# Talebi sonlandırmak için aşağıdaki butonu kullanabilirsiniz."
    ].join("\n");

    channel.send({
      content: ticketContent,
      embeds: [],
      components: [row]
    });

    const replyPayload = MessageFormatter.render("ticketCreated", {
      user: interaction.user,
      channel: channel,
      title: "Destek Talebi Açıldı",
      ephemeral: true
    }, config, interaction.guild);

    interaction.reply(replyPayload);
  } else if (interaction.customId.startsWith("ticket_close_")) {
    const channelId = interaction.customId.replace("ticket_close_", "");
    const channel = interaction.guild.channels.cache.get(channelId);

    const ticket = await Ticket.findOne({ channelId });
    if (ticket) {
      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (messages) {
        const transcript = messages.reverse().map((m) => ({
          authorId: m.author.id,
          authorTag: m.author.tag,
          content: m.content,
          timestamp: m.createdAt
        }));
        ticket.transcript = transcript;
      }
      ticket.status = "CLOSED";
      ticket.closedBy = interaction.user.id;
      ticket.closedAt = new Date();
      await ticket.save();
    }

    const closePayload = MessageFormatter.render("ticketClosed", {
      title: "Talep Kapatıldı"
    }, config, interaction.guild);

    await interaction.reply(closePayload);

    if (ticket) {
      const ratingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`ticket_rate_1_${ticket.ticketId}`).setLabel("⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ticket_rate_2_${ticket.ticketId}`).setLabel("⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ticket_rate_3_${ticket.ticketId}`).setLabel("⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ticket_rate_4_${ticket.ticketId}`).setLabel("⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`ticket_rate_5_${ticket.ticketId}`).setLabel("⭐⭐⭐⭐⭐").setStyle(ButtonStyle.Secondary)
      );
      const opener = await interaction.guild.members.fetch(ticket.openerId).catch(() => null);
      if (opener) {
        opener.send({
          content: [
            `### 🎫 Destek Talebi #${ticket.ticketId} Kapatıldı`,
            "Destek talebiniz yetkili ekibimiz tarafından başarıyla kapatıldı.",
            "",
            "Aldığınız destek hizmetini nasıl değerlendirirsiniz? Lütfen aşağıdaki butonları kullanarak puanlayınız:",
            "",
            "-# Geri bildiriminiz bizim için değerlidir."
          ].join("\n"),
          embeds: [],
          components: [ratingRow]
        }).catch(() => null);
      }
    }

    setTimeout(() => {
      channel.delete().catch(() => null);
    }, 5000);
  }
});

client.registerInteraction("rules_accept", async ({ interaction, config }) => {
  const memberRoles = config.roles?.member || [];
  if (memberRoles.length > 0) {
    await interaction.member.roles.add(memberRoles).catch(() => null);
  }

  const unregRoles = config.roles?.unregistered || [];
  if (unregRoles.length > 0 && memberRoles.length > 0) {
    await interaction.member.roles.remove(unregRoles).catch(() => null);
  }

  interaction.reply({
    content: "### ✅ Kurallar Onaylandı\nSunucu kurallarını onayladınız. Kanallara erişiminiz açılmıştır.\n\n-# Keyifli vakit geçirmenizi dileriz!",
    embeds: [],
    ephemeral: true
  });
});

client.registerInteraction("btnrole_", async ({ interaction }) => {
  const roleId = interaction.customId.replace("btnrole_", "");
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.reply({ content: "### ❌ Hata\nRol bulunamadı veya silinmiş.", embeds: [], ephemeral: true });
  }

  const member = interaction.member;
  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId).catch(() => null);
    return interaction.reply({ content: `### ❌ Rol Kaldırıldı\n▫️ **${role.name}** rolü üzerinizden başarıyla kaldırıldı.`, embeds: [], ephemeral: true });
  } else {
    await member.roles.add(roleId).catch(() => null);
    return interaction.reply({ content: `### ✅ Rol Tanımlandı\n▫️ **${role.name}** rolü üzerinize başarıyla tanımlandı.`, embeds: [], ephemeral: true });
  }
});

client.registerInteraction("poll_opt_", async ({ interaction }) => {
  if (!client.activePolls) return;
  const pollData = client.activePolls.get(interaction.message.id);
  if (!pollData) {
    return interaction.reply({ content: "### ⚠️ Bilgi\nBu oylama artık aktif değil veya süresi dolmuş.", embeds: [], ephemeral: true });
  }

  const optIdx = parseInt(interaction.customId.replace("poll_opt_", ""), 10);
  if (isNaN(optIdx) || !pollData.options[optIdx]) {
    return interaction.reply({ content: "### ❌ Hata\nGeçersiz seçenek.", embeds: [], ephemeral: true });
  }

  const userId = interaction.user.id;
  const prevOptIdx = pollData.voters.get(userId);

  if (prevOptIdx === optIdx) {
    pollData.options[optIdx].votes.delete(userId);
    pollData.voters.delete(userId);
    await interaction.reply({ content: "### 🗳️ Oy Geri Çekildi\nOyunuzu geri çektiniz.", embeds: [], ephemeral: true });
  } else {
    if (prevOptIdx !== undefined && pollData.options[prevOptIdx]) {
      pollData.options[prevOptIdx].votes.delete(userId);
    }
    pollData.options[optIdx].votes.add(userId);
    pollData.voters.set(userId, optIdx);
    await interaction.reply({ content: `### 🗳️ Oyunuz Kaydedildi\nOyunuz kaydedildi: **${pollData.options[optIdx].label}**`, embeds: [], ephemeral: true });
  }

  const newRows = interaction.message.components.map((row) => {
    const newRow = new ActionRowBuilder();
    row.components.forEach((btn, idx) => {
      const opt = pollData.options[idx];
      if (opt) {
        newRow.addComponents(
          ButtonBuilder.from(btn).setLabel(`${opt.label} (${opt.votes.size})`)
        );
      } else {
        newRow.addComponents(ButtonBuilder.from(btn));
      }
    });
    return newRow;
  });

  await interaction.message.edit({ components: newRows }).catch(() => null);
});

client.registerInteraction("suggest_vote_", async ({ interaction }) => {
  const parts = interaction.customId.split("_");
  const vote = parts[2];
  const messageId = interaction.message.id;

  const suggestion = client.activeSuggestions?.get(messageId);
  if (!suggestion) {
    return interaction.reply({ content: "### ⚠️ Bilgi\nBu öneri oturumu artık aktif değil.", embeds: [], ephemeral: true });
  }

  const userId = interaction.user.id;

  if (!suggestion.yesVotes && suggestion.yes) suggestion.yesVotes = suggestion.yes;
  if (!suggestion.noVotes && suggestion.no) suggestion.noVotes = suggestion.no;
  if (!suggestion.yesVotes) suggestion.yesVotes = new Set();
  if (!suggestion.noVotes) suggestion.noVotes = new Set();

  if (vote === "yes") {
    suggestion.noVotes.delete(userId);
    if (suggestion.yesVotes.has(userId)) {
      suggestion.yesVotes.delete(userId);
      await interaction.reply({ content: "### 💡 Oy Geri Alındı\nOlumlu oyunuz geri alındı.", embeds: [], ephemeral: true });
    } else {
      suggestion.yesVotes.add(userId);
      await interaction.reply({ content: "### 💡 Oy Kaydedildi\nOlumlu oyunuz kaydedildi (Katılıyorum).", embeds: [], ephemeral: true });
    }
  } else if (vote === "no") {
    suggestion.yesVotes.delete(userId);
    if (suggestion.noVotes.has(userId)) {
      suggestion.noVotes.delete(userId);
      await interaction.reply({ content: "### 💡 Oy Geri Alındı\nOlumsuz oyunuz geri alındı.", embeds: [], ephemeral: true });
    } else {
      suggestion.noVotes.add(userId);
      await interaction.reply({ content: "### 💡 Oy Kaydedildi\nOlumsuz oyunuz kaydedildi (Katılmıyorum).", embeds: [], ephemeral: true });
    }
  } else {
    return interaction.reply({ content: "### ❌ Hata\nGeçersiz oy seçeneği.", embeds: [], ephemeral: true });
  }

  const updatedRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("suggest_vote_yes")
      .setLabel(`Katılıyorum (${suggestion.yesVotes.size})`)
      .setEmoji("👍")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("suggest_vote_no")
      .setLabel(`Katılmıyorum (${suggestion.noVotes.size})`)
      .setEmoji("👎")
      .setStyle(ButtonStyle.Danger)
  );

  await interaction.message.edit({ components: [updatedRow] }).catch(() => null);
});

client.registerInteraction("radio_stop", async ({ interaction }) => {
  const entry = client.activeRadio?.get(interaction.guildId);
  if (!entry) {
    return interaction.reply({ content: "### ⚠️ Bilgi\nŞu an bu sunucuda çalan bir radyo yayını yok.", embeds: [], ephemeral: true });
  }
  if (entry.connection) {
    entry.connection.destroy();
  }
  client.activeRadio.delete(interaction.guildId);
  return interaction.reply({ content: "### ⏹️ Radyo Durduruldu\nCanlı radyo akışı başarıyla sonlandırıldı.", embeds: [], ephemeral: true });
});

client.registerInteraction("jtc_setpassword", async ({ interaction }) => {
  const parts = interaction.customId.split("_");
  const channelId = parts[2];
  const ownerId = client.activeCustomRooms?.get(channelId);

  if (interaction.user.id !== ownerId && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: "### ⛔ Yetkisiz İşlem\nBu odanın şifresini yalnızca oda sahibi belirleyebilir.", embeds: [], ephemeral: true });
  }

  const modal = new ModalBuilder()
    .setCustomId(`jtc_modal_setpassword_${channelId}`)
    .setTitle("Oda Şifresi Belirle");

  const passwordInput = new TextInputBuilder()
    .setCustomId("room_password_input")
    .setLabel("Oda Şifresi (boş bırakırsan şifre kaldırılır)")
    .setStyle(TextInputStyle.Short)
    .setMinLength(0)
    .setMaxLength(20)
    .setRequired(false);

  modal.addComponents(new ActionRowBuilder().addComponents(passwordInput));
  return interaction.showModal(modal);
});

client.registerInteraction("jtc_modal_setpassword_", async ({ interaction }) => {
  const channelId = interaction.customId.replace("jtc_modal_setpassword_", "");
  const password = interaction.fields.getTextInputValue("room_password_input").trim();

  if (!client.roomPasswords) client.roomPasswords = new Map();

  if (password.length === 0) {
    client.roomPasswords.delete(channelId);
    return interaction.reply({ content: "### 🔓 Şifre Kaldırıldı\nOda şifresi başarıyla kaldırıldı.", embeds: [], ephemeral: true });
  }
  client.roomPasswords.set(channelId, password);
  return interaction.reply({ content: `### 🔐 Şifre Belirlendi\nOda şifresi başarıyla **${password}** olarak ayarlandı.`, embeds: [], ephemeral: true });
});

client.registerInteraction("ticket_rate_", async ({ interaction }) => {
  const parts = interaction.customId.split("_");
  const stars = parseInt(parts[2], 10);
  const ticketId = parseInt(parts[3], 10);

  if (isNaN(stars) || isNaN(ticketId)) {
    return interaction.reply({ content: "### ❌ Hata\nGeçersiz değerlendirme.", embeds: [], ephemeral: true });
  }

  const ticket = await Ticket.findOne({ ticketId }).catch(() => null);
  if (!ticket) {
    return interaction.reply({ content: "### ❌ Hata\nTalep bulunamadı.", embeds: [], ephemeral: true });
  }

  if (ticket.rating) {
    return interaction.reply({ content: "### ⚠️ Uyarı\nBu talebi zaten daha önce değerlendirdiniz.", embeds: [], ephemeral: true });
  }

  ticket.rating = stars;
  await ticket.save().catch(() => null);

  const starText = "⭐".repeat(stars);
  await interaction.reply({ content: `### 🌟 Değerlendirme Alındı\n▫️ Puanınız: **${starText}** (${stars}/5)\nGeri bildiriminiz için teşekkür ederiz!`, embeds: [], ephemeral: true });
  await interaction.message.edit({ components: [] }).catch(() => null);
});

export default client;

if (process.argv[1]?.endsWith("apps/utility/src/index.js") || process.argv[1]?.endsWith("apps\\utility\\src\\index.js")) {
  client.start();
}
