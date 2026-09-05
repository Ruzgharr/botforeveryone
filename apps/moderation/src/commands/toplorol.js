import { Embeds } from "@bot/core";

export default {
  name: "toplorol",
  aliases: ["massrole", "toplu-rol"],
  async execute({ message, args }) {
    if (!message.member.permissions.has("Administrator") && message.guild.ownerId !== message.author.id) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Toplu rol işlemlerini yalnızca Yönetici yetkisine sahip yetkililer gerçekleştirebilir.", message.guild)] });
    }

    const action = args[0]?.toLowerCase();
    if (!["ver", "al"].includes(action)) {
      return message.reply({
        embeds: [Embeds.warn(
          "Hatalı Kullanım",
          "Lütfen yapılacak işlemi ve rolleri belirtin.\n\n**Örnekler:**\n`.toplorol ver @Rol hepsi` (Sunucudaki herkese rolü verir)\n`.toplorol al @Rol hepsi` (Herkesten rolü alır)\n`.toplorol ver @YeniRol @EskiRol` (Eski role sahip olanlara yeni rolü verir)",
          message.guild
        )]
      });
    }

    const roleTarget = message.mentions.roles.first()
      || message.guild.roles.cache.get(args[1]?.replace(/[<@&>]/g, ""))
      || message.guild.roles.cache.find((r) => r.name.toLowerCase() === args[1]?.toLowerCase());

    if (!roleTarget) {
      return message.reply({ embeds: [Embeds.error("Rol Bulunamadı", "İşlem yapılacak hedef rol bulunamadı.", message.guild)] });
    }

    if (roleTarget.position >= message.guild.members.me.roles.highest.position) {
      return message.reply({ embeds: [Embeds.error("Yetki Yetersiz", "Botun en yüksek rolü bu rolden düşük olduğu için işlem yapılamaz.", message.guild)] });
    }

    const filterArg = args[2]?.toLowerCase();
    const filterRole = message.mentions.roles.at(1)
      || message.guild.roles.cache.get(args[2]?.replace(/[<@&>]/g, ""))
      || message.guild.roles.cache.find((r) => r.name.toLowerCase() === args[2]?.toLowerCase());

    const allMembers = await message.guild.members.fetch();
    let targets = [];

    if (action === "ver") {
      targets = allMembers.filter((m) => {
        if (m.user.bot) return false;
        if (m.roles.cache.has(roleTarget.id)) return false;
        if (filterRole) return m.roles.cache.has(filterRole.id);
        return true;
      });
    } else {
      targets = allMembers.filter((m) => {
        if (m.user.bot) return false;
        if (!m.roles.cache.has(roleTarget.id)) return false;
        if (filterRole) return m.roles.cache.has(filterRole.id);
        return true;
      });
    }

    const targetList = Array.from(targets.values());
    if (targetList.length === 0) {
      return message.reply({ embeds: [Embeds.warn("Üye Bulunamadı", "Belirtilen kriterlere uygun işlem yapılacak üye bulunamadı.", message.guild)] });
    }

    const progressMsg = await message.reply({
      embeds: [Embeds.info("İşlem Başlatıldı", `Toplam **${targetList.length} üye** için rol ${action === "ver" ? "verme" : "alma"} işlemi arka planda sıraya alındı. Lütfen bekleyiniz...`, message.guild)]
    });

    let successCount = 0;
    let failCount = 0;

    for (const member of targetList) {
      try {
        if (action === "ver") {
          await member.roles.add(roleTarget.id);
        } else {
          await member.roles.remove(roleTarget.id);
        }
        successCount++;
      } catch {
        failCount++;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    const resultEmbed = Embeds.success(
      "Toplu Rol İşlemi Tamamlandı",
      `**Rol:** ${roleTarget}\n**İşlem:** ${action === "ver" ? "Rol Verildi" : "Rol Alındı"}\n**Başarılı:** ${successCount} üye\n**Başarısız:** ${failCount} üye`,
      message.guild
    );

    await progressMsg.edit({ embeds: [resultEmbed] }).catch(() => null);
  }
};
