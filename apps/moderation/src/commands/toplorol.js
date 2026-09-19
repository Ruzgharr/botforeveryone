import { MessageFormatter } from "@bot/core";

export default {
  name: "toplorol",
  aliases: ["massrole", "toplu-rol"],
  async execute({ message, args }) {
    if (!message.member.permissions.has("Administrator") && message.guild.ownerId !== message.author.id) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Toplu rol işlemlerini yalnızca Yönetici yetkisine sahip yetkililer gerçekleştirebilir."));
    }

    const action = args[0]?.toLowerCase();
    if (!["ver", "al"].includes(action)) {
      return message.reply(MessageFormatter.warn(
        "Hatalı Kullanım",
        "Lütfen yapılacak işlemi ve rolleri belirtin.\n\n**Örnekler:**\n`.toplorol ver @Rol hepsi` (Sunucudaki herkese rolü verir)\n`.toplorol al @Rol hepsi` (Herkesten rolü alır)\n`.toplorol ver @YeniRol @EskiRol` (Eski role sahip olanlara yeni rolü verir)"
      ));
    }

    const roleTarget = message.mentions.roles.first()
      || message.guild.roles.cache.get(args[1]?.replace(/[<@&>]/g, ""))
      || message.guild.roles.cache.find((r) => r.name.toLowerCase() === args[1]?.toLowerCase());

    if (!roleTarget) {
      return message.reply(MessageFormatter.error("Rol Bulunamadı", "İşlem yapılacak hedef rol bulunamadı."));
    }

    if (roleTarget.position >= message.guild.members.me.roles.highest.position) {
      return message.reply(MessageFormatter.error("Yetki Yetersiz", "Botun en yüksek rolü bu rolden düşük olduğu için işlem yapılamaz."));
    }

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
      return message.reply(MessageFormatter.warn("Üye Bulunamadı", "Belirtilen kriterlere uygun işlem yapılacak üye bulunamadı."));
    }

    const progressMsg = await message.reply(MessageFormatter.info(
      "İşlem Başlatıldı",
      `Toplam **${targetList.length} üye** için rol ${action === "ver" ? "verme" : "alma"} işlemi arka planda sıraya alındı. Lütfen bekleyiniz...`
    ));

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

    await progressMsg.edit(MessageFormatter.success(
      "Toplu Rol İşlemi Tamamlandı",
      `**Hedef Rol:** ${roleTarget}\n▫️ **İşlem:** ${action === "ver" ? "Rol Verildi" : "Rol Alındı"}\n▫️ **Başarılı:** \`${successCount}\` üye\n▫️ **Başarısız:** \`${failCount}\` üye`
    )).catch(() => null);
  }
};
