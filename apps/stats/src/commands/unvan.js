import { MessageFormatter } from "@bot/core";
import { Stat, Economy } from "@bot/database";
import { BadgeService } from "../services/BadgeService.js";

export default {
  name: "unvan",
  aliases: ["unvanlar", "title", "titles"],
  async execute({ client, message, args, config }) {
    const sub = args[0]?.toLowerCase();

    if (sub === "ver") {
      if (!message.member.permissions.has("Administrator")) {
        return message.reply(MessageFormatter.error("Yetki Yetersiz", "Unvan tanımlamak için Yönetici yetkisi gereklidir."));
      }
      const targetMember = message.mentions.members.first()
        || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);
      const customTitle = args.slice(2).join(" ").trim();
      if (!targetMember || !customTitle) {
        return message.reply(MessageFormatter.warn("Eksik Parametre", "Kullanım: `.unvan ver @kullanici <[Unvan Metni]>`"));
      }

      const formatted = customTitle.startsWith("[") ? customTitle : `[${customTitle}]`;
      await BadgeService.unlockTitle(message.guild.id, targetMember.id, formatted);
      return message.reply(MessageFormatter.success(
        "Özel Unvan Tanımlandı",
        `▫️ **Kullanıcı:** <@${targetMember.id}>\n▫️ **Tanımlanan Unvan:** \`${formatted}\``
      ));
    }

    if (sub === "cikar" || sub === "kaldir") {
      await BadgeService.setActiveTitle(message.guild.id, message.author.id, "");
      return message.reply(MessageFormatter.success(
        "Unvan Çıkarıldı",
        "▫️ Aktif unvanınız kaldırıldı. Artık profilinizde unvan gösterilmeyecek."
      ));
    }

    if (sub === "al" || sub === "satinal") {
      const titleId = args[1]?.toLowerCase();
      const meta = BadgeService.BUILTIN_TITLES.find((t) => t.id === titleId);
      if (!meta) {
        return message.reply(MessageFormatter.warn("Geçersiz Unvan", "Satın alınabilir unvanlar: `sakura_efendisi`, `sunucu_agasi`, `duello_krali`, `ejderha_terbiyecisi`, `kripto_baronu`, `gece_yargici`"));
      }

      let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
      if (!eco || eco.wallet < meta.cost) {
        return message.reply(MessageFormatter.error(
          "Yetersiz Bakiye",
          `Bu unvan **${meta.cost.toLocaleString("tr-TR")} Coin** gerektirir. (Cüzdan: ${eco?.wallet || 0} Coin)`
        ));
      }

      const stat = await Stat.findOne({ guildId: message.guild.id, userId: message.author.id })
        || await Stat.create({ guildId: message.guild.id, userId: message.author.id });

      if ((stat.unlockedTitles || []).includes(meta.name)) {
        return message.reply(MessageFormatter.warn("Zaten Sahipsiniz", `**${meta.name}** unvanına zaten sahipsiniz! \`.unvan sec ${meta.id}\` ile kuşanabilirsiniz.`));
      }

      eco.wallet -= meta.cost;
      await eco.save();

      await BadgeService.unlockTitle(message.guild.id, message.author.id, meta.name);
      return message.reply(MessageFormatter.success(
        "Unvan Satın Alındı",
        `▫️ **Kuşanılan Unvan:** \`${meta.name}\`\n▫️ **Ödenen:** ${meta.cost.toLocaleString("tr-TR")} Coin\n▫️ **Kalan Cüzdan:** ${eco.wallet.toLocaleString("tr-TR")} Coin`
      ));
    }

    if (sub === "sec" || sub === "kusan") {
      const titleId = args[1]?.toLowerCase();
      const meta = BadgeService.BUILTIN_TITLES.find((t) => t.id === titleId);
      const stat = await Stat.findOne({ guildId: message.guild.id, userId: message.author.id });
      const unlocked = stat?.unlockedTitles || [];

      let chosen = meta ? meta.name : args.slice(1).join(" ");
      if (!chosen) {
        return message.reply(MessageFormatter.warn("Eksik Parametre", "Kullanım: `.unvan sec <unvanId veya unvan adı>`"));
      }

      if (!unlocked.includes(chosen) && !meta) {
        return message.reply(MessageFormatter.error("Kilitli Unvan", "Bu unvana sahip değilsiniz. Satın almak için: `.unvan al <unvanId>`"));
      }

      await BadgeService.setActiveTitle(message.guild.id, message.author.id, chosen);
      return message.reply(MessageFormatter.success(
        "Aktif Unvan Belirlendi",
        `▫️ Artık profil ve stat kartlarınızda adınızın yanında **\`${chosen}\`** unvanı yer alacaktır.`
      ));
    }

    const stat = await Stat.findOne({ guildId: message.guild.id, userId: message.author.id });
    const activeTitle = stat?.title || "Seçilmedi";
    const userTitles = new Set(stat?.unlockedTitles || []);

    const titleLines = BadgeService.BUILTIN_TITLES.map((t) => {
      const isOwned = userTitles.has(t.name);
      const isActive = activeTitle === t.name;
      const status = isActive ? "⭐ **[KUŞANILDI]**" : (isOwned ? "✅ **[SAHİP]**" : `🛒 ${t.cost.toLocaleString("tr-TR")} Coin`);
      return `▫️ **${t.name}** (\`${t.id}\`) • ${status}`;
    });

    const content = [
      `### 🏷️ Prestij Unvanları Koleksiyonu: ${message.author.username}`,
      `▫️ **Kullanıcı:** <@${message.author.id}>`,
      `▫️ **Mevcut Kuşanılan:** \`${activeTitle}\``,
      `▫️ **Açılan Unvanlar:** \`${userTitles.size} Adet\``,
      "",
      `▫️ **Satın Alınabilir ve Tanımlı Unvanlar:**`,
      titleLines.join("\n"),
      "",
      `-# Satın almak için: \`.unvan al <unvanId>\` • Kuşanmak için: \`.unvan sec <unvanId>\``
    ].join("\n");

    return message.reply(MessageFormatter.v2(content));
  }
};
