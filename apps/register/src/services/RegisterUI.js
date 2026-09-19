import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";

export class RegisterUI {
  static formatRegisterPrompt({ targetMember, name, age, formattedNick, staffUser }) {
    const content = `### 👤 Kayıt & Cinsiyet Seçimi\n▫️ **Kullanıcı:** <@${targetMember.id}> (\`${targetMember.id}\`)\n▫️ **Belirlenen İsim:** \`${formattedNick}\`\n▫️ Lütfen aşağıdaki butonlardan kullanıcıya atanacak cinsiyet rolünü seçin.\n-# Kayıt Yetkilisi: ${staffUser.tag || staffUser.username}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reg_gender:man:${targetMember.id}:${name}:${age}`)
        .setLabel("Erkek")
        .setEmoji("👨")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`reg_gender:woman:${targetMember.id}:${name}:${age}`)
        .setLabel("Kadın")
        .setEmoji("👩")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`reg_gender:member:${targetMember.id}:${name}:${age}`)
        .setLabel("Üye")
        .setEmoji("👤")
        .setStyle(ButtonStyle.Success)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatRegisterSuccess({ targetMember, staffUser, roleLabel, name, age }) {
    const content = `### ✅ Kayıt Tamamlandı\n▫️ **Kullanıcı:** <@${targetMember.id}> (\`${targetMember.id}\`)\n▫️ **İsim / Yaş:** \`${name} | ${age}\`\n▫️ **Verilen Rol:** \`${roleLabel}\`\n▫️ **Kayıt Eden:** <@${staffUser.id}>\n-# Public Bot Ecosystem Kayıt Sistemi`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reg_unreg_quick:${targetMember.id}`)
        .setLabel("↩️ Kaydı Geri Al")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`reg_names_view:${targetMember.id}`)
        .setLabel("📋 İsim Geçmişi")
        .setStyle(ButtonStyle.Secondary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatNamesHistoryPayload({ targetUser, namesHistory = [], page = 1 }) {
    const pageSize = 5;
    const totalCount = namesHistory.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);

    if (totalCount === 0) {
      const content = `### 📋 İsim Geçmişi: ${targetUser.tag || targetUser.username}\n▫️ **Kullanıcı:** <@${targetUser.id}> (\`${targetUser.id}\`)\n▫️ Bu kullanıcıya ait kayıtlı eski isim geçmişi bulunmuyor.\n-# Kayıt ve İsim Takip Sistemi`;
      return MessageFormatter.v2(content);
    }

    const startIndex = (currentPage - 1) * pageSize;
    const slice = namesHistory.slice().reverse().slice(startIndex, startIndex + pageSize);

    const lines = slice.map((entry, index) => {
      const globalIndex = totalCount - (startIndex + index);
      const timeStr = entry.date ? `<t:${Math.floor(new Date(entry.date).getTime() / 1000)}:d>` : "Bilinmiyor";
      const staffInfo = entry.staffId ? `<@${entry.staffId}>` : "Bilinmiyor";
      return `▫️ **#${globalIndex}** \`${entry.name} | ${entry.age || "-"}\` • ${timeStr}\n  └ Rol: *${entry.roleAssigned || "Kayıt"}* | Yetkili: ${staffInfo}`;
    }).join("\n");

    const content = `### 📋 İsim Geçmişi: ${targetUser.tag || targetUser.username}\n▫️ **Kullanıcı:** <@${targetUser.id}> (\`${targetUser.id}\`)\n▫️ **Toplam Kayıt Sayısı:** \`${totalCount}\`\n\n${lines}\n-# Sayfa ${currentPage} / ${totalPages} • Kayıt ve İsim Sistemi`;

    const navRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reg_names_nav:${targetUser.id}:${currentPage - 1}`)
        .setLabel("◀ Önceki")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1),
      new ButtonBuilder()
        .setCustomId("reg_names_noop")
        .setLabel(`${currentPage} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId(`reg_names_nav:${targetUser.id}:${currentPage + 1}`)
        .setLabel("Sonraki ▶")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages),
      new ButtonBuilder()
        .setCustomId(`reg_names_clear_prompt:${targetUser.id}`)
        .setLabel("🗑️ Temizle")
        .setStyle(ButtonStyle.Danger)
    );

    return MessageFormatter.v2(content, [navRow]);
  }

  static formatSayPayload({ guild, total, tagged, voice, boosts, mediaUrl = null }) {
    const content = `### 📊 Sunucu Genel İstatistikleri: ${guild.name}\n▫️ **Toplam Üye Sayısı:** \`${total}\`\n▫️ **Ses Kanallarındaki Üyeler:** \`${voice}\`\n▫️ **Taglı Üye Sayısı:** \`${tagged}\`\n▫️ **Sunucu Takviye (Boost):** \`${boosts}\`\n-# Anlık Sunucu Verisi • Public Bot Ecosystem`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("reg_say_refresh")
        .setLabel("🔄 Verileri Yenile")
        .setStyle(ButtonStyle.Primary)
    );

    return MessageFormatter.v2(content, [row], false, mediaUrl);
  }

  static formatDavetPayload({ targetUser, total, regular, fake, bonus, leaves }) {
    const content = `### 📨 Davet İstatistikleri: ${targetUser.tag || targetUser.username}\n▫️ **Kullanıcı:** <@${targetUser.id}> (\`${targetUser.id}\`)\n▫️ **Toplam Geçerli Davet:** \`${total}\`\n\n▫️ **Gerçek Katılanlar:** \`${regular}\`\n▫️ **Ayrılanlar:** \`${leaves}\`\n▫️ **Sahte / Şüpheli:** \`${fake}\`\n▫️ **Yönetici Bonusu:** \`${bonus}\`\n-# Davet ve Giriş Takip Sistemi`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`reg_davet_refresh:${targetUser.id}`)
        .setLabel("🔄 Yenile")
        .setStyle(ButtonStyle.Primary)
    );

    return MessageFormatter.v2(content, [row]);
  }

  static formatVerifyPanel() {
    const content = `### 🛡️ Sunucu Güvenlik Doğrulaması\n▫️ Sunucumuza hoş geldiniz! Zararlı bot ve sahte hesap saldırılarını önlemek adına lütfen aşağıdaki butona tıklayarak insan olduğunuzu doğrulayın.\n▫️ Doğrulama sonrasında kayıt odalarına ve sohbet kanallarına erişiminiz anında açılacaktır.\n-# Güvenlik Doğrulama Paneli • Public Bot Ecosystem`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("verify_human")
        .setLabel("Ben İnsanım / Doğrula")
        .setEmoji("🛡️")
        .setStyle(ButtonStyle.Success)
    );

    return MessageFormatter.v2(content, [row]);
  }
}
