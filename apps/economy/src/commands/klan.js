import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { ClanService } from "../services/ClanService.js";

export default {
  name: "klan",
  aliases: ["clan", "lonca", "birlik"],
  async execute({ message, args, config }) {
    const subCmd = (args[0] || "").toLowerCase().trim();

    if (subCmd === "kur" || subCmd === "create") {
      const clanName = args[1];
      const clanTag = args[2] || (clanName ? clanName.slice(0, 4).toUpperCase() : "");

      if (!clanName) {
        const settings = await ClanService.getClanSettings(message.guild.id);
        return message.reply(MessageFormatter.warn(
          "Eksik Bilgi",
          `Klan kurmak için klan adı ve etiket belirtmelisiniz.\n\n▫️ Kullanım: \`.klan kur <KlanAdı> [ETİKET]\`\n▫️ Örnek: \`.klan kur Akatsuki AKA\`\n▫️ Kurulum Ücreti: **${settings.createCost.toLocaleString("tr-TR")} Coin**`
        ));
      }

      const res = await ClanService.createClan(message.guild.id, message.author.id, clanName, clanTag);
      if (!res.success) {
        return message.reply(MessageFormatter.error("Klan Kurulamadı", res.reason));
      }

      return message.reply(MessageFormatter.success(
        "Klan Başarıyla Kuruldu!",
        `▫️ **Klan Adı:** ${res.clan.badge} **${res.clan.name}** \`[${res.clan.tag}]\`\n▫️ **Klan Lideri:** <@${message.author.id}>\n▫️ **Ödenen Kurulum Ücreti:** \`-${res.cost.toLocaleString("tr-TR")} Coin\`\n▫️ **Kapasite:** 1 / ${res.clan.maxMembers} Üye\n\n-# 💡 Üye davet etmek için \`.klan davet @kullanici\`, kasaya bağış için \`.klan bagis <miktar>\``
      ));
    }

    if (subCmd === "bagis" || subCmd === "donate" || subCmd === "yatir") {
      const amount = args[1];
      if (!amount) {
        return message.reply(MessageFormatter.warn(
          "Eksik Miktar",
          "Lütfen klan ortak kasasına yatırmak istediğiniz Coin miktarını belirtin.\n▫️ Örnek: `.klan bagis 1000`"
        ));
      }

      const res = await ClanService.depositToVault(message.guild.id, message.author.id, amount);
      if (!res.success) {
        return message.reply(MessageFormatter.error("Bağış Başarısız", res.reason));
      }

      return message.reply(MessageFormatter.success(
        "Klan Kasasına Bağış Yapıldı!",
        `▫️ **Klan:** **${res.clanName}**\n▫️ **Bağışlanan:** \`+${res.amount.toLocaleString("tr-TR")} Coin\`\n▫️ **Kazanılan Klan XP:** \`+${res.gainedXp} XP\`\n▫️ **Yeni Klan Kasası:** \`${res.newVault.toLocaleString("tr-TR")} Coin\`\n▫️ **Klan Seviyesi:** **Seviye ${res.newLevel}**`
      ));
    }

    if (subCmd === "katil" || subCmd === "join") {
      const clanQuery = args.slice(1).join(" ");
      if (!clanQuery) {
        return message.reply(MessageFormatter.warn("Eksik Bilgi", "Lütfen katılmak istediğiniz klanın adını veya etiketini belirtin.\n▫️ Örnek: `.klan katil Akatsuki`"));
      }

      const res = await ClanService.joinClan(message.guild.id, message.author.id, clanQuery);
      if (!res.success) {
        return message.reply(MessageFormatter.error("Katılım Başarısız", res.reason));
      }

      return message.reply(MessageFormatter.success(
        "Klana Katıldınız!",
        `▫️ **${res.clanName}** \`[${res.tag}]\` klanının yeni bir üyesi oldunuz!\n▫️ Klan bilgilerini görmek için: \`.klan\``
      ));
    }

    if (subCmd === "ayril" || subCmd === "leave") {
      const res = await ClanService.leaveClan(message.guild.id, message.author.id);
      if (!res.success) {
        return message.reply(MessageFormatter.error("Ayrılma Başarısız", res.reason));
      }

      const extra = res.disbanded
        ? "\n▫️ Klanın son üyesi ve lideri olduğunuz için klan feshedildi."
        : (res.newLeaderId ? `\n▫️ Liderlik <@${res.newLeaderId}> kullanıcısına devredildi.` : "");

      return message.reply(MessageFormatter.success(
        "Klandan Ayrıldınız",
        `▫️ **${res.clanName}** klanından başarıyla ayrıldınız.${extra}`
      ));
    }

    if (subCmd === "davet" || subCmd === "invite") {
      const targetUser = message.mentions.users.first();
      if (!targetUser || targetUser.bot || targetUser.id === message.author.id) {
        return message.reply(MessageFormatter.warn("Geçersiz Kullanıcı", "Lütfen klana davet etmek istediğiniz bir üyeyi etiketleyin."));
      }

      const userClan = await ClanService.getClanByUser(message.guild.id, message.author.id);
      if (!userClan) {
        return message.reply(MessageFormatter.warn("Klan Bulunamadı", "Kullanıcı davet edebilmek için bir klana üye olmalısınız."));
      }

      const targetClan = await ClanService.getClanByUser(message.guild.id, targetUser.id);
      if (targetClan) {
        return message.reply(MessageFormatter.warn("Zaten Klana Sahip", `${targetUser} kullanıcısı zaten **${targetClan.name}** klanının bir üyesi.`));
      }

      const inviteRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`clan_accept_invite:${userClan.name}:${targetUser.id}`)
          .setLabel("✅ Daveti Kabul Et")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`clan_decline_invite:${targetUser.id}`)
          .setLabel("❌ Reddet")
          .setStyle(ButtonStyle.Danger)
      );

      return message.reply({
        content: `⚔️ ${targetUser}, <@${message.author.id}> sizi **${userClan.name}** \`[${userClan.tag}]\` klanına davet etti!`,
        components: [inviteRow]
      });
    }

    let targetClan = null;
    if (args[0] && !["bilgi", "info"].includes(subCmd)) {
      targetClan = await ClanService.getClanByName(message.guild.id, args.join(" "));
    } else if (args[1]) {
      targetClan = await ClanService.getClanByName(message.guild.id, args.slice(1).join(" "));
    } else {
      targetClan = await ClanService.getClanByUser(message.guild.id, message.author.id);
    }

    if (!targetClan) {
      const settings = await ClanService.getClanSettings(message.guild.id);
      const systemStatus = settings.enabled ? "✅ **Aktif**" : "❌ **Devre Dışı**";

      const infoContent = [
        `# ⚔️ Sunucu Klan & Lonca Sistemi`,
        `Kendi klanınızı kurarak arkadaşlarınızla güçlerinizi birleştirin, ortak kasayı büyüterek klanlar sıralamasında zirveye tırmanın!`,
        "",
        `▫️ **Sistem Durumu:** ${systemStatus}`,
        `▫️ **Klan Kurulum Ücreti:** **${settings.createCost.toLocaleString("tr-TR")} Coin** *(Web Panelden Ayarlanabilir)*`,
        `▫️ **Maksimum Üye Limiti:** ${settings.maxMembersBase} Üye`,
        "",
        `### 📖 Klan Komut Rehberi`,
        `▫️ \`.klan kur <İsim> [Etiket]\` : Yeni klanınızı kurar.`,
        `▫️ \`.klan bagis <Miktar>\` : Klan ortak kasasına Coin bağışlar.`,
        `▫️ \`.klan davet @kullanici\` : Klana yeni üye davet eder.`,
        `▫️ \`.klan katil <İsim>\` : Var olan bir klana katılır.`,
        `▫️ \`.klan ayril\` : Mevcut klandan ayrılır.`,
        `▫️ \`.klan-top\` : Sunucudaki en güçlü klanların sıralaması.`,
        "",
        `-# 💡 Şu anda bir klana üye değilsiniz. Kendi klanınızı kurmak veya bir klana katılmak için yukarıdaki komutları kullanabilirsiniz.`
      ].join("\n");

      return message.reply(MessageFormatter.v2(infoContent, []));
    }

    const memberList = (targetClan.members || []).map((id, index) => {
      const isLeader = id === targetClan.leaderId ? " 👑 *(Lider)*" : "";
      return `  ${index + 1}. <@${id}>${isLeader}`;
    }).join("\n");

    const clanContent = [
      `# ${targetClan.badge} Klan Profili: **${targetClan.name}** \`[${targetClan.tag}]\``,
      `*${targetClan.description}*`,
      "",
      `▫️ **Klan Lideri:** <@${targetClan.leaderId}>`,
      `▫️ **Klan Seviyesi:** **Seviye ${targetClan.level}** (\`${(targetClan.xp || 0).toLocaleString("tr-TR")} XP\`)`,
      `▫️ **Klan Ortak Kasası:** **${(targetClan.vault || 0).toLocaleString("tr-TR")} Coin**`,
      `▫️ **Üye Sayısı:** **${(targetClan.members || []).length} / ${targetClan.maxMembers || 15}**`,
      "",
      `### 🛡️ Klan Üyeleri`,
      memberList || "  • Üye bulunmuyor.",
      "",
      `-# 💡 Kasaya para eklemek için: \`.klan bagis <miktar>\`, üye davet için: \`.klan davet @kullanici\``
    ].join("\n");

    const clanRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`clan_donate_btn:${targetClan.name}`)
        .setLabel("💰 Kasaya Bağış Yap")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`clan_top_btn`)
        .setLabel("🏆 Klan Sıralaması")
        .setStyle(ButtonStyle.Primary)
    );

    return message.reply(MessageFormatter.v2(clanContent, [clanRow]));
  }
};
