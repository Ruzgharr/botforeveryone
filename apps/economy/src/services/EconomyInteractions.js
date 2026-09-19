import { AttachmentBuilder } from "discord.js";
import { Economy } from "@bot/database";
import { VisualCard, MessageFormatter } from "@bot/core";
import { EconomyUI } from "./EconomyUI.js";
import { getItemByKey } from "./ItemMarketCatalog.js";
import { DuelService } from "./DuelService.js";
import { PetService } from "./PetService.js";

export function registerEconomyInteractions(client) {
  client.registerInteraction("eco_coin_refresh", async ({ client: bot, interaction }) => {
    const targetUserId = interaction.customId.split(":")[1] || interaction.user.id;
    let profile = await Economy.findOne({ guildId: interaction.guildId, userId: targetUserId });
    if (!profile) {
      profile = await Economy.create({ guildId: interaction.guildId, userId: targetUserId });
    }

    const targetUser = await bot.users.fetch(targetUserId).catch(() => ({ id: targetUserId, username: targetUserId }));
    const payload = EconomyUI.formatCoinPayload({ targetUser, profile });
    await interaction.update(payload);
  });

  client.registerInteraction("eco_coin_my_balance", async ({ interaction }) => {
    let profile = await Economy.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
    if (!profile) {
      profile = await Economy.create({ guildId: interaction.guildId, userId: interaction.user.id });
    }

    const payload = EconomyUI.formatCoinPayload({ targetUser: interaction.user, profile });
    await interaction.reply({ ...payload, ephemeral: true });
  });

  client.registerInteraction("eco_top_refresh", async ({ interaction }) => {
    const list = await Economy.find({ guildId: interaction.guildId }).limit(100);
    const enriched = list.map((item) => ({
      userId: item.userId,
      total: (item.wallet || 0) + (item.bank || 0)
    })).sort((a, b) => b.total - a.total).slice(0, 10);

    const payload = EconomyUI.formatTopCoinPayload({
      guild: interaction.guild,
      enriched
    });

    await interaction.update(payload);
  });

  client.registerInteraction("eco_top_view", async ({ interaction }) => {
    const list = await Economy.find({ guildId: interaction.guildId }).limit(100);
    const enriched = list.map((item) => ({
      userId: item.userId,
      total: (item.wallet || 0) + (item.bank || 0)
    })).sort((a, b) => b.total - a.total).slice(0, 10);

    const payload = EconomyUI.formatTopCoinPayload({
      guild: interaction.guild,
      enriched
    });

    await interaction.reply({ ...payload, ephemeral: true });
  });

  client.registerInteraction("eco_coin_daily", async ({ interaction }) => {
    let profile = await Economy.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
    if (!profile) {
      profile = await Economy.create({ guildId: interaction.guildId, userId: interaction.user.id });
    }

    const cooldownMs = 24 * 60 * 60 * 1000;
    if (profile.lastDaily && Date.now() - profile.lastDaily.getTime() < cooldownMs) {
      const remainingMs = cooldownMs - (Date.now() - profile.lastDaily.getTime());
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      return interaction.reply({
        content: `⏳ Günlük ödülünüzü zaten aldınız. Tekrar almak için **${remainingHours} saat** beklemelisiniz.`,
        ephemeral: true
      });
    }

    const reward = 250;
    profile.wallet += reward;
    profile.lastDaily = new Date();
    await profile.save();

    const payload = EconomyUI.formatDailySuccessPayload({
      targetUser: interaction.user,
      reward,
      balance: profile.wallet
    });

    await interaction.reply(payload);
  });

  client.registerInteraction("eco_coin_work", async ({ interaction }) => {
    let profile = await Economy.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
    if (!profile) {
      profile = await Economy.create({ guildId: interaction.guildId, userId: interaction.user.id });
    }

    const workCooldown = 60 * 1000;
    if (profile.lastWork && Date.now() - profile.lastWork.getTime() < workCooldown) {
      const remainingSec = Math.ceil((workCooldown - (Date.now() - profile.lastWork.getTime())) / 1000);
      return interaction.reply({
        content: `⏳ Biraz dinlenmelisiniz. Tekrar çalışabilmek için **${remainingSec} saniye** bekleyin.`,
        ephemeral: true
      });
    }

    const jobs = [
      { title: "Yazılım Geliştirici", earn: 120 },
      { title: "Grafik Tasarımcı", earn: 95 },
      { title: "Kurye", earn: 80 },
      { title: "Garson", earn: 70 },
      { title: "Serbest Meslek", earn: 110 }
    ];

    const randomJob = jobs[Math.floor(Math.random() * jobs.length)];
    profile.wallet += randomJob.earn;
    profile.lastWork = new Date();
    await profile.save();

    const content = `### 💼 Çalışma Tamamlandı\n▫️ **Meslek:** \`${randomJob.title}\`\n▫️ **Kazanılan:** \`+${randomJob.earn} Coin\`\n▫️ **Cüzdanınız:** \`${profile.wallet.toLocaleString("tr-TR")} Coin\`\n-# Public Bot Ecosystem Ekonomi`;
    await interaction.reply(content);
  });

  client.registerInteraction("eco_itemmarket_buy", async ({ interaction }) => {
    const targetUserId = interaction.customId.split(":")[1];
    if (targetUserId && interaction.user.id !== targetUserId) {
      return interaction.reply({ content: "❌ Bu satın alma menüsünü yalnızca komutu kullanan kişi kullanabilir.", ephemeral: true });
    }

    const itemKey = interaction.values?.[0];
    const config = interaction.client?.configs?.get?.(interaction.guildId) || {};
    const item = getItemByKey(itemKey, config);
    if (!item) {
      return interaction.reply({ content: "❌ Seçilen ürün bulunamadı.", ephemeral: true });
    }
    if (item.disabled) {
      return interaction.reply({ content: `⚠️ **${item.name}** ürünü sunucu yönetimi tarafından geçici olarak satışa kapatılmıştır.`, ephemeral: true });
    }

    let profile = await Economy.findOne({ guildId: interaction.guildId, userId: interaction.user.id });
    if (!profile) {
      profile = await Economy.create({ guildId: interaction.guildId, userId: interaction.user.id, wallet: 100, bank: 0 });
    }

    if ((profile.wallet || 0) < item.price) {
      return interaction.reply({
        content: `❌ **Yetersiz Bakiye:** Bu eşyayı satın alabilmek için cüzdanınızda en az **${item.price.toLocaleString("tr-TR")} Coin** bulunmalıdır. (Cüzdanınız: **${(profile.wallet || 0).toLocaleString("tr-TR")} Coin**)`,
        ephemeral: true
      });
    }

    const inventory = profile.inventory || [];
    const isAlreadyOwned = inventory.some((i) => i.itemId === item.itemKey);

    if (isAlreadyOwned && item.type !== "CONSUMABLE" && item.type !== "TICKET") {
      return interaction.reply({
        content: `⚠️ **${item.name}** eşyasına zaten sahipsiniz. Bu eşya tekrar satın alınamaz.`,
        ephemeral: true
      });
    }

    profile.wallet -= item.price;

    if (item.itemKey === "item_enerji") {
      profile.lastWork = null;
      profile.lastDaily = null;
    }

    profile.inventory.push({
      itemId: item.itemKey,
      name: item.name,
      type: item.type,
      purchasedAt: new Date()
    });

    await profile.save();

    let extraNote = "";
    if (item.itemKey === "item_enerji") {
      extraNote = "\n⚡ Enerji iksiri tüketildi! Çalışma (.calis) ve günlük (.gunluk) bekleme süreleriniz anında sıfırlandı.";
    }

    await interaction.reply({
      content: `🎉 **Satın Alma Başarılı!**\n\n▫️ **Satın Alınan:** ${item.emoji} **${item.name}**\n▫️ **Ödenen Tutar:** \`-${item.price.toLocaleString("tr-TR")} Coin\`\n▫️ **Kalan Cüzdan:** \`${profile.wallet.toLocaleString("tr-TR")} Coin\`\n▫️ **Etki:** *${item.description}*${extraNote}`,
      ephemeral: true
    });
  });

  client.registerInteraction("eco_coin_anim", async ({ interaction }) => {
    const targetUserId = interaction.customId.split(":")[1] || interaction.user.id;
    await interaction.deferReply();

    const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => interaction.user);
    const profile = await Economy.findOne({ guildId: interaction.guildId, userId: targetUser.id }) || { wallet: 0, bank: 0 };

    const gifBuffer = await VisualCard.renderAnimatedCoinCard({
      user: targetUser,
      wallet: profile.wallet || 0,
      bank: profile.bank || 0,
      theme: "sakura",
      format: "gif"
    });

    const attachment = new AttachmentBuilder(gifBuffer, { name: "wallet_live.gif" });
    await interaction.editReply({
      content: `🎬 **Canlı Cüzdan Kartı** : <@${targetUser.id}>`,
      files: [attachment]
    });
  });

  client.registerInteraction("clan_accept_invite", async ({ interaction }) => {
    const parts = interaction.customId.split(":");
    const clanName = parts[1];
    const targetUserId = parts[2];

    if (interaction.user.id !== targetUserId) {
      return interaction.reply({ content: "Bu davet sizin için geçerli değil.", ephemeral: true });
    }

    const { ClanService } = await import("./ClanService.js");
    const res = await ClanService.joinClan(interaction.guildId, interaction.user.id, clanName);
    if (!res.success) {
      return interaction.reply({ content: `❌ ${res.reason}`, ephemeral: true });
    }

    return interaction.reply({
      content: `⚔️ Tebrikler! **${res.clanName}** \`[${res.tag}]\` klanına katıldınız!`,
      ephemeral: false
    });
  });

  client.registerInteraction("clan_decline_invite", async ({ interaction }) => {
    const parts = interaction.customId.split(":");
    const targetUserId = parts[1];

    if (interaction.user.id !== targetUserId) {
      return interaction.reply({ content: "Bu davet sizin için geçerli değil.", ephemeral: true });
    }

    return interaction.reply({
      content: "Klan davetini geri çevirdiniz.",
      ephemeral: true
    });
  });

  client.registerInteraction("clan_top_btn", async ({ interaction }) => {
    const { ClanService } = await import("./ClanService.js");
    const topClans = await ClanService.getTopClans(interaction.guildId, 10);
    if (!topClans || topClans.length === 0) {
      return interaction.reply({ content: "Sunucuda henüz kurulmuş aktif bir klan bulunmuyor.", ephemeral: true });
    }

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const rows = topClans.map((clan, index) => {
      const medal = medals[index] || `#${index + 1}`;
      return `${medal} ${clan.badge} **${clan.name}** \`[${clan.tag}]\` • Seviye: **${clan.level}** • Kasa: **${(clan.vault || 0).toLocaleString("tr-TR")} Coin**`;
    }).join("\n");

    return interaction.reply({
      content: `### 🏆 Klan Liderlik Tablosu\n\n${rows}`,
      ephemeral: true
    });
  });

  client.registerInteraction("clan_donate_btn", async ({ interaction }) => {
    return interaction.reply({
      content: "💰 Klan ortak kasasına bağış yapmak için sohbetten `.klan bagis <miktar>` komutunu kullanabilirsiniz (Örn: `.klan bagis 1000`).",
      ephemeral: true
    });
  });

  client.registerInteraction("duel_accept", async ({ interaction }) => {
    const duelId = interaction.customId.replace("duel_accept:", "");
    const res = await DuelService.resolveDuel(duelId, interaction.user.id);
    if (!res.success) {
      return interaction.reply({ content: res.message, ephemeral: true });
    }

    const content = [
      `### ⚔️ Düello Sonuçlandı!`,
      `▫️ <@${res.challengerId}> (\`Zar: ${res.challengerRoll}\`) **VS** <@${res.targetId}> (\`Zar: ${res.targetRoll}\`)`,
      "",
      `▫️ 👑 **KAZANAN:** <@${res.winnerId}>!`,
      `▫️ 💰 **Kazanılan Ödül:** \`+${res.totalPot.toLocaleString("tr-TR")} Coin\``,
      `▫️ 💀 **Kaybeden:** <@${res.loserId}> (-${res.bet.toLocaleString("tr-TR")} Coin)`,
      "",
      `-# Heyecan dolu kılıç çarpışmasının ardından kazanan tüm ödül havuzunu kasasına koydu!`
    ].join("\n");

    return interaction.update({
      content: `⚔️ **DÜELLO BİTTİ!** Kazanan: <@${res.winnerId}>!`,
      ...MessageFormatter.v2(content, []),
      components: []
    });
  });

  client.registerInteraction("duel_decline", async ({ interaction }) => {
    const duelId = interaction.customId.replace("duel_decline:", "");
    const res = DuelService.cancelDuel(duelId, interaction.user.id);
    if (!res.success) {
      return interaction.reply({ content: res.message, ephemeral: true });
    }

    return interaction.update({
      content: `🏳️ Düello <@${interaction.user.id}> tarafından iptal edildi / reddedildi.`,
      components: []
    });
  });

  client.registerInteraction("pet_action_feed", async ({ interaction }) => {
    const petId = interaction.customId.split(":")[1];
    const res = await PetService.feedPet({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      petId
    });

    if (!res.success) {
      return interaction.reply({ content: res.message, ephemeral: true });
    }

    return interaction.reply({
      content: `🍖 **Afiyet Olsun!** ${res.pet.name} beslendi ve enerjisi **%100** oldu! (${res.feedCost} Coin ödendi)`,
      ephemeral: true
    });
  });

  client.registerInteraction("pet_action_train", async ({ interaction }) => {
    const petId = interaction.customId.split(":")[1];
    const res = await PetService.trainPet({
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      petId
    });

    if (!res.success) {
      return interaction.reply({ content: res.message, ephemeral: true });
    }

    const extra = res.leveledUp ? `\n🎉 **SEVİYE ATLADI!** Artık **Seviye ${res.pet.level}**!` : "";
    return interaction.reply({
      content: `⚔️ **Antrenman Başarılı!** ${res.pet.name} **+${res.gainedXp} XP** kazandı. (Kalan Enerji: %${res.pet.energy})${extra}`,
      ephemeral: true
    });
  });

  client.registerInteraction("pet_open_market", async ({ interaction }) => {
    return interaction.reply({
      content: "🛒 Pet pazarına gitmek ve evcil hayvan sahiplenmek için sohbete `.pet market` yazınız.",
      ephemeral: true
    });
  });
}
