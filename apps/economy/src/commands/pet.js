import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessageFormatter } from "@bot/core";
import { PetService } from "../services/PetService.js";

function makeEnergyBar(energy) {
  const filled = Math.round((energy / 100) * 10);
  const empty = 10 - filled;
  return `[${"█".repeat(Math.max(0, filled))}${"░".repeat(Math.max(0, empty))}] %${energy}`;
}

export default {
  name: "pet",
  aliases: ["petler", "companion", "hayvan"],
  async execute({ message, args, config }) {
    const sub = args[0]?.toLowerCase();

    if (sub === "market" || sub === "magaza" || sub === "shop") {
      const catalog = PetService.getCatalog(config);
      const lines = catalog.map((p) => {
        return `▫️ ${p.emoji} **${p.name}** (\`${p.type}\`) • **${p.price.toLocaleString("tr-TR")} Coin**\n  └ *${p.desc}*`;
      });

      const content = [
        `### 🐾 Anime Ruh Hayvanları Pazarı`,
        `▫️ Yanınızda taşıyacağınız sadık bir yol arkadaşı edinin!`,
        `▫️ Hayvanlar maden, balıkçılık, ses XP ve kumarhane oyunlarında benzersiz güçler sağlar.`,
        "",
        `▫️ **Mevcut Hayvanlar:**`,
        lines.join("\n"),
        "",
        `-# Sahiplenmek için: \`.pet al <tür> [isim]\` (Örn: \`.pet al kitsune Pamuk\`)`
      ].join("\n");

      return message.reply(MessageFormatter.v2(content));
    }

    if (sub === "al" || sub === "sahiplen" || sub === "buy") {
      const petType = args[1]?.toLowerCase();
      const customName = args.slice(2).join(" ").trim() || null;

      if (!petType) {
        return message.reply(MessageFormatter.warn("Eksik Parametre", "Kullanım: `.pet al <tür> [özel isim]`\nPazardaki türleri görmek için: `.pet market`"));
      }

      const res = await PetService.adoptPet({
        guildId: message.guild.id,
        userId: message.author.id,
        petType,
        customName,
        config
      });

      if (!res.success) {
        return message.reply(MessageFormatter.error("İşlem Başarısız", res.message));
      }

      return message.reply(MessageFormatter.success(
        "Yeni Evcil Hayvan Sahiplenildi!",
        `▫️ **Tebrikler!** ${res.meta.emoji} **${res.pet.name}** artık sizinle yolculuk ediyor!\n▫️ **Tür:** \`${res.meta.name}\`\n▫️ **Bonus:** ${res.meta.desc}\n▫️ **Enerji:** %100\n-# Evcil hayvanınızın durumunu görmek için: \`.pet\``
      ));
    }

    if (sub === "besle" || sub === "feed") {
      const res = await PetService.feedPet({
        guildId: message.guild.id,
        userId: message.author.id,
        config
      });

      if (!res.success) {
        return message.reply(MessageFormatter.error("Besleme Başarısız", res.message));
      }

      return message.reply(MessageFormatter.success(
        "Evcil Hayvan Beslendi!",
        `▫️ ${res.pet.name} afiyetle mamasını yedi ve enerjisi tamamen yenilendi!\n▫️ **Güncel Enerji:** %100\n▫️ **Ödenen Yem Ücreti:** ${res.feedCost} Coin\n-# Tok evcil hayvanlar tüm aktif bonuslarını eksiksiz sağlar.`
      ));
    }

    if (sub === "egit" || sub === "train") {
      const res = await PetService.trainPet({
        guildId: message.guild.id,
        userId: message.author.id
      });

      if (!res.success) {
        return message.reply(MessageFormatter.warn("Eğitim Gerçekleşmedi", res.message));
      }

      let extraMsg = "";
      if (res.leveledUp) {
        extraMsg = `\n🎉 **SEVİYE ATLADI!** Evcil hayvanınız **Seviye ${res.pet.level}** oldu! Tüm bonus güçleri %15 güçlendi!`;
      }

      return message.reply(MessageFormatter.success(
        "Antrenman Tamamlandı!",
        `▫️ ${res.pet.name} başarıyla antrenman yaptı ve **+${res.gainedXp} XP** kazandı!${extraMsg}\n▫️ **Mevcut Seviye:** ⭐ Seviye ${res.pet.level} (${res.pet.xp} / ${res.pet.level * 150} XP)\n▫️ **Kalan Enerji:** %${res.pet.energy}`
      ));
    }

    if (sub === "sec" || sub === "aktif") {
      const target = args[1]?.toLowerCase();
      if (!target) {
        return message.reply(MessageFormatter.warn("Eksik Parametre", "Kullanım: `.pet sec <tür>` (Örn: `.pet sec dragon`)"));
      }

      const res = await PetService.setActivePet({
        guildId: message.guild.id,
        userId: message.author.id,
        targetTypeOrId: target
      });

      if (!res.success) {
        return message.reply(MessageFormatter.error("Hata", res.message));
      }

      return message.reply(MessageFormatter.success(
        "Aktif Yol Arkadaşı Değiştirildi",
        `▫️ Artık yanınızda **${res.pet.name}** dolaşıyor! Tüm aktif güçleri ve bonusları bu evcil hayvandan alacaksınız.`
      ));
    }

    if (sub === "liste" || sub === "hepsi") {
      const pets = await PetService.getUserPets(message.guild.id, message.author.id);
      if (pets.length === 0) {
        return message.reply(MessageFormatter.warn("Evcil Hayvan Yok", "Henüz bir evcil hayvana sahip değilsiniz. `.pet market` yazarak sahiplenebilirsiniz."));
      }

      const lines = pets.map((p) => {
        const meta = PetService.getPetInfo(p.petType);
        const activeTag = p.isActive ? " ⭐ **[AKTİF KUŞANILDI]**" : "";
        return `▫️ ${meta?.emoji || "🐾"} **${p.name}** (Seviye ${p.level})${activeTag}\n  └ Enerji: %${p.energy} • XP: ${p.xp}/${p.level * 150}`;
      });

      const content = [
        `### 🐾 Sahip Olduğunuz Evcil Hayvanlar: ${message.author.username}`,
        lines.join("\n"),
        "",
        `-# Aktif yol arkadaşınızı değiştirmek için: \`.pet sec <tür>\``
      ].join("\n");

      return message.reply(MessageFormatter.v2(content));
    }

    const activePet = await PetService.getActivePet(message.guild.id, message.author.id);
    if (!activePet) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("pet_open_market")
          .setLabel("🛒 Pet Pazarına Git")
          .setStyle(ButtonStyle.Primary)
      );

      const content = [
        `### 🐾 Evcil Hayvan Bulunamadı`,
        `▫️ Henüz aktif bir ruh hayvanına sahip değilsiniz.`,
        `▫️ Bir pet sahiplenerek madencilik, balıkçılık, ses XP ve kumar oyunlarında kalıcı bonuslar kazanabilirsiniz!`,
        "",
        `-# Pet listesini görmek için \`.pet market\` komutunu kullanabilirsiniz.`
      ].join("\n");

      return message.reply(MessageFormatter.v2(content, [row]));
    }

    const meta = PetService.getPetInfo(activePet.petType);
    const energyBar = makeEnergyBar(activePet.energy);
    const reqXp = activePet.level * 150;
    const bonusMulti = (1 + (activePet.level - 1) * 0.15).toFixed(2);

    const content = [
      `### ${meta?.emoji || "🐾"} Aktif Ruh Hayvanı: ${activePet.name}`,
      `▫️ **Sahip:** <@${message.author.id}>`,
      `▫️ **Tür:** \`${meta?.name || activePet.petType}\``,
      `▫️ **Seviye:** ⭐ **Seviye ${activePet.level}** (${activePet.xp} / ${reqXp} XP)`,
      `▫️ **Enerji Durumu:** \`${energyBar}\``,
      "",
      `▫️ **Aktif Güç & Bonus:**`,
      `  • ${meta?.desc || "Özel güç"} (x${bonusMulti} çarpan aktif)`,
      activePet.energy <= 0 ? `\n⚠️ **UYARI:** Evcil hayvanınızın enerjisi tükendi! Bonusların çalışması için \`.pet besle\` yapmalısınız.` : "",
      "",
      `-# Butonlarla evcil hayvanınızı hemen besleyebilir veya eğitebilirsiniz.`
    ].join("\n");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`pet_action_feed:${activePet._id}`)
        .setLabel("🍖 Besle (200 Coin)")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`pet_action_train:${activePet._id}`)
        .setLabel("⚔️ Eğit (-20 Enerji)")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("pet_open_market")
        .setLabel("🛒 Pet Pazarı")
        .setStyle(ButtonStyle.Secondary)
    );

    return message.reply(MessageFormatter.v2(content, [row]));
  }
};
