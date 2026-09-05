import { Economy } from "@bot/database";
import { Embeds } from "@bot/core";

const workCooldowns = new Map();

const jobs = [
  { title: "Yazılım Geliştirici", desc: "Bir açık kaynak projesindeki kritik hatayı çözdünüz", min: 120, max: 280 },
  { title: "Kurye", desc: "Yoğun saatlerde siparişleri gecikmeden müşterilere teslim ettiniz", min: 80, max: 180 },
  { title: "Grafik Tasarımcı", desc: "Bir sunucu için özel afiş ve banner tasarımı hazırladınız", min: 90, max: 220 },
  { title: "Garson", desc: "Günün en yoğun vardiyasında kusursuz servis yaptınız ve bahşiş topladınız", min: 60, max: 150 },
  { title: "Sistem Yöneticisi", desc: "Sunucudaki veritabanı bakımını ve yedeklemelerini sorunsuz tamamladınız", min: 140, max: 300 }
];

export default {
  name: "çalış",
  aliases: ["calis", "work"],
  async execute({ client, message, args, config }) {
    const userId = message.author.id;
    const now = Date.now();
    const cooldownTime = 15 * 60 * 1000;

    if (workCooldowns.has(userId)) {
      const expirationTime = workCooldowns.get(userId) + cooldownTime;
      if (now < expirationTime) {
        const timeLeftMins = Math.ceil((expirationTime - now) / 60000);
        return message.reply({
          embeds: [Embeds.warn("Yorgunsunuz", `Tekrar çalışabilmek için **${timeLeftMins} dakika** dinlenmeniz gerekiyor.`, message.guild)]
        });
      }
    }

    const job = jobs[Math.floor(Math.random() * jobs.length)];
    const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

    let eco = await Economy.findOne({ guildId: message.guild.id, userId });
    if (!eco) {
      eco = await Economy.create({ guildId: message.guild.id, userId, wallet: 100, bank: 0 });
    }

    await Economy.updateOne({ _id: eco._id }, { $inc: { wallet: earned } });
    workCooldowns.set(userId, now);

    message.reply({
      embeds: [
        Embeds.success(
          `İş Tamamlandı: ${job.title}`,
          `• ${job.desc}.\n• Kazancınız: **+${earned} Coin**\n• Güncel Cüzdan: **${eco.wallet + earned} Coin**`,
          message.guild
        )
      ]
    });
  }
};
