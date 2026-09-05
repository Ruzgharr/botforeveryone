import { ShopItem, Economy } from "@bot/database";
import { Embeds } from "@bot/core";

export default {
  name: "satınal",
  aliases: ["satinal", "buy"],
  async execute({ client, message, args, config }) {
    const itemKey = (args[0] || "").toLowerCase();
    if (!itemKey) {
      return message.reply({
        embeds: [Embeds.warn("Eksik Bilgi", `Lütfen satın almak istediğiniz ürün kodunu belirtin: \`${config.prefix || "."}satınal <ürün_kodu>\``, message.guild)]
      });
    }

    const item = await ShopItem.findOne({ guildId: message.guild.id, itemKey, active: true });
    if (!item) {
      return message.reply({
        embeds: [Embeds.error("Ürün Bulunamadı", `\`${itemKey}\` kodlu bir ürün mağazada bulunamadı.`, message.guild)]
      });
    }

    let eco = await Economy.findOne({ guildId: message.guild.id, userId: message.author.id });
    if (!eco || (eco.wallet || 0) < item.price) {
      return message.reply({
        embeds: [Embeds.error("Yetersiz Bakiye", `Bu ürünü alabilmek için cüzdanınızda en az **${item.price} Coin** bulunmalıdır.`, message.guild)]
      });
    }

    const alreadyHas = (eco.inventory || []).some((i) => i.itemId === item.itemKey);
    if (alreadyHas) {
      return message.reply({
        embeds: [Embeds.warn("Zaten Sahipsiniz", `Bu ürün zaten envanterinizde mevcut.`, message.guild)]
      });
    }

    await Economy.updateOne(
      { _id: eco._id },
      {
        $inc: { wallet: -item.price },
        $push: {
          inventory: {
            itemId: item.itemKey,
            name: item.name,
            type: item.type,
            roleId: item.roleId || "",
            purchasedAt: new Date()
          }
        }
      }
    );

    let roleGrantedText = "";
    if (item.type === "ROLE") {
      const targetRoleId = item.roleId || (item.itemKey === "vip" ? config.roles?.vip : null);
      if (targetRoleId) {
        await message.member.roles.add(targetRoleId).catch(() => null);
        roleGrantedText = `\n• **Rol Teslim Edildi:** <@&${targetRoleId}>`;
      }
    }

    message.reply({
      embeds: [
        Embeds.success(
          "Satın Alma Başarılı!",
          `• **Satın Alınan:** ${item.name}\n• **Ödenen Miktar:** ${item.price} Coin\n• **Kalan Cüzdan:** ${eco.wallet - item.price} Coin${roleGrantedText}`,
          message.guild
        )
      ]
    });
  }
};
