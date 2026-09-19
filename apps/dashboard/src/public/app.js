let currentGuildId = localStorage.getItem("dash_guildId") || "default";

const messageCatalog = [
  { key: "jailPunish", cat: "mod", title: "Karantina (Jail) Cezası", default: "### 🛡️ Karantina (Jail) Cezası\n▫️ **Cezalandırılan:** {user}\n▫️ **Yetkili:** {staff}\n▫️ **Ceza Puanı:** `+{points}`\n▫️ **Gerekçe:** `{reason}`\n-# Ceza süresi boyunca kanallara erişim kısıtlanmıştır." },
  { key: "jailLift", cat: "mod", title: "Karantina Kaldırma (Af)", default: "### 🟢 Karantina Cezası Kaldırıldı\n▫️ **Kullanıcı:** {user}\n▫️ **Yetkili:** {staff}\n-# Kullanıcının sunucu erişimleri ve rolleri iade edildi." },
  { key: "mutePunish", cat: "mod", title: "Yazı Susturma (Chat Mute)", default: "### 🔇 Metin Susturma (Mute) Uygulandı\n▫️ **Kullanıcı:** {user}\n▫️ **Yetkili:** {staff}\n▫️ **Gerekçe:** `{reason}`\n-# Sohbet kanallarında mesaj gönderme yetkisi sınırlandırıldı." },
  { key: "muteLift", cat: "mod", title: "Yazı Susturma Kaldırma", default: "### 🔊 Metin Susturması Kaldırıldı\n▫️ **Kullanıcı:** {user}\n▫️ **Yetkili:** {staff}\n-# Kullanıcı artık metin kanallarında serbestçe yazabilir." },
  { key: "vmutePunish", cat: "mod", title: "Ses Susturma (Voice Mute)", default: "### 🎙️ Ses Susturma (VMute) Uygulandı\n▫️ **Kullanıcı:** {user}\n▫️ **Yetkili:** {staff}\n▫️ **Gerekçe:** `{reason}`\n-# Ses kanallarında konuşma yetkisi geçici olarak kapatıldı." },
  { key: "vmuteLift", cat: "mod", title: "Ses Susturma Kaldırma", default: "### 🎙️ Ses Susturması Kaldırıldı\n▫️ **Kullanıcı:** {user}\n▫️ **Yetkili:** {staff}\n-# Kullanıcı ses kanallarında serbestçe konuşabilir." },
  { key: "banPunish", cat: "mod", title: "Yasaklama (Ban)", default: "### ⛔ Sunucudan Yasaklandı (Ban)\n▫️ **Yasaklanan:** {user}\n▫️ **Yetkili:** {staff}\n▫️ **Gerekçe:** `{reason}`\n-# Bu işlem sunucu güvenlik kaydına işlendi ve erişim engellendi." },
  { key: "banLift", cat: "mod", title: "Yasak Kaldırma (Unban)", default: "### 🟢 Sunucu Yasağı Kaldırıldı\n▫️ **Kullanıcı:** {user}\n▫️ **Yetkili:** {staff}\n-# Kullanıcının sunucuya tekrar katılım engeli kaldırıldı." },
  { key: "warnAdd", cat: "mod", title: "Kullanıcı Uyarı Bildirimi", default: "### ⚠️ Kullanıcı Uyarıldı\n▫️ **Uyarılan:** {user}\n▫️ **Yetkili:** {staff}\n▫️ **Gerekçe:** `{reason}`\n-# Tekrarlayan ihlaller otomatik yaptırımlara sebep olabilir." },
  { key: "warnClean", cat: "mod", title: "Uyarı Sıfırlama Bildirimi", default: "### 🧹 Uyarılar Temizlendi\n▫️ **Kullanıcı:** {user}\n▫️ **Yetkili:** {staff}\n-# Kullanıcının aktif tüm uyarı sicili başarıyla sıfırlandı." },
  { key: "lockChannel", cat: "mod", title: "Kanal Kilitleme", default: "### 🔒 Kanal Kilitlendi\n▫️ **Yetkili:** {staff}\n▫️ **Kilit Süresi:** `{duration}`\n-# Bu kanala üyelerin mesaj gönderme yetkisi sınırlandırıldı." },
  { key: "unlockChannel", cat: "mod", title: "Kanal Kilidi Açıldı", default: "### 🔓 Kanal Kilidi Açıldı\n▫️ Kanal erişimi normale döndü. Sohbet kurallarına uymaya özen gösterin." },
  { key: "sicilClean", cat: "mod", title: "Sicil Temiz Bildirimi", default: "### 📋 Sicil Kaydı Temiz\n▫️ **Kullanıcı:** {user}\n▫️ **Toplam Ceza Puanı:** `0`\n-# Bu kullanıcı adına veritabanında aktif veya geçmiş ceza bulunmuyor." },
  { key: "sicilRecord", cat: "mod", title: "Sicil Geçmişi Listesi", default: "### 📋 Sicil ve Ceza Geçmişi\n▫️ **Kullanıcı:** {user}\n▫️ **Toplam Ceza Puanı:** `{points}`\n\n{records}" },
  { key: "penaltyPoints", cat: "mod", title: "Ceza Puanı Sorgulama", default: "### 📊 Aktif Ceza Puanı Durumu\n▫️ **Kullanıcı:** {user}\n▫️ **Mevcut Puan:** `{points}` / `{limit}`\n-# Eşik sınıra ulaşıldığında kademeli yaptırım uygulanır." },
  { key: "snipeEmpty", cat: "mod", title: "Snipe Boş Bildirimi", default: "### 🗑️ Silinen Mesaj Kaydı Yok\n-# Bu kanalda yakın zamanda silinmiş bir mesaj kaydı bulunmuyor." },
  { key: "snipeMessage", cat: "mod", title: "Snipe Mesaj Yanıtı", default: "### 🔍 Son Silinen Mesaj\n▫️ **Yazar:** <@{authorId}>\n▫️ **Silinme Zamanı:** `{time}`\n```text\n{content}\n```" },
  { key: "registerWelcome", cat: "reg", title: "Kayıt Hoş Geldin Mesajı", default: "### ✦ Aramıza Hoş Geldin!\n▫️ Hoş geldin {user}! Kayıt olmak için ses teyit odalarına bağlanabilirsin.\n-# Kuralları okumayı unutmayın. Keyifli vakit geçirmeniz dileğiyle!" },
  { key: "registerSuccess", cat: "reg", title: "Kayıt Başarılı Bildirimi", default: "### 👥 Kayıt İşlemi Tamamlandı\n▫️ **Kaydedilen:** {user}\n▫️ **Yetkili:** {staff}\n▫️ **Verilen Rol / Cinsiyet:** `{gender}`\n-# Sunucu kaydı başarıyla tamamlanarak roller tanımlandı." },
  { key: "suspiciousAlert", cat: "reg", title: "Şüpheli Hesap Karantinası", default: "### 🛡️ Şüpheli Hesap Karantinası\n▫️ **Kullanıcı:** {user}\n-# Hesabınız 7 günden yeni olduğu için güvenlik gereği şüpheli karantinasına alındınız." },
  { key: "serverStats", cat: "reg", title: "Sunucu Sayım / İstatistik", default: "### 📈 Sunucu İstatistik Özeti\n▫️ 👥 **Toplam Üye:** `{total}`\n▫️ 🏷️ **Taglı Üye:** `{tagged}`\n▫️ 🎙️ **Sesteki Üyeler:** `{voice}`\n▫️ 🚀 **Takviye (Boost):** `{boosts}`" },
  { key: "nameChanged", cat: "reg", title: "İsim Güncelleme Mesajı", default: "### 📝 İsim Güncellendi\n▫️ **Kullanıcı:** {user}\n▫️ **Yeni İsim:** `{name}`\n-# Kullanıcının ismi güncellendi ve geçmiş isim kayıtlarına işlendi." },
  { key: "nameHistory", cat: "reg", title: "İsim Geçmişi Listesi", default: "### 📜 Geçmiş İsim Kayıtları\n▫️ **Kullanıcı:** {user} • **Toplam:** `{count}`\n\n{records}" },
  { key: "coinBalance", cat: "eco", title: "Bakiye Sorgulama", default: "### 💳 Bakiye ve Varlık Durumu\n▫️ **Hesap Sahibi:** {user}\n▫️ 👛 **Cüzdan:** `{wallet}` Coin\n▫️ 🏦 **Banka:** `{bank}` Coin\n-# İşlemler Ecosystem Finans ve Banka Altyapısı güvencesindedir." },
  { key: "dailyReward", cat: "eco", title: "Günlük Ödül Toplama", default: "### 🎁 Günlük Maaş / Ödül Alındı\n▫️ **Hesap Sahibi:** {user}\n▫️ 💰 **Kazanılan:** `+{amount}` Coin\n-# Bir sonraki günlük ödülünüzü 24 saat sonra alabilirsiniz." },
  { key: "coinTransferSuccess", cat: "eco", title: "Coin Transferi Başarılı", default: "### 💸 Para Transferi Başarılı\n▫️ **Gönderen:** {user}\n▫️ **Alıcı:** {target}\n▫️ **Transfer Tutarı:** `{amount}` Coin\n-# Bakiye transferi anında onaylandı ve hesaplara yansıtıldı." },
  { key: "blackjackTable", cat: "eco", title: "Blackjack Oyun Başlangıcı", default: "### 🃏 21 (Blackjack) Masası\n▫️ 💰 **Bahis:** `{bet}` Coin\n▫️ 👤 **Eliniz:** `[ {cards} ]` (Toplam: **{total}**)\n▫️ 🤖 **Krupiye:** `[ {dealer} - ? ]`\n-# Hamlenizi yapmak için aşağıdaki butonları kullanın." },
  { key: "blackjackWin", cat: "eco", title: "Blackjack Kazanma", default: "### 🎉 Blackjack - Kazandınız!\n▫️ 🏆 **Kazanılan:** `+{amount}` Coin\n▫️ 💳 **Güncel Bakiye:** `{balance}` Coin\n-# Tebrikler! Krupiyeyi yenerek bahsinizi katladınız." },
  { key: "blackjackLose", cat: "eco", title: "Blackjack Kaybetme", default: "### 💀 Blackjack - Kaybettiniz\n▫️ 📉 **Kaybedilen:** `-{amount}` Coin\n▫️ 💳 **Güncel Bakiye:** `{balance}` Coin\n-# Krupiye bu eli kazandı. Şansınızı tekrar deneyin!" },
  { key: "blackjackPush", cat: "eco", title: "Blackjack Berabere (İade)", default: "### ⚖️ Blackjack - Berabere (Push)\n▫️ ↩️ **İade Edilen:** `{amount}` Coin\n▫️ 💳 **Güncel Bakiye:** `{balance}` Coin\n-# Kart toplamları eşit olduğu için bahis cüzdanınıza iade edildi." },
  { key: "slotWin", cat: "eco", title: "Slot Kazanma", default: "### 🎰 Slot Makinesi - Büyük Kazanç!\n▫️ `[ {reel1} | {reel2} | {reel3} ]`\n▫️ 🌟 **Çarpan:** `{multiplier}x` • **Kazanılan:** `+{amount}` Coin\n▫️ 💳 **Güncel Cüzdan:** `{balance}` Coin" },
  { key: "slotLose", cat: "eco", title: "Slot Kaybetme", default: "### 🎰 Slot Makinesi - Kazanamadınız\n▫️ `[ {reel1} | {reel2} | {reel3} ]`\n▫️ 📉 **Kaybedilen:** `-{amount}` Coin\n▫️ 💳 **Güncel Cüzdan:** `{balance}` Coin" },
  { key: "ruletWin", cat: "eco", title: "Rulet Kazanma", default: "### 🎡 Rulet - Kazandınız!\n▫️ 🎯 **Gelen Sonuç:** `{color}` (`{number}`)\n▫️ 💰 **Kazanılan:** `+{amount}` Coin\n▫️ 💳 **Güncel Bakiye:** `{balance}` Coin" },
  { key: "ruletLose", cat: "eco", title: "Rulet Kaybetme", default: "### 🎡 Rulet - Kaybettiniz\n▫️ 🎯 **Gelen Sonuç:** `{color}` (`{number}`)\n▫️ 📉 **Kaybedilen:** `-{amount}` Coin\n▫️ 💳 **Güncel Bakiye:** `{balance}` Coin" },
  { key: "depositSuccess", cat: "eco", title: "Vadeli Mevduat Yatırımı", default: "### 🏦 Vadeli Mevduat Hesabı Açıldı\n▫️ 💰 **Yatırılan Tutar:** `{amount}` Coin\n▫️ 📈 **Vade Getirisi:** `%5 Faiz / 24 Saat`\n-# Vade süresi dolduğunda tutar banka hesabınıza aktarılacaktır." },
  { key: "companyCreated", cat: "eco", title: "Şirket Kuruldu", default: "### 🏢 Şirket Kuruluşu Onaylandı\n▫️ 🏷️ **Şirket Adı:** `{name}`\n-# Şirketiniz tescillendi. Düzenli pasif gelir toplayabilirsiniz." },
  { key: "propertyBought", cat: "eco", title: "Gayrimenkul Satın Alındı", default: "### 🏠 Gayrimenkul Yatırımı Yapıldı\n▫️ 🔑 **Satın Alınan Mülk:** `{type}`\n-# Satın aldığınız mülkten günlük kira geliri hesabınıza eklenecektir." },
  { key: "lotteryWin", cat: "eco", title: "Piyango Kazandı", default: "### 🎟️ Piyango Büyük İkramiye!\n▫️ 🌟 **Kazanılan:** `+{amount}` Coin\n-# Şanslı bilet numaranız çekilişte kazandı!" },
  { key: "mineSuccess", cat: "eco", title: "Maden Kazısı Tamamlandı", default: "### ⛏️ Maden Kazısı Başarılı\n▫️ 💎 **Cevher:** `{mineral}`\n▫️ 💰 **Kazanılan Değer:** `+{amount}` Coin" },
  { key: "fishSuccess", cat: "eco", title: "Balık Avı Başarılı", default: "### 🎣 Balık Avı Başarılı\n▫️ 🐟 **Yakalanan:** `{fish}`\n▫️ 💰 **Satış Değeri:** `+{amount}` Coin" },
  { key: "customRoomCreated", cat: "util", title: "Özel Oda Oluşturuldu", default: "### 🔊 Özel Ses Odası Oluşturuldu\n▫️ 👤 **Oda Sahibi:** {user}\n▫️ 🚪 **Kanalınız:** {channel}\n-# Aşağıdaki panel butonlarıyla odanızı yönetebilirsiniz." },
  { key: "roomLocked", cat: "util", title: "Özel Oda Kilitlendi", default: "### 🔒 Oda Kilitlendi\n▫️ Özel ses odanız kilitlendi. Yabancı üyeler odaya katılamaz." },
  { key: "roomUnlocked", cat: "util", title: "Özel Oda Kilidi Açıldı", default: "### 🔓 Oda Kilidi Açıldı\n▫️ Özel ses odanızın kilidi açıldı. Artık tüm üyeler odaya katılabilir." },
  { key: "ticketCreated", cat: "util", title: "Destek Bileti Açıldı", default: "### 🎫 Destek Talebi Açıldı\n▫️ 👤 **Talep Sahibi:** {user}\n▫️ 📩 **Destek Kanalı:** {channel}\n-# Yetkililerimiz en kısa sürede talebinizi yanıtlayacaktır." },
  { key: "ticketClosed", cat: "util", title: "Destek Bileti Kapatıldı", default: "### 🔒 Destek Talebi Sonlandırıldı\n▫️ Destek talebi yetkili tarafından sonlandırıldı. Kanal 5 saniye içinde silinecektir..." },
  { key: "afkSet", cat: "util", title: "AFK Moduna Geçildi", default: "### 💤 AFK Moduna Geçildi\n▫️ **Kullanıcı:** {user}\n▫️ **Durum / Sebep:** `{reason}`\n-# Kanala tekrar mesaj yazdığınızda AFK modunuz otomatik kaldırılır." },
  { key: "suggestionNew", cat: "util", title: "Yeni Öneri Bildirimi", default: "### 💡 Yeni Sunucu Önerisi\n▫️ **Öneren:** {user}\n```text\n{content}\n```\n-# Öneriyi oylamak için aşağıdaki butonları kullanabilirsiniz." },
  { key: "confessionNew", cat: "util", title: "Anonim İtiraf", default: "### 🎭 Anonim İtiraf\n```text\n{content}\n```\n-# Bu itiraf tamamen anonim olarak iletilmiştir." },
  { key: "birthdayWish", cat: "util", title: "Doğum Günü Kutlaması", default: "### 🎂 Doğum Günün Kutlu Olsun!\n▫️ Sevgili {user}, yeni yaşın sağlık, mutluluk ve başarı getirsin! Nice mutlu senelere! 🎉" },
  { key: "radioStart", cat: "util", title: "Radyo Yayını Başlatıldı", default: "### 📻 Radyo Yayını Başlatıldı\n▫️ 🎵 **İstasyon:** `{station}`\n▫️ 🔗 **Yayın Akışı:** `{url}`\n-# Radyo ses odasında canlı olarak çalınıyor." },
  { key: "userStats", cat: "stat", title: "Kullanıcı Aktivite Özeti", default: "### 📊 Kullanıcı Aktivite İstatistikleri\n▫️ **Kullanıcı:** {user}\n▫️ 🎙️ **Ses Aktifliği (Toplam / Hafta / Gün):** `{totalVoice}` • `{weeklyVoice}` • `{dailyVoice}`\n▫️ 💬 **Mesaj Aktifliği (Toplam / Hafta / Gün):** `{totalMsgs}` • `{weeklyMsgs}` • `{dailyMsgs}`" },
  { key: "topStats", cat: "stat", title: "Liderlik Sıralaması", default: "### 🏆 {guild} En Aktifler Liderlik Tablosu\n{ranking}\n-# Sıralama haftalık ve genel aktivite verilerine göre hesaplanmaktadır." },
  { key: "staffTask", cat: "stat", title: "Yetkili Görev Durumu", default: "### 📋 Yetkili Haftalık Görev Durumu\n▫️ **Yetkili:** {user}\n▫️ 🎙️ **Ses Süresi:** `{voiceHours}` Saat\n▫️ 💬 **Mesaj Sayısı:** `{msgs}` Mesaj\n▫️ 👥 **Kayıt Sayısı:** `{regs}` Kayıt\n▫️ ⭐ **Toplam Puan:** `{points}` Puan" },
  { key: "attendanceReport", cat: "stat", title: "Toplantı Yoklama Raporu", default: "### 📢 Toplantı Yoklama Raporu\n▫️ 🔊 **Kanal:** {channel}\n▫️ 🟢 **Katılan:** `{attendedCount}` • 🔴 **Katılmayan:** `{missingCount}`\n▫️ 👥 **Katılanlar:** {attendedList}" },
  { key: "guardAlert", cat: "guard", title: "Güvenlik İhlal Uyarısı", default: "### 🛡️ Güvenlik Bildirimi (Guard)\n▫️ 🚨 **Kullanıcı:** {user}\n▫️ ⚠️ **İhlal Nedeni:** `{reason}`\n-# Guard koruma kalkanı devreye girdi ve işlem geri alındı." }
];

const commandsCatalog = [
  { name: "ban", cat: "mod", catTitle: "Moderasyon" },
  { name: "unban", cat: "mod", catTitle: "Moderasyon" },
  { name: "jail", cat: "mod", catTitle: "Moderasyon" },
  { name: "unjail", cat: "mod", catTitle: "Moderasyon" },
  { name: "mute", cat: "mod", catTitle: "Moderasyon" },
  { name: "unmute", cat: "mod", catTitle: "Moderasyon" },
  { name: "vmute", cat: "mod", catTitle: "Moderasyon" },
  { name: "unvmute", cat: "mod", catTitle: "Moderasyon" },
  { name: "kick", cat: "mod", catTitle: "Moderasyon" },
  { name: "sicil", cat: "mod", catTitle: "Moderasyon" },
  { name: "ceza", cat: "mod", catTitle: "Moderasyon" },
  { name: "cezapuan", cat: "mod", catTitle: "Moderasyon" },
  { name: "forceban", cat: "mod", catTitle: "Moderasyon" },
  { name: "unforceban", cat: "mod", catTitle: "Moderasyon" },
  { name: "kilit", cat: "mod", catTitle: "Moderasyon" },
  { name: "toplorol", cat: "mod", catTitle: "Moderasyon" },
  { name: "medyakanal", cat: "mod", catTitle: "Moderasyon" },
  { name: "uyar", cat: "mod", catTitle: "Moderasyon" },
  { name: "uyarilar", cat: "mod", catTitle: "Moderasyon" },
  { name: "uyarisil", cat: "mod", catTitle: "Moderasyon" },
  { name: "otocevap", cat: "mod", catTitle: "Moderasyon" },
  { name: "seskapat", cat: "mod", catTitle: "Moderasyon" },
  { name: "sesac", cat: "mod", catTitle: "Moderasyon" },
  { name: "afk", cat: "mod", catTitle: "Moderasyon" },
  { name: "snipe", cat: "mod", catTitle: "Moderasyon" },
  { name: "say", cat: "mod", catTitle: "Moderasyon" },
  { name: "kpi", cat: "mod", catTitle: "Moderasyon" },
  { name: "slowmode", cat: "mod", catTitle: "Moderasyon" },
  { name: "sil", cat: "mod", catTitle: "Moderasyon" },
  { name: "siciltemizle", cat: "mod", catTitle: "Moderasyon" },
  { name: "karantinatemizle", cat: "mod", catTitle: "Moderasyon" },
  { name: "rolver", cat: "mod", catTitle: "Moderasyon" },
  { name: "rolal", cat: "mod", catTitle: "Moderasyon" },
  { name: "rolsuzver", cat: "mod", catTitle: "Moderasyon" },

  { name: "kayit", cat: "reg", catTitle: "Kayıt" },
  { name: "erkek", cat: "reg", catTitle: "Kayıt" },
  { name: "kadin", cat: "reg", catTitle: "Kayıt" },
  { name: "isim", cat: "reg", catTitle: "Kayıt" },
  { name: "isimler", cat: "reg", catTitle: "Kayıt" },
  { name: "gckontrol", cat: "reg", catTitle: "Kayıt" },
  { name: "dogrulama", cat: "reg", catTitle: "Kayıt" },
  { name: "cihaz", cat: "reg", catTitle: "Kayıt" },
  { name: "kayitsifirla", cat: "reg", catTitle: "Kayıt" },
  { name: "teyitsifirla", cat: "reg", catTitle: "Kayıt" },
  { name: "kayitbilgi", cat: "reg", catTitle: "Kayıt" },
  { name: "topteyit", cat: "reg", catTitle: "Kayıt" },
  { name: "davet", cat: "reg", catTitle: "Kayıt" },
  { name: "davetekle", cat: "reg", catTitle: "Kayıt" },
  { name: "tagtara", cat: "reg", catTitle: "Kayıt" },
  { name: "vip", cat: "reg", catTitle: "Kayıt" },
  { name: "kayitsiz", cat: "reg", catTitle: "Kayıt" },

  { name: "stat", cat: "stat", catTitle: "İstatistik" },
  { name: "topstat", cat: "stat", catTitle: "İstatistik" },
  { name: "seviye", cat: "stat", catTitle: "İstatistik" },
  { name: "topseviye", cat: "stat", catTitle: "İstatistik" },
  { name: "yetkilistat", cat: "stat", catTitle: "İstatistik" },
  { name: "yetkililer", cat: "stat", catTitle: "İstatistik" },
  { name: "gorev", cat: "stat", catTitle: "İstatistik" },
  { name: "toplanti", cat: "stat", catTitle: "İstatistik" },
  { name: "yoklama", cat: "stat", catTitle: "İstatistik" },
  { name: "grafik", cat: "stat", catTitle: "İstatistik" },
  { name: "topkanal", cat: "stat", catTitle: "İstatistik" },
  { name: "me", cat: "stat", catTitle: "İstatistik" },
  { name: "ses", cat: "stat", catTitle: "İstatistik" },
  { name: "resetstat", cat: "stat", catTitle: "İstatistik" },
  { name: "bilet", cat: "stat", catTitle: "İstatistik" },
  { name: "tema", cat: "stat", catTitle: "İstatistik" },

  { name: "coin", cat: "eco", catTitle: "Ekonomi" },
  { name: "coinver", cat: "eco", catTitle: "Ekonomi" },
  { name: "gunluk", cat: "eco", catTitle: "Ekonomi" },
  { name: "calis", cat: "eco", catTitle: "Ekonomi" },
  { name: "gonder", cat: "eco", catTitle: "Ekonomi" },
  { name: "banka", cat: "eco", catTitle: "Ekonomi" },
  { name: "market", cat: "eco", catTitle: "Ekonomi" },
  { name: "itemmarket", cat: "eco", catTitle: "Ekonomi" },
  { name: "kullan", cat: "eco", catTitle: "Ekonomi" },
  { name: "esyagonder", cat: "eco", catTitle: "Ekonomi" },
  { name: "esyasat", cat: "eco", catTitle: "Ekonomi" },
  { name: "klan", cat: "eco", catTitle: "Ekonomi" },
  { name: "klantop", cat: "eco", catTitle: "Ekonomi" },
  { name: "al", cat: "eco", catTitle: "Ekonomi" },
  { name: "sat", cat: "eco", catTitle: "Ekonomi" },
  { name: "envanter", cat: "eco", catTitle: "Ekonomi" },
  { name: "topcoin", cat: "eco", catTitle: "Ekonomi" },
  { name: "soygun", cat: "eco", catTitle: "Ekonomi" },
  { name: "blackjack", cat: "eco", catTitle: "Ekonomi" },
  { name: "slot", cat: "eco", catTitle: "Ekonomi" },
  { name: "rulet", cat: "eco", catTitle: "Ekonomi" },
  { name: "yazitura", cat: "eco", catTitle: "Ekonomi" },
  { name: "borsa", cat: "eco", catTitle: "Ekonomi" },
  { name: "satinal", cat: "eco", catTitle: "Ekonomi" },
  { name: "mevduat", cat: "eco", catTitle: "Ekonomi" },
  { name: "sirket", cat: "eco", catTitle: "Ekonomi" },
  { name: "emlak", cat: "eco", catTitle: "Ekonomi" },
  { name: "piyango", cat: "eco", catTitle: "Ekonomi" },
  { name: "kazikazan", cat: "eco", catTitle: "Ekonomi" },
  { name: "balik", cat: "eco", catTitle: "Ekonomi" },
  { name: "maden", cat: "eco", catTitle: "Ekonomi" },

  { name: "yardim", cat: "util", catTitle: "Yardımcı" },
  { name: "avatar", cat: "util", catTitle: "Yardımcı" },
  { name: "banner", cat: "util", catTitle: "Yardımcı" },
  { name: "kullanicibilgi", cat: "util", catTitle: "Yardımcı" },
  { name: "sunucubilgi", cat: "util", catTitle: "Yardımcı" },
  { name: "rolbilgi", cat: "util", catTitle: "Yardımcı" },
  { name: "kanalbilgi", cat: "util", catTitle: "Yardımcı" },
  { name: "kurallar", cat: "util", catTitle: "Yardımcı" },
  { name: "ping", cat: "util", catTitle: "Yardımcı" },
  { name: "ticketkur", cat: "util", catTitle: "Yardımcı" },
  { name: "bilet", cat: "util", catTitle: "Yardımcı" },
  { name: "biletkapat", cat: "util", catTitle: "Yardımcı" },
  { name: "anket", cat: "util", catTitle: "Yardımcı" },
  { name: "cekilis", cat: "util", catTitle: "Yardımcı" },
  { name: "reroll", cat: "util", catTitle: "Yardımcı" },
  { name: "butonrol", cat: "util", catTitle: "Yardımcı" },
  { name: "odapanel", cat: "util", catTitle: "Yardımcı" },
  { name: "radyo", cat: "util", catTitle: "Yardımcı" },
  { name: "birlikte", cat: "util", catTitle: "Yardımcı" },
  { name: "oneri", cat: "util", catTitle: "Yardımcı" },
  { name: "itiraf", cat: "util", catTitle: "Yardımcı" },
  { name: "dogumgunu", cat: "util", catTitle: "Yardımcı" },

  { name: "korumabilgi", cat: "guard", catTitle: "Güvenlik" },
  { name: "guvenli", cat: "guard", catTitle: "Güvenlik" },
  { name: "yedekal", cat: "guard", catTitle: "Güvenlik" },
  { name: "yedekyukle", cat: "guard", catTitle: "Güvenlik" },
  { name: "yedekliste", cat: "guard", catTitle: "Güvenlik" }
];

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}

document.querySelectorAll(".nav-btn").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));

    button.classList.add("active");
    const target = button.getAttribute("data-tab");
    const targetPane = document.getElementById(target);
    if (targetPane) targetPane.classList.add("active");

    if (target === "tab-overview") loadOverview();
    if (target === "tab-bot-fleet") {
      loadBotCredentials();
      loadBotOwners();
    }
    if (target === "tab-config") loadConfig();
    if (target === "tab-commands") loadCommands();
    if (target === "tab-messages") loadMessages();
    if (target === "tab-voice") loadVoiceBots();
    if (target === "tab-penalties") loadPenalties();
    if (target === "tab-guard") loadGuard();
    if (target === "tab-metrics") fetchLiveMetrics();
    if (target === "tab-autoresponders") {
      loadAutoResponders();
      loadMediaChannels();
    }
    if (target === "tab-leaderboard") loadLeaderboard();
    if (target === "tab-weekly-rewards") loadWeeklyRewards();
    if (target === "tab-staff-matrix") loadStaffMatrix();
    if (target === "tab-tickets") loadTickets();
    if (target === "tab-economy") loadEconomy();
    if (target === "tab-battlepass") loadBattlePassData();
    if (target === "tab-clans") loadClansData();
    if (target === "tab-badges-titles") loadBadgesData();
    if (target === "tab-pets") loadPetsData();
    if (target === "tab-casino") loadCasinoData();
    if (target === "tab-backups") loadBackups();
    if (target === "tab-invites") loadInvites();
    if (target === "tab-staff-tasks") loadStaffTasks();
    if (target === "tab-livechat") {
      fetchConsoleLogs();
      startConsoleAutoRefresh();
    } else {
      stopConsoleAutoRefresh();
    }
    if (target === "tab-git-update") {
      loadGitStatus();
      loadSystemBackups();
    }
  });
});

async function loadAutoResponders() {
  try {
    const res = await fetch(`/api/auto-responders/${currentGuildId}`);
    const list = await res.json();
    const tbody = document.getElementById("ar-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Kayıtlı yanıt bulunmuyor.</td></tr>';
      return;
    }

    list.forEach((ar) => {
      const tr = document.createElement("tr");
      const safeTrigger = (ar.trigger || "").replace(/'/g, "\\'");
      tr.innerHTML = `
        <td><code>${ar.trigger}</code></td>
        <td><span class="status-pill status-pill-active">${ar.matchType || "exact"}</span></td>
        <td>${ar.response}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteAutoResponder('${safeTrigger}')">Sil</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Auto-responderlar yüklenemedi.", "danger");
  }
}

window.deleteAutoResponder = async function(trigger) {
  try {
    const res = await fetch(`/api/auto-responders/${currentGuildId}/${encodeURIComponent(trigger)}`, {
      method: "DELETE"
    });
    if (res.ok) {
      loadAutoResponders();
      showToast(`"${trigger}" yanıtlayıcısı silindi.`);
    } else {
      showToast("Silme işlemi başarısız.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

document.getElementById("form-ar-add")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const trigger = document.getElementById("ar-trigger")?.value.trim();
  const matchType = document.getElementById("ar-matchtype")?.value || "exact";
  const response = document.getElementById("ar-response")?.value.trim();

  if (!trigger || !response) return;

  try {
    const res = await fetch(`/api/auto-responders/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger, matchType, response })
    });
    if (res.ok) {
      document.getElementById("form-ar-add").reset();
      loadAutoResponders();
      showToast("Auto-responder başarıyla kaydedildi.");
    } else {
      showToast("Kaydedilemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
});

let currentLbType = "messages";

async function loadLeaderboard(type) {
  if (type) currentLbType = type;
  try {
    const res = await fetch(`/api/leaderboard/${currentGuildId}?type=${currentLbType}&limit=25`);
    const list = await res.json();
    const tbody = document.getElementById("lb-tbody");
    const colVal = document.getElementById("lb-col-val");
    const titleEl = document.getElementById("lb-title");

    if (colVal) {
      colVal.textContent = currentLbType === "voice" ? "Ses Süresi" : currentLbType === "xp" ? "XP Seviyesi" : "Mesaj Sayısı";
    }
    if (titleEl) {
      titleEl.textContent = currentLbType === "voice" ? "En Çok Seste Kalanlar" : currentLbType === "xp" ? "En Yüksek XP Sahipleri" : "En Çok Mesaj Gönderenler";
    }

    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted">Aktivite verisi bulunmuyor.</td></tr>';
      return;
    }

    list.forEach((st, idx) => {
      let valDisplay = "0";
      if (currentLbType === "messages") {
        valDisplay = `${(st.totalMessages || 0).toLocaleString("tr-TR")} mesaj`;
      } else if (currentLbType === "voice") {
        const totalMinutes = Math.floor((st.totalVoiceMs || 0) / 60000);
        const hrs = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        valDisplay = `${hrs} sa ${mins} dk`;
      } else if (currentLbType === "xp") {
        valDisplay = `${(st.xp || 0).toLocaleString("tr-TR")} XP (Seviye ${st.level || 1})`;
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td><code>${st.userId}</code></td>
        <td>${valDisplay}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Liderlik verileri alınamadı.", "danger");
  }
}

document.querySelectorAll(".filter-pill[data-lb-type]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill[data-lb-type]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    loadLeaderboard(btn.getAttribute("data-lb-type"));
  });
});

let currentWeeklyRewards = [];

async function loadWeeklyRewards() {
  try {
    const [rewardsRes, cfgRes] = await Promise.all([
      fetch(`/api/weekly-rewards/${currentGuildId}`),
      fetch(`/api/config/${currentGuildId}`)
    ]);

    const rewards = await rewardsRes.json();
    currentWeeklyRewards = Array.isArray(rewards) ? rewards : [];

    const cfg = await cfgRes.json();
    const logChannelInput = document.getElementById("wr-log-channel");
    if (logChannelInput && cfg?.channels?.weeklyRewardLog) {
      logChannelInput.value = cfg.channels.weeklyRewardLog;
    }

    const tbody = document.getElementById("wr-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (currentWeeklyRewards.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-muted">Tanımlı ödül bulunmuyor.</td></tr>';
      return;
    }

    currentWeeklyRewards.sort((a, b) => (a.rank || 0) - (b.rank || 0));

    currentWeeklyRewards.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${r.rank}. Sıra</strong></td>
        <td><code>${r.roleId}</code></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteWeeklyReward(${r.rank})">Kaldır</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Haftalık ödüller yüklenemedi.", "danger");
  }
}

window.deleteWeeklyReward = async function(rank) {
  const updated = currentWeeklyRewards.filter((r) => r.rank !== rank);
  try {
    const res = await fetch(`/api/weekly-rewards/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyRewards: updated })
    });
    if (res.ok) {
      loadWeeklyRewards();
      showToast(`${rank}. sıra ödülü kaldırıldı.`);
    } else {
      showToast("Ödül silinemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.saveWeeklyRewardChannel = async function() {
  const channelId = document.getElementById("wr-log-channel")?.value.trim() || "";
  try {
    const res = await fetch(`/api/config/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channels: { weeklyRewardLog: channelId }
      })
    });
    if (res.ok) {
      showToast("Ödül log kanalı kaydedildi.");
    } else {
      showToast("Kanal kaydedilemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

document.getElementById("form-wr-add")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rank = Number(document.getElementById("wr-rank")?.value);
  const roleId = document.getElementById("wr-role")?.value.trim();

  if (!rank || !roleId) return;

  const filtered = currentWeeklyRewards.filter((r) => r.rank !== rank);
  filtered.push({ rank, roleId });

  try {
    const res = await fetch(`/api/weekly-rewards/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weeklyRewards: filtered })
    });
    if (res.ok) {
      document.getElementById("form-wr-add").reset();
      loadWeeklyRewards();
      showToast(`${rank}. sıra ödülü tanımlandı.`);
    } else {
      showToast("Ödül eklenemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
});

async function loadStaffMatrix() {
  try {
    const res = await fetch(`/api/staff-roles/${currentGuildId}`);
    const data = await res.json();
    if (!data) return;

    const staffEl = document.getElementById("sm-staff");
    const regEl = document.getElementById("sm-register");
    const modEl = document.getElementById("sm-moderation");

    if (staffEl) staffEl.value = (data.staffRoles || []).join(", ");
    if (regEl) regEl.value = (data.registerStaff || []).join(", ");
    if (modEl) modEl.value = (data.moderationStaff || []).join(", ");
  } catch (error) {
    showToast("Yetkili rolleri yüklenemedi.", "danger");
  }
}

window.saveStaffMatrix = async function() {
  const staffRoles = (document.getElementById("sm-staff")?.value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const registerStaff = (document.getElementById("sm-register")?.value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const moderationStaff = (document.getElementById("sm-moderation")?.value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    const res = await fetch(`/api/staff-roles/${currentGuildId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffRoles, registerStaff, moderationStaff })
    });
    if (res.ok) {
      showToast("Yetkili yetki matrisi başarıyla güncellendi.");
    } else {
      showToast("Matris kaydedilemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

async function loadMediaChannels() {
  try {
    const res = await fetch(`/api/media-channels/${currentGuildId}`);
    const list = await res.json();
    const tbody = document.getElementById("media-ch-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-muted">Kayıtlı medya kanalı bulunmuyor.</td></tr>';
      return;
    }

    list.forEach((chId) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code>${chId}</code></td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteMediaChannel('${chId}')">Kaldır</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Medya kanalları yüklenemedi.", "danger");
  }
}

window.deleteMediaChannel = async function(channelId) {
  try {
    const res = await fetch(`/api/media-channels/${currentGuildId}/${channelId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      loadMediaChannels();
      showToast("Medya kanalı kaldırıldı.");
    } else {
      showToast("Silme işlemi başarısız.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

document.getElementById("form-media-ch-add")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const channelId = document.getElementById("media-ch-input")?.value.trim();
  if (!channelId) return;

  try {
    const res = await fetch(`/api/media-channels/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId })
    });
    if (res.ok) {
      document.getElementById("form-media-ch-add").reset();
      loadMediaChannels();
      showToast("Kanal medya moduna alındı.");
    } else {
      showToast("Eklenemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
});

async function loadTickets() {
  try {
    const res = await fetch(`/api/tickets/${currentGuildId}`);
    const list = await res.json();
    const tbody = document.getElementById("tickets-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Bilet kaydı bulunmuyor.</td></tr>';
      return;
    }

    list.forEach((t) => {
      const tr = document.createElement("tr");
      const stars = t.rating ? "⭐".repeat(t.rating) : "-";
      const statusPill = t.status === "OPEN"
        ? '<span class="status-pill status-pill-active">Açık</span>'
        : '<span class="status-pill status-pill-danger">Kapalı</span>';

      tr.innerHTML = `
        <td><strong>#${t.ticketId}</strong></td>
        <td><code>${t.openerId}</code></td>
        <td>${statusPill}</td>
        <td>${t.closedBy ? `<code>${t.closedBy}</code>` : "-"}</td>
        <td>${stars}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="viewTicketTranscript(${t.ticketId})">Transkript Gör</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Biletler yüklenemedi.", "danger");
  }
}

window.viewTicketTranscript = async function(ticketId) {
  try {
    const res = await fetch(`/api/tickets/${currentGuildId}/${ticketId}/transcript`);
    const data = await res.json();
    if (!data || !Array.isArray(data.transcript)) return;

    const modal = document.getElementById("ticket-modal-card");
    const title = document.getElementById("ticket-modal-title");
    const sub = document.getElementById("ticket-modal-sub");
    const box = document.getElementById("ticket-transcript-box");

    if (modal && title && sub && box) {
      title.textContent = `Bilet #${ticketId} Transkripti (${data.status})`;
      sub.textContent = `Açan: ${data.openerId} | Değerlendirme: ${data.rating ? "⭐".repeat(data.rating) : "Puanlanmadı"}`;

      if (data.transcript.length === 0) {
        box.innerHTML = '<p class="text-muted">Bu bilette kayıtlı mesaj bulunmuyor.</p>';
      } else {
        box.innerHTML = data.transcript.map((m) => {
          const time = new Date(m.timestamp).toLocaleTimeString("tr-TR");
          return `<div style="margin-bottom: 6px;"><strong>[${time}] ${m.authorTag}:</strong> ${m.content}</div>`;
        }).join("");
      }

      modal.style.display = "block";
      modal.scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    showToast("Transkript yüklenemedi.", "danger");
  }
};

window.closeTicketTranscript = function() {
  const modal = document.getElementById("ticket-modal-card");
  if (modal) modal.style.display = "none";
};

async function loadEconomy() {
  try {
    const res = await fetch(`/api/economy/overview/${currentGuildId}`);
    const data = await res.json();
    if (!data) return;

    const wSum = document.getElementById("eco-wallet-sum");
    const bSum = document.getElementById("eco-bank-sum");
    const aCount = document.getElementById("eco-accounts-count");
    const gDisp = document.getElementById("eco-gold-disp");
    const gInput = document.getElementById("eco-gold-input");
    const bInput = document.getElementById("eco-btc-input");

    if (wSum) wSum.textContent = `${(data.totalWalletCirculation || 0).toLocaleString("tr-TR")} Coin`;
    if (bSum) bSum.textContent = `${(data.totalBankCirculation || 0).toLocaleString("tr-TR")} Coin`;
    if (aCount) aCount.textContent = `${data.totalAccounts || 0} Kullanıcı`;
    if (gDisp) gDisp.textContent = `${(data.goldPrice || 2500).toLocaleString("tr-TR")} Coin`;
    if (gInput) gInput.value = data.goldPrice || 2500;
    if (bInput) bInput.value = data.btcPrice || 65000;
    loadMarketItems();
  } catch (error) {
    showToast("Ekonomi verileri yüklenemedi.", "danger");
  }
}

window.saveEconomyRates = async function() {
  const goldPrice = Number(document.getElementById("eco-gold-input")?.value);
  const btcPrice = Number(document.getElementById("eco-btc-input")?.value);

  try {
    const res = await fetch(`/api/economy/rates/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goldPrice, btcPrice })
    });
    if (res.ok) {
      loadEconomy();
      showToast("Borsa kurları başarıyla güncellendi.");
    } else {
      showToast("Kurlar kaydedilemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

let currentMarketItems = [];

async function loadMarketItems() {
  try {
    const res = await fetch(`/api/economy/market-items/${currentGuildId}`);
    const data = await res.json();
    if (!data || !Array.isArray(data.items)) return;

    currentMarketItems = data.items;
    const discInput = document.getElementById("eco-discount-input");
    if (discInput) discInput.value = data.discountPercent || 0;

    const tbody = document.getElementById("market-items-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    data.items.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">${item.emoji}</span>
            <div>
              <strong>${item.name}</strong>
              <div class="text-sub" style="font-size: 11px;">Kod: <code>${item.itemKey}</code> : ${item.description}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-secondary">${item.type}</span></td>
        <td><code>${item.defaultPrice.toLocaleString("tr-TR")} Coin</code></td>
        <td style="width: 170px;">
          <input type="number" class="market-item-price-input" data-key="${item.itemKey}" value="${item.currentPrice}" min="1" style="width: 130px; padding: 6px 10px; border-radius: 6px; border: 1px solid var(--border-color, #333); background: rgba(0,0,0,0.2); color: #fff;">
        </td>
        <td style="width: 130px;">
          <label class="switch-label" style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
            <input type="checkbox" class="market-item-active-chk" data-key="${item.itemKey}" ${!item.disabled ? "checked" : ""}>
            <span style="font-size: 12px;">${!item.disabled ? "Satışta" : "Kapalı"}</span>
          </label>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Eşya pazar listesi yüklenemedi.", "danger");
  }
}

window.loadMarketItems = loadMarketItems;

window.saveMarketItemPrices = async function() {
  const priceInputs = document.querySelectorAll(".market-item-price-input");
  const activeCheckboxes = document.querySelectorAll(".market-item-active-chk");
  const discountPercent = Number(document.getElementById("eco-discount-input")?.value || 0);

  const itemPrices = {};
  priceInputs.forEach((input) => {
    const key = input.getAttribute("data-key");
    const val = Number(input.value);
    if (key && !isNaN(val) && val > 0) {
      itemPrices[key] = val;
    }
  });

  const disabledItems = [];
  activeCheckboxes.forEach((chk) => {
    const key = chk.getAttribute("data-key");
    if (key && !chk.checked) {
      disabledItems.push(key);
    }
  });

  try {
    const res = await fetch(`/api/economy/market-items/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemPrices, disabledItems, discountPercent })
    });
    if (res.ok) {
      loadMarketItems();
      showToast("Eşya fiyatları ve market ayarları başarıyla kaydedildi.");
    } else {
      showToast("Ayarlar kaydedilemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.resetDefaultPrices = function() {
  if (!Array.isArray(currentMarketItems)) return;
  const priceInputs = document.querySelectorAll(".market-item-price-input");
  priceInputs.forEach((input) => {
    const key = input.getAttribute("data-key");
    const item = currentMarketItems.find((i) => i.itemKey === key);
    if (item) input.value = item.defaultPrice;
  });
  const disc = document.getElementById("eco-discount-input");
  if (disc) disc.value = 0;
  showToast("Fiyatlar varsayılan değerlere döndürüldü. Kaydetmek için 'Fiyatları Kaydet' butonuna basın.");
};

async function loadBackups() {
  try {
    const res = await fetch(`/api/backups/${currentGuildId}`);
    const list = await res.json();
    const tbody = document.getElementById("backups-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Kayıtlı yedek bulunmuyor.</td></tr>';
      return;
    }

    list.forEach((b) => {
      const tr = document.createElement("tr");
      const dateStr = b.createdAt ? new Date(b.createdAt).toLocaleString("tr-TR") : "-";
      tr.innerHTML = `
        <td><code>${b.id}</code></td>
        <td><span class="status-pill status-pill-active">${b.type}</span></td>
        <td>${dateStr}</td>
        <td>${b.roleCount} rol</td>
        <td>${b.channelCount} kanal</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Yedekler yüklenemedi.", "danger");
  }
}

async function loadInvites() {
  try {
    const res = await fetch(`/api/invites/${currentGuildId}`);
    const list = await res.json();
    const tbody = document.getElementById("invites-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted">Davet verisi bulunmuyor.</td></tr>';
      return;
    }

    list.forEach((inv, idx) => {
      const regular = inv.regular || 0;
      const fake = inv.fake || 0;
      const leaves = inv.leaves || 0;
      const bonus = inv.bonus || 0;
      const net = regular + bonus - fake - leaves;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td><code>${inv.userId}</code></td>
        <td>${regular}</td>
        <td>${fake}</td>
        <td>${leaves}</td>
        <td>${bonus}</td>
        <td><strong>${net}</strong></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Davet verileri yüklenemedi.", "danger");
  }
}

async function loadStaffTasks() {
  try {
    const res = await fetch(`/api/staff-tasks/${currentGuildId}`);
    const list = await res.json();
    const tbody = document.getElementById("staff-tasks-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Bu haftaya ait görev kaydı bulunmuyor.</td></tr>';
      return;
    }

    list.forEach((task) => {
      const voiceHours = (task.currentVoiceMs / 3600000).toFixed(1);
      const targetVoiceHours = (task.targetVoiceMs / 3600000).toFixed(1);

      const statusPill = task.status === "COMPLETED"
        ? '<span class="status-pill status-pill-active">Tamamlandı</span>'
        : task.status === "FAILED"
        ? '<span class="status-pill status-pill-danger">Başarısız</span>'
        : '<span class="status-pill status-pill-warning">Devam Ediyor</span>';

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><code>${task.userId}</code></td>
        <td>${voiceHours} / ${targetVoiceHours} sa</td>
        <td>${task.currentMessages} / ${task.targetMessages}</td>
        <td>${task.currentRegisters} / ${task.targetRegisters}</td>
        <td><strong>${task.points}</strong></td>
        <td>${statusPill}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showToast("Görevler yüklenemedi.", "danger");
  }
}

let consoleTimer = null;

function startConsoleAutoRefresh() {
  if (consoleTimer) clearInterval(consoleTimer);
  consoleTimer = setInterval(fetchConsoleLogs, 2500);
}

function stopConsoleAutoRefresh() {
  if (consoleTimer) {
    clearInterval(consoleTimer);
    consoleTimer = null;
  }
}

async function fetchConsoleLogs() {
  try {
    const res = await fetch("/api/console/logs");
    const logs = await res.json();
    const box = document.getElementById("live-console-box");
    if (!box) return;

    if (!Array.isArray(logs) || logs.length === 0) {
      box.textContent = "Henüz sistem log kaydı bulunmuyor.";
      return;
    }

    box.innerHTML = logs.map((l) => {
      const timeStr = l.time ? l.time.substring(11, 19) : "";
      const color = l.level === "ERROR" ? "#ff4444" : l.level === "WARN" ? "#ffbb00" : "#00ff66";
      return `<div style="color: ${color};">[${timeStr}] [${l.level}]: ${l.message}</div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  } catch (error) {
    console.error(error);
  }
}

window.clearConsoleDisplay = function() {
  const box = document.getElementById("live-console-box");
  if (box) box.textContent = "Konsol ekranı temizlendi.";
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

let currentLiveMessages = [];
let currentLiveFilter = "all";
let liveAutoRefreshTimer = null;

function renderLiveMessages() {
  const box = document.getElementById("live-chat-stream-box");
  if (!box) return;

  const filtered = currentLiveMessages.filter((m) => {
    if (currentLiveFilter === "deleted") return m.isDeleted;
    if (currentLiveFilter === "edited") return m.isEdited && !m.isDeleted;
    return true;
  });

  if (filtered.length === 0) {
    box.innerHTML = '<p class="text-muted" style="padding: 8px;">Seçili filtreye uygun mesaj bulunamadı.</p>';
    return;
  }

  box.innerHTML = filtered.map((m) => {
    const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString("tr-TR") : "";
    const delTime = m.deletedAt ? new Date(m.deletedAt).toLocaleTimeString("tr-TR") : "";
    const editTime = m.editedAt ? new Date(m.editedAt).toLocaleTimeString("tr-TR") : "";

    if (m.isDeleted) {
      return `<div style="padding: 8px 10px; margin-bottom: 6px; border-left: 3px solid #ff4444; background: rgba(255, 68, 68, 0.08); border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #ff6b6b;">${escapeHtml(m.author)}</strong>
            <span class="badge badge-danger" style="font-size: 10px; margin-left: 6px; padding: 2px 6px;">SİLİNDİ</span>
            <span style="font-size: 11px; opacity: 0.6; margin-left: 4px;">(${time})</span>
          </div>
          ${delTime ? `<span style="font-size: 11px; color: #ff8888;">Silindi: ${delTime}</span>` : ""}
        </div>
        <div style="margin-top: 4px; color: #ff9999; text-decoration: line-through;">${escapeHtml(m.content || "[İçerik boş]")}</div>
      </div>`;
    }

    if (m.isEdited) {
      return `<div style="padding: 8px 10px; margin-bottom: 6px; border-left: 3px solid #ffaa00; background: rgba(255, 170, 0, 0.08); border-radius: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color: #ffbb33;">${escapeHtml(m.author)}</strong>
            <span class="badge badge-warning" style="font-size: 10px; margin-left: 6px; padding: 2px 6px;">DÜZENLENDİ</span>
            <span style="font-size: 11px; opacity: 0.6; margin-left: 4px;">(${time})</span>
          </div>
          ${editTime ? `<span style="font-size: 11px; color: #ffbb33;">Düzenlendi: ${editTime}</span>` : ""}
        </div>
        ${m.previousContent ? `<div style="font-size: 12px; color: #aaa; margin-top: 3px;"><s>Eski: ${escapeHtml(m.previousContent)}</s></div>` : ""}
        <div style="margin-top: 3px; color: #fff;"><span style="color: #ffcc00; font-size: 12px;">Yeni: </span>${escapeHtml(m.content || "[İçerik boş]")}</div>
      </div>`;
    }

    return `<div style="padding: 6px 10px; margin-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);">
      <strong style="color: var(--primary);">${escapeHtml(m.author)}</strong>
      <span style="font-size: 11px; opacity: 0.6; margin-left: 4px;">(${time})</span>:
      <span style="margin-left: 6px;">${escapeHtml(m.content || "")}</span>
    </div>`;
  }).join("");

  box.scrollTop = box.scrollHeight;
}

window.filterLiveMessages = function(filter) {
  currentLiveFilter = filter;
  const btnAll = document.getElementById("btn-msg-filter-all");
  const btnEdited = document.getElementById("btn-msg-filter-edited");
  const btnDeleted = document.getElementById("btn-msg-filter-deleted");
  if (btnAll) btnAll.style.borderColor = filter === "all" ? "var(--primary)" : "var(--border-color)";
  if (btnEdited) btnEdited.style.borderColor = filter === "edited" ? "#ffaa00" : "var(--border-color)";
  if (btnDeleted) btnDeleted.style.borderColor = filter === "deleted" ? "#ff4444" : "var(--border-color)";
  renderLiveMessages();
};

window.toggleLiveAutoRefresh = function(enabled) {
  if (liveAutoRefreshTimer) {
    clearInterval(liveAutoRefreshTimer);
    liveAutoRefreshTimer = null;
  }
  if (enabled) {
    loadChannelMessages(true);
    liveAutoRefreshTimer = setInterval(() => {
      loadChannelMessages(true);
    }, 3000);
  }
};

async function loadChannelMessages(silent = false) {
  const channelId = document.getElementById("live-channel-id")?.value.trim();
  if (!channelId) {
    if (!silent) showToast("Lütfen geçerli bir kanal ID girin.", "danger");
    return;
  }

  const box = document.getElementById("live-chat-stream-box");
  if (box && !silent && currentLiveMessages.length === 0) {
    box.innerHTML = '<p class="text-muted">Mesajlar alınıyor...</p>';
  }

  try {
    const res = await fetch(`/api/chat/messages/${channelId}`);
    const msgs = await res.json();
    if (!box) return;

    if (!Array.isArray(msgs) || msgs.length === 0) {
      if (!silent) {
        box.innerHTML = '<p class="text-muted">Bu kanalda mesaj bulunamadı veya bota yetki verilmedi.</p>';
      }
      return;
    }

    currentLiveMessages = msgs;
    renderLiveMessages();
  } catch (error) {
    if (!silent && box) {
      box.innerHTML = '<p class="text-muted">Mesajlar alınırken bağlantı hatası oluştu.</p>';
    }
  }
}

document.getElementById("form-live-send")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const channelId = document.getElementById("live-send-channel")?.value.trim();
  const message = document.getElementById("live-send-text")?.value.trim();

  if (!channelId || !message) return;

  try {
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, message })
    });
    if (res.ok) {
      document.getElementById("live-send-text").value = "";
      showToast("Mesaj kanala başarıyla iletildi.");
      const liveChInput = document.getElementById("live-channel-id");
      if (liveChInput && liveChInput.value.trim() === channelId) {
        loadChannelMessages();
      }
    } else {
      showToast("Mesaj iletilemedi (bot yetkisi veya kanal ID kontrol edin).", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası oluştu.", "danger");
  }
});

async function loadOverview() {
  try {
    const res = await fetch("/api/overview");
    const data = await res.json();

    const dbStatus = document.getElementById("overview-db-status");
    if (dbStatus) {
      if (data.databaseConnected) {
        dbStatus.textContent = "Bağlı";
        dbStatus.className = "status-pill status-pill-active";
      } else {
        dbStatus.textContent = "Bağlantı Bekleniyor";
        dbStatus.className = "status-pill status-pill-danger";
      }
    }

    const dbName = document.getElementById("overview-db-name");
    if (dbName) dbName.textContent = data.databaseName || "mongo:27017";

    const ram = document.getElementById("overview-ram");
    if (ram) ram.textContent = `${data.memoryUsageMb || 0} MB`;

    const penalties = document.getElementById("overview-penalties");
    if (penalties) penalties.textContent = data.stats?.activePenalties || 0;

    const voice = document.getElementById("overview-voice");
    if (voice) voice.textContent = `${data.stats?.voiceBotsActive || 0}/${data.stats?.voiceBotsTotal || 0}`;

    const specUptime = document.getElementById("spec-uptime");
    if (specUptime) {
      const mins = Math.floor((data.uptimeSeconds || 0) / 60);
      const hours = Math.floor(mins / 60);
      specUptime.textContent = `${hours} sa ${mins % 60} dk`;
    }

    const specNode = document.getElementById("spec-node");
    if (specNode) specNode.textContent = data.nodeVersion || "-";

    const specUsers = document.getElementById("spec-users");
    if (specUsers) specUsers.textContent = data.stats?.registeredUsers || 0;

    const specTracked = document.getElementById("spec-tracked");
    if (specTracked) specTracked.textContent = data.stats?.trackedMembers || 0;
  } catch (error) {
    console.error(error);
  }
}

async function loadConfig() {
  const guildInput = document.getElementById("cfg-guildId");
  if (guildInput) guildInput.value = currentGuildId;

  try {
    const res = await fetch(`/api/config/${currentGuildId}`);
    const cfg = await res.json();
    if (!cfg) return;

    if (cfg.guildId) guildInput.value = cfg.guildId;
    document.getElementById("cfg-prefix").value = cfg.prefix || ".";
    document.getElementById("cfg-tag").value = cfg.tag || "";

    if (cfg.roles) {
      document.getElementById("cfg-role-man").value = (cfg.roles.man || []).join(", ");
      document.getElementById("cfg-role-woman").value = (cfg.roles.woman || []).join(", ");
      document.getElementById("cfg-role-unreg").value = (cfg.roles.unregistered || []).join(", ");
      const tagRoleEl = document.getElementById("cfg-role-tagrole");
      const boosterEl = document.getElementById("cfg-role-booster");
      const vipEl = document.getElementById("cfg-role-vip");
      const warnEl = document.getElementById("cfg-role-warn");
      if (tagRoleEl) tagRoleEl.value = cfg.roles.tagRole || "";
      if (boosterEl) boosterEl.value = cfg.roles.booster || "";
      if (vipEl) vipEl.value = cfg.roles.vip || "";
      if (warnEl) warnEl.value = (cfg.roles.warnRoles || []).join(", ");
      document.getElementById("cfg-role-jail").value = cfg.roles.jail || "";
      document.getElementById("cfg-role-cmute").value = cfg.roles.chatMute || "";
      document.getElementById("cfg-role-vmute").value = cfg.roles.voiceMute || "";
      document.getElementById("cfg-role-staff").value = (cfg.roles.staffRoles || []).join(", ");
    }

    if (cfg.channels) {
      document.getElementById("cfg-ch-chat").value = cfg.channels.generalChat || "";
      document.getElementById("cfg-ch-reg").value = cfg.channels.registerChat || "";
      document.getElementById("cfg-ch-penaltylog").value = cfg.channels.penaltyLog || "";
      document.getElementById("cfg-ch-guardlog").value = cfg.channels.guardLog || "";
      const invLogEl = document.getElementById("cfg-ch-invitelog");
      const regLogEl = document.getElementById("cfg-ch-reglog");
      const voiceLogEl = document.getElementById("cfg-ch-voicelog");
      const msgLogEl = document.getElementById("cfg-ch-msglog");
      const welcomeVoiceEl = document.getElementById("cfg-ch-welcomevoice");
      const ticketCatEl = document.getElementById("cfg-ch-ticketcat");
      const cvCatEl = document.getElementById("cfg-ch-customvoicecat");
      const cvChEl = document.getElementById("cfg-ch-customvoicech");
      if (invLogEl) invLogEl.value = cfg.channels.inviteLog || "";
      if (regLogEl) regLogEl.value = cfg.channels.registerLog || "";
      if (voiceLogEl) voiceLogEl.value = cfg.channels.voiceLog || "";
      if (msgLogEl) msgLogEl.value = cfg.channels.messageLog || "";
      if (welcomeVoiceEl) welcomeVoiceEl.value = (cfg.channels.welcomeVoice || []).join(", ");
      if (ticketCatEl) ticketCatEl.value = cfg.channels.ticketCategory || "";
      if (cvCatEl) cvCatEl.value = cfg.channels.customVoiceCategory || "";
      if (cvChEl) cvChEl.value = cfg.channels.customVoiceChannel || "";
    }

    if (cfg.databaseProvider) {
      const provEl = document.getElementById("cfg-db-provider");
      const uriEl = document.getElementById("cfg-db-uri");
      if (provEl) provEl.value = cfg.databaseProvider.provider || "POSTGRESQL";
      if (uriEl) uriEl.value = cfg.databaseProvider.connectionUri || "";
    }
    fetch("/api/database/status")
      .then((r) => r.json())
      .then((st) => {
        const badge = document.getElementById("db-active-badge");
        if (badge) {
          badge.textContent = `Aktif: ${st.provider || "MONGODB"} (${st.connected ? "Bağlı" : "Bağlantı Yok"})`;
          badge.className = `badge ${st.connected ? "badge-success" : "badge-danger"}`;
        }
      })
      .catch(() => {});

    if (cfg.penaltyThresholds) {
      const muteEl = document.getElementById("cfg-thresh-mute");
      const jailEl = document.getElementById("cfg-thresh-jail");
      const banEl = document.getElementById("cfg-thresh-ban");
      if (muteEl) muteEl.value = cfg.penaltyThresholds.mute ?? 40;
      if (jailEl) jailEl.value = cfg.penaltyThresholds.jail ?? 80;
      if (banEl) banEl.value = cfg.penaltyThresholds.ban ?? 150;
    }

    if (cfg.leveling) {
      const lvlEn = document.getElementById("cfg-leveling-enabled");
      const lvlMsg = document.getElementById("cfg-leveling-msgxp");
      const lvlVoice = document.getElementById("cfg-leveling-voicexp");
      const lvlRewards = document.getElementById("cfg-level-rewards");
      if (lvlEn) lvlEn.checked = cfg.leveling.enabled !== false;
      if (lvlMsg) lvlMsg.value = cfg.leveling.messageXp ?? 15;
      if (lvlVoice) lvlVoice.value = cfg.leveling.voiceXpPerMinute ?? 20;
      if (lvlRewards && Array.isArray(cfg.leveling.roleRewards)) {
        lvlRewards.value = cfg.leveling.roleRewards.map((r) => `${r.level}:${r.roleId}`).join(", ");
      }
    }

    if (cfg.filters) {
      const linkEl = document.getElementById("cfg-filter-link");
      const capsEl = document.getElementById("cfg-filter-caps");
      const spamEl = document.getElementById("cfg-filter-spam");
      const wordsEl = document.getElementById("cfg-filter-words");
      if (linkEl) linkEl.checked = cfg.filters.linkFilter !== false;
      if (capsEl) capsEl.checked = cfg.filters.capsFilter !== false;
      if (spamEl) spamEl.checked = cfg.filters.spamFilter !== false;
      if (wordsEl) wordsEl.value = (cfg.filters.customWords || []).join(", ");
    }

    if (cfg.guardPanic) {
      const panicEn = document.getElementById("cfg-panic-enabled");
      const panicThresh = document.getElementById("cfg-panic-threshold");
      const panicWin = document.getElementById("cfg-panic-window");
      if (panicEn) panicEn.checked = cfg.guardPanic.enabled !== false;
      if (panicThresh) panicThresh.value = cfg.guardPanic.threshold ?? 5;
      if (panicWin) panicWin.value = cfg.guardPanic.timeWindowMs ?? 5000;
    }
  } catch (error) {
    console.error(error);
  }
}

document.getElementById("btn-load-guild")?.addEventListener("click", () => {
  const entered = document.getElementById("cfg-guildId").value.trim();
  if (entered) {
    currentGuildId = entered;
    localStorage.setItem("dash_guildId", entered);
    loadConfig();
    showToast(`Sunucu yapılandırması getirildi: ${entered}`);
  }
});

document.getElementById("form-config")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const guildId = document.getElementById("cfg-guildId")?.value.trim() || currentGuildId;
  const dbProvider = document.getElementById("cfg-db-provider")?.value || "MONGODB";
  const dbUri = document.getElementById("cfg-db-uri")?.value.trim() || "";

  const payload = {
    guildId,
    prefix: document.getElementById("cfg-prefix").value.trim() || ".",
    tag: document.getElementById("cfg-tag").value.trim(),
    roles: {
      man: document.getElementById("cfg-role-man").value.split(",").map((s) => s.trim()).filter(Boolean),
      woman: document.getElementById("cfg-role-woman").value.split(",").map((s) => s.trim()).filter(Boolean),
      unregistered: document.getElementById("cfg-role-unreg").value.split(",").map((s) => s.trim()).filter(Boolean),
      tagRole: document.getElementById("cfg-role-tagrole")?.value.trim() || "",
      booster: document.getElementById("cfg-role-booster")?.value.trim() || "",
      vip: document.getElementById("cfg-role-vip")?.value.trim() || "",
      warnRoles: (document.getElementById("cfg-role-warn")?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
      jail: document.getElementById("cfg-role-jail").value.trim(),
      chatMute: document.getElementById("cfg-role-cmute").value.trim(),
      voiceMute: document.getElementById("cfg-role-vmute").value.trim(),
      staffRoles: document.getElementById("cfg-role-staff").value.split(",").map((s) => s.trim()).filter(Boolean)
    },
    channels: {
      generalChat: document.getElementById("cfg-ch-chat").value.trim(),
      registerChat: document.getElementById("cfg-ch-reg").value.trim(),
      penaltyLog: document.getElementById("cfg-ch-penaltylog").value.trim(),
      guardLog: document.getElementById("cfg-ch-guardlog").value.trim(),
      inviteLog: document.getElementById("cfg-ch-invitelog")?.value.trim() || "",
      registerLog: document.getElementById("cfg-ch-reglog")?.value.trim() || "",
      voiceLog: document.getElementById("cfg-ch-voicelog")?.value.trim() || "",
      messageLog: document.getElementById("cfg-ch-msglog")?.value.trim() || "",
      welcomeVoice: (document.getElementById("cfg-ch-welcomevoice")?.value || "").split(",").map((s) => s.trim()).filter(Boolean),
      ticketCategory: document.getElementById("cfg-ch-ticketcat")?.value.trim() || "",
      customVoiceCategory: document.getElementById("cfg-ch-customvoicecat")?.value.trim() || "",
      customVoiceChannel: document.getElementById("cfg-ch-customvoicech")?.value.trim() || ""
    },
    databaseProvider: {
      provider: dbProvider,
      connectionUri: dbUri
    },
    penaltyThresholds: {
      mute: Number(document.getElementById("cfg-thresh-mute")?.value) || 40,
      jail: Number(document.getElementById("cfg-thresh-jail")?.value) || 80,
      ban: Number(document.getElementById("cfg-thresh-ban")?.value) || 150
    },
    leveling: {
      enabled: document.getElementById("cfg-leveling-enabled")?.checked ?? true,
      messageXp: Number(document.getElementById("cfg-leveling-msgxp")?.value) || 15,
      voiceXpPerMinute: Number(document.getElementById("cfg-leveling-voicexp")?.value) || 20,
      roleRewards: (document.getElementById("cfg-level-rewards")?.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((item) => {
          const parts = item.split(":");
          return { level: Number(parts[0]), roleId: (parts[1] || "").trim() };
        })
        .filter((item) => !isNaN(item.level) && item.roleId)
    },
    filters: {
      linkFilter: document.getElementById("cfg-filter-link")?.checked ?? true,
      capsFilter: document.getElementById("cfg-filter-caps")?.checked ?? true,
      spamFilter: document.getElementById("cfg-filter-spam")?.checked ?? true,
      customWords: (document.getElementById("cfg-filter-words")?.value || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    },
    guardPanic: {
      enabled: document.getElementById("cfg-panic-enabled")?.checked ?? true,
      threshold: Number(document.getElementById("cfg-panic-threshold")?.value) || 5,
      timeWindowMs: Number(document.getElementById("cfg-panic-window")?.value) || 5000
    }
  };

  try {
    const res = await fetch(`/api/config/${guildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast("Ayarlar başarıyla veritabanına kaydedildi.");
    } else {
      showToast("Ayar kaydedilirken sunucu hatası oluştu.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası oluştu.", "danger");
  }
});

let loadedCommandsConfig = {};
let activeCmdFilter = "all";
let cmdSearchQuery = "";

function renderCommandsTable() {
  const tbody = document.getElementById("commands-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const filtered = commandsCatalog.filter((cmd) => {
    const matchCat = activeCmdFilter === "all" || cmd.cat === activeCmdFilter;
    const matchSearch = !cmdSearchQuery || cmd.name.toLowerCase().includes(cmdSearchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-muted">Aramanıza uygun komut bulunamadı.</td></tr>';
    return;
  }

  filtered.forEach((cmd) => {
    const saved = loadedCommandsConfig[cmd.name] || {};
    const alias = saved.customName || cmd.name;
    const customAliases = Array.isArray(saved.customAliases) ? saved.customAliases.join(", ") : (saved.customAliases || "");
    const mode = saved.mode || "BOTH";
    const isEnabled = mode !== "DISABLED";

    const tr = document.createElement("tr");
    tr.setAttribute("data-cmd", cmd.name);
    tr.innerHTML = `
      <td><code>${cmd.name}</code></td>
      <td><span class="status-pill status-pill-active">${cmd.catTitle}</span></td>
      <td><input type="text" class="table-input" value="${alias}" data-field="alias" placeholder="${cmd.name}"></td>
      <td><input type="text" class="table-input" value="${customAliases}" data-field="customAliases" placeholder="örn: y, banla, sutla"></td>
      <td>
        <select class="table-select" data-field="mode" onchange="updateCommandStatus(this)">
          <option value="BOTH" ${mode === "BOTH" ? "selected" : ""}>Hem Prefix Hem Slash</option>
          <option value="SLASH" ${mode === "SLASH" ? "selected" : ""}>Yalnızca Slash (/)</option>
          <option value="PREFIX" ${mode === "PREFIX" ? "selected" : ""}>Yalnızca Prefix (.)</option>
          <option value="DISABLED" ${mode === "DISABLED" ? "selected" : ""}>Devre Dışı</option>
        </select>
      </td>
      <td><span class="status-pill ${isEnabled ? "status-pill-active" : "status-pill-danger"}">${isEnabled ? "Aktif" : "Kapalı"}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

window.updateCommandStatus = function(selectEl) {
  const row = selectEl.closest("tr");
  const statusSpan = row?.querySelector("td:last-child span");
  if (statusSpan) {
    const isEnabled = selectEl.value !== "DISABLED";
    statusSpan.className = `status-pill ${isEnabled ? "status-pill-active" : "status-pill-danger"}`;
    statusSpan.textContent = isEnabled ? "Aktif" : "Kapalı";
  }
};

async function loadCommands() {
  try {
    const res = await fetch(`/api/config/${currentGuildId}`);
    const cfg = await res.json();
    if (cfg && cfg.commands) {
      loadedCommandsConfig = cfg.commands;
    }
    renderCommandsTable();
  } catch (error) {
    console.error(error);
  }
}

document.querySelectorAll(".filter-pill[data-cmd-cat]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill[data-cmd-cat]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeCmdFilter = btn.getAttribute("data-cmd-cat") || "all";
    renderCommandsTable();
  });
});

document.getElementById("cmd-search-input")?.addEventListener("input", (e) => {
  cmdSearchQuery = e.target.value.trim();
  renderCommandsTable();
});

document.getElementById("btn-save-commands")?.addEventListener("click", async () => {
  document.querySelectorAll("#commands-tbody tr").forEach((row) => {
    const cmdName = row.getAttribute("data-cmd");
    if (!cmdName) return;
    const customName = row.querySelector('[data-field="alias"]')?.value.trim() || cmdName;
    const aliasesRaw = row.querySelector('[data-field="customAliases"]')?.value || "";
    const customAliases = aliasesRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const mode = row.querySelector('[data-field="mode"]')?.value || "BOTH";
    loadedCommandsConfig[cmdName] = {
      enabled: mode !== "DISABLED",
      customName,
      customAliases,
      mode
    };
  });

  try {
    const res = await fetch(`/api/config/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: loadedCommandsConfig })
    });
    if (res.ok) {
      showToast("Tüm komut ayarları başarıyla kaydedildi.");
    } else {
      showToast("Komut ayarları kaydedilemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası oluştu.", "danger");
  }
});

let currentFilter = "all";

document.querySelectorAll(".filter-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".filter-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    currentFilter = pill.getAttribute("data-filter") || "all";
    renderMessageCards();
  });
});

let loadedMessagesConfig = {};

async function loadMessages() {
  try {
    const res = await fetch(`/api/config/${currentGuildId}`);
    const cfg = await res.json();
    loadedMessagesConfig = cfg?.messages || {};
    renderMessageCards();
  } catch (error) {
    console.error(error);
  }
}

function renderMessageCards() {
  const container = document.getElementById("messages-container");
  if (!container) return;

  const filtered = currentFilter === "all" ? messageCatalog : messageCatalog.filter((m) => m.cat === currentFilter);
  container.innerHTML = "";

  filtered.forEach((tpl) => {
    const saved = loadedMessagesConfig[tpl.key] || {};
    const format = saved.format || "COMPONENTS_V2";
    const content = saved.content !== undefined ? saved.content : tpl.default;

    const card = document.createElement("div");
    card.className = "card mb-3";
    card.setAttribute("data-msg-key", tpl.key);

    card.innerHTML = `
      <div class="msg-card-header">
        <h3>${tpl.title}</h3>
        <span class="msg-badge">${tpl.key}</span>
      </div>
      <div class="form-grid-2">
        <div class="form-group">
          <label>Görünüm Biçimi</label>
          <select id="msg-${tpl.key}-format" class="select-styled msg-format-input">
            <option value="COMPONENTS_V2" ${format === "COMPONENTS_V2" ? "selected" : ""}>Components V2 (Kenar Çubuğu Yok - Modern)</option>
            <option value="EMBED" ${format === "EMBED" ? "selected" : ""}>Klasik Embed</option>
            <option value="PLAIN" ${format === "PLAIN" ? "selected" : ""}>Düz Metin (Plain)</option>
          </select>
        </div>
        <div class="form-group">
          <label>Mesaj İçeriği</label>
          <input type="text" id="msg-${tpl.key}-content" class="msg-content-input" value="${content.replace(/"/g, '&quot;')}">
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

document.getElementById("form-messages")?.addEventListener("submit", async (e) => {
  e.preventDefault();

  document.querySelectorAll("[data-msg-key]").forEach((card) => {
    const key = card.getAttribute("data-msg-key");
    const formatEl = card.querySelector(".msg-format-input");
    const contentEl = card.querySelector(".msg-content-input");

    if (key && formatEl && contentEl) {
      loadedMessagesConfig[key] = {
        format: formatEl.value,
        content: contentEl.value.trim()
      };
    }
  });

  try {
    const res = await fetch(`/api/config/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: loadedMessagesConfig })
    });
    if (res.ok) {
      showToast("Tüm mesaj şablonları başarıyla veritabanına kaydedildi.");
    } else {
      showToast("Şablonlar kaydedilemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası oluştu.", "danger");
  }
});

async function loadVoiceBots() {
  try {
    const res = await fetch("/api/voice-bots");
    const bots = await res.json();
    const tbody = document.getElementById("voice-bots-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(bots) || bots.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-muted">Kayıtlı ses karşılama botu bulunmuyor.</td></tr>';
      return;
    }

    bots.forEach((bot) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${bot.name}</strong></td>
        <td><code>${bot.channelId || "Otomatik"}</code></td>
        <td><span class="status-pill ${bot.status === "CONNECTED" || bot.status === "ACTIVE" ? "status-pill-active" : "status-pill-danger"}">${bot.status}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="removeVoiceBot('${bot._id}')">Kaldır</button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
  }
}

document.getElementById("form-voice-add")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = document.getElementById("vb-token").value.trim();
  const name = document.getElementById("vb-name").value.trim();
  const channelId = document.getElementById("vb-channel").value.trim();

  try {
    const res = await fetch("/api/voice-bots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, name, channelId })
    });
    if (res.ok) {
      document.getElementById("form-voice-add").reset();
      loadVoiceBots();
      showToast("Yeni ses karşılama botu başarıyla sisteme eklendi.");
    } else {
      showToast("Bot eklenemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası oluştu.", "danger");
  }
});

window.removeVoiceBot = async function(id) {
  try {
    const res = await fetch(`/api/voice-bots/${id}`, { method: "DELETE" });
    if (res.ok) {
      loadVoiceBots();
      showToast("Ses karşılama botu sistemden çıkarıldı.");
    }
  } catch (error) {
    showToast("Silme işlemi başarısız.", "danger");
  }
};

async function loadPenalties() {
  try {
    const res = await fetch("/api/penalties");
    const list = await res.json();
    const tbody = document.getElementById("penalties-tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-muted">Veritabanında aktif ceza kaydı bulunmuyor.</td></tr>';
      return;
    }

    list.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${p.caseId}</td>
        <td><code>${p.userId}</code></td>
        <td><strong>${p.type}</strong></td>
        <td>${p.reason}</td>
        <td>${p.points}</td>
        <td><span class="status-pill ${p.active ? "status-pill-danger" : "status-pill-active"}">${p.active ? "Aktif" : "Sonlandı"}</span></td>
        <td>${p.active ? `<button class="btn btn-danger btn-sm" onclick="liftPenalty(${p.caseId})">Afi Uygula</button>` : "-"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error(error);
  }
}

window.liftPenalty = async function(caseId) {
  try {
    const res = await fetch("/api/penalties/lift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseId })
    });
    if (res.ok) {
      loadPenalties();
      showToast(`Ceza #${caseId} başarıyla kaldırıldı.`);
    }
  } catch (error) {
    showToast("Ceza kaldırılamadı.", "danger");
  }
};

async function loadGuard() {
  try {
    const res = await fetch(`/api/config/${currentGuildId}`);
    const cfg = await res.json();
    if (!cfg || !cfg.guard) return;

    document.getElementById("guard-safe-users").value = (cfg.guard.safeUsers || []).join(", ");
    document.getElementById("guard-safe-roles").value = (cfg.guard.safeRoles || []).join(", ");
    document.getElementById("guard-safe-bots").value = (cfg.guard.safeBots || []).join(", ");

    const fbRes = await fetch("/api/forcebans").catch(() => null);
    if (fbRes && fbRes.ok) {
      const fbList = await fbRes.json();
      const fbTbody = document.getElementById("forcebans-tbody");
      if (fbTbody) {
        fbTbody.innerHTML = "";
        if (!Array.isArray(fbList) || fbList.length === 0) {
          fbTbody.innerHTML = '<tr><td colspan="4" class="text-muted">Aktif karaliste kaydı bulunmuyor.</td></tr>';
        } else {
          fbList.forEach((fb) => {
            const tr = document.createElement("tr");
            const dateStr = fb.createdAt ? new Date(fb.createdAt).toLocaleDateString("tr-TR") : "-";
            tr.innerHTML = `
              <td><code>${fb.userId}</code></td>
              <td>${fb.reason || "-"}</td>
              <td>${dateStr}</td>
              <td><button class="btn btn-secondary btn-sm" onclick="liftForceBan('${fb.userId}')">Engeli Kaldır</button></td>
            `;
            fbTbody.appendChild(tr);
          });
        }
      }
    }
  } catch (error) {
    console.error(error);
  }
}

window.liftForceBan = async function(userId) {
  try {
    const res = await fetch("/api/forcebans/lift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    if (res.ok) {
      loadGuard();
      showToast(`Kullanıcı (${userId}) karalisteden çıkarıldı.`);
    } else {
      showToast("İşlem başarısız.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

document.getElementById("btn-save-guard")?.addEventListener("click", async () => {
  const safeUsers = document.getElementById("guard-safe-users").value.split(",").map((s) => s.trim()).filter(Boolean);
  const safeRoles = document.getElementById("guard-safe-roles").value.split(",").map((s) => s.trim()).filter(Boolean);
  const safeBots = document.getElementById("guard-safe-bots").value.split(",").map((s) => s.trim()).filter(Boolean);

  try {
    const res = await fetch(`/api/config/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guard: {
          active: true,
          safeUsers,
          safeRoles,
          safeBots,
          blockWebhooks: true,
          blockBots: true
        }
      })
    });
    if (res.ok) {
      showToast("Güvenlik listesi veritabanına kaydedildi.");
    } else {
      showToast("Kaydetme hatası oluştu.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
});

async function loadBotCredentials() {
  try {
    const res = await fetch("/api/bot-credentials");
    const list = await res.json();
    const container = document.getElementById("bot-credentials-list");
    if (!container) return;
    container.innerHTML = "";

    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = '<div class="card"><p class="text-muted">Kayıtlı bot servisi bulunamadı.</p></div>';
      return;
    }

    list.forEach((bot) => {
      const card = document.createElement("div");
      card.className = "card mb-3";
      card.innerHTML = `
        <div class="card-header-flex">
          <div>
            <h3>${bot.name} <code class="text-dim">(${bot.serviceKey})</code></h3>
          </div>
          <span class="status-pill ${bot.enabled ? "status-pill-active" : "status-pill-danger"}">${bot.enabled ? "Aktif" : "Devre Dışı"}</span>
        </div>
        <div class="form-grid-2 mt-3">
          <div class="form-group">
            <label>Bot Görünen / Discord İsmi</label>
            <input type="text" id="bc-name-${bot.serviceKey}" value="${bot.name || ""}" placeholder="Örn: BFE Moderasyon">
          </div>
          <div class="form-group">
            <label>Client ID (Uygulama ID)</label>
            <input type="text" id="bc-client-${bot.serviceKey}" value="${bot.clientId || ""}" placeholder="Client ID">
          </div>
          <div class="form-group">
            <label>Bot Token</label>
            <input type="password" id="bc-token-${bot.serviceKey}" value="${bot.token || ""}" placeholder="Discord Bot Token">
          </div>
          <div class="form-group">
            <label>Durum Tipi (Activity Type)</label>
            <select id="bc-acttype-${bot.serviceKey}" class="select-styled">
              <option value="PLAYING" ${bot.activityType === "PLAYING" ? "selected" : ""}>Oynuyor (Playing)</option>
              <option value="WATCHING" ${bot.activityType === "WATCHING" ? "selected" : ""}>İzliyor (Watching)</option>
              <option value="LISTENING" ${bot.activityType === "LISTENING" ? "selected" : ""}>Dinliyor (Listening)</option>
              <option value="STREAMING" ${bot.activityType === "STREAMING" ? "selected" : ""}>Yayında (Streaming)</option>
            </select>
          </div>
          <div class="form-group" style="grid-column: span 2;">
            <label>Durum Metni (Presence Text)</label>
            <input type="text" id="bc-acttext-${bot.serviceKey}" value="${bot.activityText || "Public Bot Ecosystem"}" placeholder="Örn: Public Bot Ecosystem">
          </div>
        </div>
        <div class="form-actions mt-3" style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" onclick="saveBotCredential('${bot.serviceKey}')">Bot Bilgilerini Kaydet</button>
          <button class="btn btn-secondary btn-sm" onclick="changeBotDiscordName('${bot.serviceKey}')">🤖 Discord İsmini Güncelle</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
  }
}

window.saveBotCredential = async function(serviceKey) {
  const name = document.getElementById(`bc-name-${serviceKey}`)?.value.trim() || "";
  const clientId = document.getElementById(`bc-client-${serviceKey}`)?.value.trim() || "";
  const token = document.getElementById(`bc-token-${serviceKey}`)?.value.trim() || "";
  const activityType = document.getElementById(`bc-acttype-${serviceKey}`)?.value || "PLAYING";
  const activityText = document.getElementById(`bc-acttext-${serviceKey}`)?.value.trim() || "";

  try {
    const res = await fetch("/api/bot-credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceKey,
        name,
        clientId,
        token,
        activityType,
        activityText,
        status: "ONLINE",
        enabled: true,
        guildId: currentGuildId || ""
      })
    });
    if (res.ok) {
      const data = await res.json();
      let msg = `${name || serviceKey} ayarları başarıyla kaydedildi.`;
      if (data.nameSync?.message) {
        msg += ` (${data.nameSync.message})`;
      }
      showToast(msg);
      loadBotCredentials();
    } else {
      showToast("Bot ayarları kaydedilemedi.", "danger");
    }
  } catch (error) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.changeBotDiscordName = async function(serviceKey) {
  const newName = document.getElementById(`bc-name-${serviceKey}`)?.value.trim() || "";
  if (!newName) {
    showToast("Lütfen geçerli bir bot ismi girin.", "warning");
    return;
  }

  showToast(`${serviceKey} botunun Discord ismi güncelleniyor...`);
  try {
    const res = await fetch("/api/bot-credentials/update-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceKey,
        newName,
        guildId: currentGuildId || ""
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || "Bot ismi başarıyla güncellendi!");
      loadBotCredentials();
    } else {
      showToast(data.error || "İsim güncellenemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.fetchLiveMetrics = async function() {
  try {
    const res = await fetch("/api/metrics");
    const data = await res.json();
    if (!data) return;

    const rssEl = document.getElementById("metric-ram-rss");
    const heapEl = document.getElementById("metric-ram-heap");
    const pingEl = document.getElementById("metric-ping");
    const uptimeEl = document.getElementById("metric-uptime");
    const nodeEl = document.getElementById("metric-node");
    const voiceEl = document.getElementById("metric-voice-active");

    if (rssEl) rssEl.innerText = `${data.memoryRssMb} MB`;
    if (heapEl) heapEl.innerText = `${data.memoryHeapMb} MB`;
    if (pingEl) pingEl.innerText = `${data.pingMs} ms`;
    if (uptimeEl) {
      const hrs = Math.floor(data.uptimeSeconds / 3600);
      const mins = Math.floor((data.uptimeSeconds % 3600) / 60);
      uptimeEl.innerText = `${hrs}s ${mins}d`;
    }
    if (nodeEl) nodeEl.innerText = data.nodeVersion;
    if (voiceEl) voiceEl.innerText = `${data.activeVoiceBots} Aktif`;
  } catch (error) {
    console.error(error);
  }
};

window.toggleDashboardTheme = function() {
  const isAmoled = document.body.classList.toggle("theme-amoled");
  localStorage.setItem("dashboard_theme", isAmoled ? "amoled" : "default");
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.innerText = isAmoled ? "☀️ Standart Koyu" : "🌙 AMOLED Siyah";
};

window.toggleDashboardLang = function() {
  const currentLang = localStorage.getItem("dashboard_lang") || "TR";
  const newLang = currentLang === "TR" ? "EN" : "TR";
  localStorage.setItem("dashboard_lang", newLang);
  const btn = document.getElementById("lang-toggle");
  if (btn) btn.innerText = `🌐 Dil: ${newLang}`;
  showToast(newLang === "TR" ? "Dil Türkçe olarak ayarlandı." : "Language set to English.");
};

window.exportGuildConfig = async function() {
  try {
    window.location.href = `/api/config/export/${currentGuildId}`;
    showToast("Yapılandırma JSON dosyası indiriliyor...");
  } catch (error) {
    showToast("Dışa aktarma başarısız oldu.", "danger");
  }
};

window.importGuildConfig = async function(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const res = await fetch(`/api/config/import/${currentGuildId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed)
    });

    if (res.ok) {
      showToast("Yapılandırma başarıyla içe aktarıldı ve güncellendi.");
      loadConfig();
    } else {
      showToast("İçe aktarma hatası oluştu.", "danger");
    }
  } catch (err) {
    showToast("Geçersiz JSON dosyası.", "danger");
  }
};

const savedTheme = localStorage.getItem("dashboard_theme");
if (savedTheme === "amoled") {
  document.body.classList.add("theme-amoled");
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.innerText = "☀️ Standart Koyu";
}

setInterval(() => {
  const activeTab = document.querySelector(".nav-btn.active")?.getAttribute("data-tab");
  if (activeTab === "tab-metrics") {
    fetchLiveMetrics();
  }
}, 3000);

const btnDbTest = document.getElementById("btn-db-test");
if (btnDbTest) {
  btnDbTest.addEventListener("click", async () => {
    const provider = document.getElementById("cfg-db-provider")?.value || "MONGODB";
    const uri = document.getElementById("cfg-db-uri")?.value?.trim();
    const feedback = document.getElementById("db-feedback-box");

    if (!uri) {
      showToast("Lütfen bağlantı adresi (URI) girin.", "warn");
      return;
    }

    btnDbTest.disabled = true;
    btnDbTest.textContent = "Bağlanıyor...";
    if (feedback) feedback.style.display = "none";

    try {
      const res = await fetch("/api/database/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, uri })
      });
      const data = await res.json();
      btnDbTest.disabled = false;
      btnDbTest.textContent = "🔌 Bağlantıyı Test Et";

      if (data.success) {
        showToast(`Bağlantı başarılı! (${data.latencyMs}ms)`, "success");
        if (feedback) {
          feedback.className = "alert-box alert-success mt-3";
          feedback.style.display = "block";
          feedback.innerHTML = `<strong>Bağlantı Başarılı:</strong> ${data.version || provider} motoruna erişim sağlandı. Gecikme: ${data.latencyMs}ms`;
        }
      } else {
        showToast("Bağlantı başarısız oldu.", "danger");
        if (feedback) {
          feedback.className = "alert-box alert-danger mt-3";
          feedback.style.display = "block";
          feedback.innerHTML = `<strong>Bağlantı Hatası:</strong> ${data.error || "Sunucuya bağlanılamadı"}`;
        }
      }
    } catch (err) {
      btnDbTest.disabled = false;
      btnDbTest.textContent = "🔌 Bağlantıyı Test Et";
      showToast("İstek hatası: " + err.message, "danger");
    }
  });
}

const btnDbSwitch = document.getElementById("btn-db-switch");
if (btnDbSwitch) {
  btnDbSwitch.addEventListener("click", async () => {
    const provider = document.getElementById("cfg-db-provider")?.value || "MONGODB";
    const uri = document.getElementById("cfg-db-uri")?.value?.trim();
    const migrateData = Boolean(document.getElementById("cfg-db-migrate")?.checked);
    const feedback = document.getElementById("db-feedback-box");

    if (!uri) {
      showToast("Lütfen bağlantı adresi (URI) girin.", "warn");
      return;
    }

    const confirmMsg = `${provider} motoruna geçiş yapmak üzeresiniz. ${migrateData ? "Mevcut veriler otomatik aktarılacak." : "Veriler aktarılmayacak."} Onaylıyor musunuz?`;
    if (!confirm(confirmMsg)) return;

    btnDbSwitch.disabled = true;
    btnDbSwitch.textContent = "Geçiş Yapılıyor...";
    if (feedback) {
      feedback.className = "alert-box alert-info mt-3";
      feedback.style.display = "block";
      feedback.innerHTML = "<strong>İşlem Sürüyor:</strong> Veritabanı motoru değiştiriliyor ve tablolar hazırlanıyor...";
    }

    try {
      const res = await fetch("/api/database/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, uri, migrateData })
      });
      const data = await res.json();
      btnDbSwitch.disabled = false;
      btnDbSwitch.textContent = "⚡ Tek Tıkla Geçiş Yap";

      if (data.success) {
        showToast("Veritabanı geçişi başarıyla tamamlandı!", "success");
        const badge = document.getElementById("db-active-badge");
        if (badge) {
          badge.textContent = `Aktif: ${data.provider} (Bağlı)`;
          badge.className = "badge badge-success";
        }
        if (feedback) {
          feedback.className = "alert-box alert-success mt-3";
          const migInfo = data.migration ? `<br>Aktarılan Toplam Kayıt: <strong>${data.migration.totalRecords || 0}</strong>` : "";
          feedback.innerHTML = `<strong>Tebrikler!</strong> Aktif veritabanı <strong>${data.provider}</strong> olarak güncellendi.${migInfo}`;
        }
        loadOverview();
      } else {
        showToast("Geçiş başarısız: " + (data.error || "Bilinmeyen hata"), "danger");
        if (feedback) {
          feedback.className = "alert-box alert-danger mt-3";
          feedback.innerHTML = `<strong>Geçiş Başarısız:</strong> ${data.error || "İşlem tamamlanamadı."}`;
        }
      }
    } catch (err) {
      btnDbSwitch.disabled = false;
      btnDbSwitch.textContent = "⚡ Tek Tıkla Geçiş Yap";
      showToast("İstek hatası: " + err.message, "danger");
    }
  });
}

window.loadGitStatus = async function() {
  try {
    const res = await fetch("/api/system/git-status");
    const data = await res.json();
    if (data.success) {
      const branchEl = document.getElementById("git-branch");
      const commitEl = document.getElementById("git-commit");
      const behindEl = document.getElementById("git-behind");
      const localEl = document.getElementById("git-local-changes");

      if (branchEl) branchEl.innerText = data.branch;
      if (commitEl) commitEl.innerText = `${data.shortHash} : ${data.commitMessage}`;
      if (behindEl) {
        behindEl.innerText = data.commitsBehind > 0 ? `${data.commitsBehind} commit geride (Yeni güncelleme mevcut)` : "Güncel (0 commit)";
        behindEl.style.color = data.commitsBehind > 0 ? "var(--warning)" : "var(--success)";
      }
      if (localEl) {
        localEl.innerText = data.hasLocalChanges ? `${data.uncommittedCount} dosya değiştirildi (Güvenle korunacak)` : "Temiz";
      }
    }
  } catch (err) {
    console.error(err);
  }
};

window.triggerGitUpdate = async function() {
  const confirmed = confirm("GitHub üzerinden en güncel kodlar çekilecek.\n\nİşlem öncesinde tüm projenin tam bir yedeği alınacak, .env ve veritabanı ayarlarınız korunacaktır.\n\nDevam etmek istiyor musunuz?");
  if (!confirmed) return;

  const btn = document.getElementById("btn-git-update");
  const logBox = document.getElementById("git-update-logs");
  if (btn) btn.disabled = true;
  if (logBox) logBox.innerHTML = "⏳ Güncelleme işlemi başlatıldı, lütfen bekleyin...\n";

  try {
    const res = await fetch("/api/system/git-update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch: "main" })
    });
    const data = await res.json();

    if (data.logs && Array.isArray(data.logs)) {
      logBox.innerHTML = data.logs.map((l) => {
        const icon = l.status === "success" ? "✅" : (l.status === "warn" ? "⚠️" : (l.status === "error" ? "❌" : "ℹ️"));
        return `[${l.time.split("T")[1].slice(0, 8)}] ${icon} ${l.message}`;
      }).join("\n");
    }

    if (data.success) {
      showToast("GitHub güncellemesi ve bağımlılık kurulumu başarıyla tamamlandı!");
      loadGitStatus();
      loadSystemBackups();
    } else {
      showToast(data.error || "Güncelleme sırasında hata oluştu.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası oluştu.", "danger");
  } finally {
    if (btn) btn.disabled = false;
  }
};

window.loadSystemBackups = async function() {
  try {
    const res = await fetch("/api/system/backups");
    const list = await res.json();
    const tbody = document.getElementById("system-backups-tbody");
    if (!tbody) return;

    if (!Array.isArray(list) || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Henüz sistem yedeği bulunmuyor.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((b) => `
      <tr>
        <td><strong>${b.backupName}</strong></td>
        <td>${b.createdAt ? new Date(b.createdAt).toLocaleString("tr-TR") : "-"}</td>
        <td>${b.fileCount || 0} dosya</td>
        <td><code>${b.commitHash ? b.commitHash.slice(0, 7) : "-"}</code></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="restoreSystemBackup('${b.backupName}')">↩️ Geri Yükle</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error(err);
  }
};

window.restoreSystemBackup = async function(backupName) {
  const confirmed = confirm(`"${backupName}" yedeğine geri dönülecek.\n\nProje dosyaları bu anlık görüntünün durumuna geri yüklenecektir.\n\nDevam etmek istiyor musunuz?`);
  if (!confirmed) return;

  showToast(`"${backupName}" yedeği geri yükleniyor...`);
  try {
    const res = await fetch("/api/system/restore-backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupName })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || "Yedek başarıyla geri yüklendi!");
      loadGitStatus();
      loadSystemBackups();
    } else {
      showToast(data.error || "Geri yükleme başarısız.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.loadBotOwners = async function() {
  const targetGuild = currentGuildId || "default";
  try {
    const res = await fetch(`/api/system/bot-owners/${targetGuild}`);
    const data = await res.json();
    const input = document.getElementById("bot-owners-input");
    if (input && Array.isArray(data.botOwners)) {
      input.value = data.botOwners.join(", ");
    }
  } catch (err) {
    console.error(err);
  }
};

window.saveBotOwnersList = async function() {
  const targetGuild = currentGuildId || "default";
  const input = document.getElementById("bot-owners-input");
  const raw = input?.value || "";
  const botOwners = raw.split(",").map((id) => id.trim()).filter(Boolean);

  try {
    const res = await fetch(`/api/system/bot-owners/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botOwners })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(`Bot sahipleri başarıyla kaydedildi (${botOwners.length} kullanıcı).`);
      loadBotOwners();
    } else {
      showToast(data.error || "Bot sahipleri kaydedilemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.assignSelfAsBotOwner = async function() {
  const currentVal = document.getElementById("bot-owners-input")?.value || "";
  const currentList = currentVal.split(",").map((id) => id.trim()).filter(Boolean);

  const userId = prompt("Lütfen bot sahibi olarak atanacak Discord Kullanıcı ID'nizi girin:\n\n(Discord Ayarlar > Gelişmiş > Geliştirici Modu açıkken profilinize sağ tıklayıp 'Kullanıcı Kimliğini Kopyala' diyebilirsiniz)");
  if (!userId || !userId.trim()) return;

  const cleanId = userId.trim();
  if (currentList.includes(cleanId)) {
    showToast("Bu kullanıcı ID'si zaten listede bulunuyor.", "warning");
    return;
  }

  currentList.push(cleanId);
  const input = document.getElementById("bot-owners-input");
  if (input) input.value = currentList.join(", ");

  await saveBotOwnersList();
};

let currentBattlePassData = null;

window.loadBattlePassData = async function() {
  const targetGuild = currentGuildId || "default";
  try {
    const res = await fetch(`/api/battlepass/${targetGuild}`);
    const data = await res.json();
    if (!res.ok || !data.season) return;

    currentBattlePassData = data.season;

    const metricSeason = document.getElementById("bp-metric-season");
    const metricStatus = document.getElementById("bp-metric-status");
    const metricParticipants = document.getElementById("bp-metric-participants");
    const seasonNameInput = document.getElementById("bp-season-name");
    const seasonStatusSelect = document.getElementById("bp-season-status");
    const tbody = document.getElementById("bp-tiers-tbody");

    if (metricSeason) metricSeason.textContent = `${data.season.season}. Sezon (${data.season.seasonName || ""})`;
    if (metricStatus) metricStatus.textContent = data.season.active ? "🟢 Aktif" : "🔴 Pasif";
    if (metricParticipants) metricParticipants.textContent = `${data.totalParticipants || 0} Üye`;
    if (seasonNameInput) seasonNameInput.value = data.season.seasonName || "";
    if (seasonStatusSelect) seasonStatusSelect.value = String(Boolean(data.season.active));

    if (tbody && Array.isArray(data.season.tiers)) {
      tbody.innerHTML = data.season.tiers.map((t) => {
        const freeCoin = t.freeRewards?.find((r) => r.type === "COIN")?.amount || 0;
        const vipCoin = t.vipRewards?.find((r) => r.type === "COIN")?.amount || 0;
        return `
          <tr>
            <td><strong>#${t.tier}</strong></td>
            <td><input type="number" class="bp-tier-xp" data-tier="${t.tier}" value="${t.requiredXp || 0}" style="width: 100px; padding: 4px 8px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px;"> XP</td>
            <td><input type="number" class="bp-tier-free" data-tier="${t.tier}" value="${freeCoin}" style="width: 110px; padding: 4px 8px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px;"> Coin</td>
            <td><input type="number" class="bp-tier-vip" data-tier="${t.tier}" value="${vipCoin}" style="width: 110px; padding: 4px 8px; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 4px;"> Coin</td>
          </tr>
        `;
      }).join("");
    }
  } catch (err) {
    console.error(err);
    showToast("Sezon bileti verileri yüklenemedi.", "danger");
  }
};

window.saveBattlePassSettings = async function() {
  const targetGuild = currentGuildId || "default";
  const seasonName = document.getElementById("bp-season-name")?.value.trim();
  const active = document.getElementById("bp-season-status")?.value === "true";

  try {
    const res = await fetch(`/api/battlepass/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonName, active })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Sezon bileti ayarları kaydedildi.");
      loadBattlePassData();
    } else {
      showToast(data.error || "Ayarlar kaydedilemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.startNewBattlePassSeason = async function() {
  const name = prompt("Yeni sezon başlığı girin (örn: 2. Sezon: Karanlık Çağ):");
  if (!name || !name.trim()) return;

  const targetGuild = currentGuildId || "default";
  try {
    const res = await fetch(`/api/battlepass/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newSeason: true, seasonName: name.trim() })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || "Yeni sezon başlatıldı!");
      loadBattlePassData();
    } else {
      showToast(data.error || "Yeni sezon başlatılamadı.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.saveBattlePassTiers = async function() {
  if (!currentBattlePassData || !Array.isArray(currentBattlePassData.tiers)) {
    showToast("Kademe verisi bulunamadı.", "warning");
    return;
  }

  const updatedTiers = currentBattlePassData.tiers.map((t) => {
    const xpInput = document.querySelector(`.bp-tier-xp[data-tier="${t.tier}"]`);
    const freeInput = document.querySelector(`.bp-tier-free[data-tier="${t.tier}"]`);
    const vipInput = document.querySelector(`.bp-tier-vip[data-tier="${t.tier}"]`);

    const requiredXp = xpInput ? Number(xpInput.value) || 0 : t.requiredXp;
    const freeAmount = freeInput ? Number(freeInput.value) || 0 : 0;
    const vipAmount = vipInput ? Number(vipInput.value) || 0 : 0;

    return {
      tier: t.tier,
      requiredXp,
      freeRewards: [{ type: "COIN", amount: freeAmount, description: `${freeAmount} Coin` }],
      vipRewards: [{ type: "COIN", amount: vipAmount, description: `${vipAmount} Coin` }]
    };
  });

  const targetGuild = currentGuildId || "default";
  try {
    const res = await fetch(`/api/battlepass/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tiers: updatedTiers })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Kademe ödülleri başarıyla kaydedildi.");
      loadBattlePassData();
    } else {
      showToast(data.error || "Kademeler kaydedilemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.loadClansData = async function() {
  const targetGuild = currentGuildId || "default";
  try {
    const [settingsRes, clansRes] = await Promise.all([
      fetch(`/api/clans/settings/${targetGuild}`),
      fetch(`/api/clans/${targetGuild}`)
    ]);

    const settingsData = await settingsRes.json();
    const clansData = await clansRes.json();

    if (settingsData.settings) {
      const enabledSelect = document.getElementById("clan-system-enabled");
      const costInput = document.getElementById("clan-creation-cost");
      const membersInput = document.getElementById("clan-max-members");

      if (enabledSelect) enabledSelect.value = String(Boolean(settingsData.settings.enabled));
      if (costInput) costInput.value = settingsData.settings.creationCost ?? 10000;
      if (membersInput) membersInput.value = settingsData.settings.maxMembers ?? 25;
    }

    const tbody = document.getElementById("clans-tbody");
    if (!tbody) return;

    if (!Array.isArray(clansData.clans) || clansData.clans.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sunucuda henüz kayıtlı klan bulunmuyor.</td></tr>';
      return;
    }

    tbody.innerHTML = clansData.clans.map((c) => `
      <tr>
        <td><strong>${c.name}</strong> <code style="color: var(--accent-primary);">[${c.tag}]</code></td>
        <td><code>${c.leaderId}</code></td>
        <td>${c.members?.length || 0} Üye</td>
        <td>Seviye ${c.level || 1} (${(c.xp || 0).toLocaleString("tr-TR")} XP)</td>
        <td><strong>${(c.vault || 0).toLocaleString("tr-TR")}</strong> Coin</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteClanFromPanel('${c._id}')">Sil</button>
        </td>
      </tr>
    `).join("");
  } catch (err) {
    console.error(err);
    showToast("Klan verileri yüklenemedi.", "danger");
  }
};

window.saveClanSettings = async function() {
  const targetGuild = currentGuildId || "default";
  const enabled = document.getElementById("clan-system-enabled")?.value === "true";
  const creationCost = Number(document.getElementById("clan-creation-cost")?.value) || 0;
  const maxMembers = Number(document.getElementById("clan-max-members")?.value) || 25;

  try {
    const res = await fetch(`/api/clans/settings/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, creationCost, maxMembers })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Klan sistemi ayarları kaydedildi.");
      loadClansData();
    } else {
      showToast(data.error || "Klan ayarları kaydedilemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.createClanFromPanel = async function() {
  const targetGuild = currentGuildId || "default";
  const name = document.getElementById("clan-new-name")?.value.trim();
  const tag = document.getElementById("clan-new-tag")?.value.trim();
  const leaderId = document.getElementById("clan-new-leader")?.value.trim();
  const description = document.getElementById("clan-new-desc")?.value.trim();

  if (!name || !leaderId) {
    showToast("Lütfen klan adı ve lider kullanıcı ID girin.", "warning");
    return;
  }

  try {
    const res = await fetch(`/api/clans/${targetGuild}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name, tag, leaderId, description })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(data.message || "Klan başarıyla oluşturuldu.");
      document.getElementById("clan-new-name").value = "";
      document.getElementById("clan-new-tag").value = "";
      document.getElementById("clan-new-leader").value = "";
      document.getElementById("clan-new-desc").value = "";
      loadClansData();
    } else {
      showToast(data.error || "Klan oluşturulamadı.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.deleteClanFromPanel = async function(clanId) {
  const confirmed = confirm("Bu klanı kalıcı olarak silmek istediğinize emin misiniz?");
  if (!confirmed) return;

  const targetGuild = currentGuildId || "default";
  try {
    const res = await fetch(`/api/clans/${targetGuild}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", clanId })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Klan başarıyla silindi.");
      loadClansData();
    } else {
      showToast(data.error || "Klan silinemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.loadBadgesData = async function() {
  const targetGuild = currentGuildId || "default";
  try {
    const res = await fetch(`/api/badges/${targetGuild}`);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Rozet verileri alınamadı.", "danger");
      return;
    }
    const enabledSelect = document.getElementById("badge-system-enabled");
    if (enabledSelect) enabledSelect.value = String(Boolean(data.enabled));

    const tbody = document.getElementById("badges-users-tbody");
    if (!tbody) return;

    if (!Array.isArray(data.recentUsers) || data.recentUsers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Sunucuda henüz rozet veya unvan sahibi üye bulunmuyor.</td></tr>';
      return;
    }

    tbody.innerHTML = data.recentUsers.map((u) => {
      const activeBadgesStr = Array.isArray(u.activeBadges) && u.activeBadges.length > 0
        ? u.activeBadges.map((b) => `<span class="badge badge-info" style="margin-right: 4px;">${b}</span>`).join("")
        : '<span class="text-muted">Kuşanılmamış</span>';
      const allBadgesStr = Array.isArray(u.badges) && u.badges.length > 0
        ? u.badges.join(", ")
        : '<span class="text-muted">Yok</span>';
      return `
        <tr>
          <td><code>${u.userId}</code></td>
          <td><strong>${u.title || '<span class="text-muted">Yok</span>'}</strong></td>
          <td>${activeBadgesStr}</td>
          <td>${allBadgesStr}</td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    showToast("Rozet verileri yüklenirken bağlantı hatası oluştu.", "danger");
  }
};

window.saveBadgeSettings = async function() {
  const targetGuild = currentGuildId || "default";
  const enabled = document.getElementById("badge-system-enabled")?.value === "true";
  try {
    const res = await fetch(`/api/badges/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Rozet sistemi ayarları kaydedildi.");
      loadBadgesData();
    } else {
      showToast(data.error || "Ayarlar kaydedilemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.assignBadge = async function(action) {
  const targetGuild = currentGuildId || "default";
  const userId = document.getElementById("badge-target-user")?.value.trim();
  const badgeId = document.getElementById("badge-select-id")?.value;
  if (!userId) {
    showToast("Lütfen kullanıcı Discord ID girin.", "warning");
    return;
  }
  try {
    const res = await fetch(`/api/badges/assign/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, badgeId, action })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(action === "remove" ? "Rozet kullanıcıdan silindi." : "Rozet kullanıcıya tanımlandı.");
      loadBadgesData();
    } else {
      showToast(data.error || "İşlem başarısız oldu.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.assignTitle = async function(action) {
  const targetGuild = currentGuildId || "default";
  const userId = document.getElementById("badge-target-user")?.value.trim();
  const title = document.getElementById("badge-select-title")?.value;
  if (!userId) {
    showToast("Lütfen kullanıcı Discord ID girin.", "warning");
    return;
  }
  try {
    const res = await fetch(`/api/badges/assign/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, action })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast(action === "remove" ? "Unvan kullanıcıdan kaldırıldı." : "Unvan kullanıcıya atandı.");
      loadBadgesData();
    } else {
      showToast(data.error || "İşlem başarısız oldu.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.loadPetsData = async function() {
  const targetGuild = currentGuildId || "default";
  try {
    const res = await fetch(`/api/pets/${targetGuild}`);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Pet verileri alınamadı.", "danger");
      return;
    }
    const enabledSelect = document.getElementById("pet-system-enabled");
    const basePriceInput = document.getElementById("pet-base-price");
    const feedCostInput = document.getElementById("pet-feed-cost");

    if (enabledSelect) enabledSelect.value = String(Boolean(data.enabled));
    if (basePriceInput) basePriceInput.value = data.basePrice ?? 5000;
    if (feedCostInput) feedCostInput.value = data.feedCost ?? 200;

    const tbody = document.getElementById("pets-tbody");
    if (!tbody) return;

    if (!Array.isArray(data.activePets) || data.activePets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Sunucuda henüz sahiplenilmiş ruh hayvanı bulunmuyor.</td></tr>';
      return;
    }

    tbody.innerHTML = data.activePets.map((p) => {
      const activeBadge = p.isActive
        ? '<span class="badge badge-success">Kuşanıldı</span>'
        : '<span class="badge badge-secondary">Dinleniyor</span>';
      return `
        <tr>
          <td><code>${p.userId}</code></td>
          <td><strong>${p.name}</strong></td>
          <td><code>${p.petType}</code></td>
          <td>Seviye ${p.level || 1} (${(p.xp || 0).toLocaleString("tr-TR")} XP)</td>
          <td>%${p.energy ?? 100}</td>
          <td>${activeBadge}</td>
        </tr>
      `;
    }).join("");
  } catch (err) {
    showToast("Pet verileri yüklenirken bağlantı hatası oluştu.", "danger");
  }
};

window.savePetSettings = async function() {
  const targetGuild = currentGuildId || "default";
  const enabled = document.getElementById("pet-system-enabled")?.value === "true";
  const basePrice = Number(document.getElementById("pet-base-price")?.value) || 5000;
  const feedCost = Number(document.getElementById("pet-feed-cost")?.value) || 200;

  try {
    const res = await fetch(`/api/pets/settings/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, basePrice, feedCost })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Pet sistemi ayarları başarıyla kaydedildi.");
      loadPetsData();
    } else {
      showToast(data.error || "Pet ayarları kaydedilemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

window.loadCasinoData = async function() {
  const targetGuild = currentGuildId || "default";
  try {
    const res = await fetch(`/api/casino/${targetGuild}`);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Kumarhane verileri alınamadı.", "danger");
      return;
    }
    const enabledSelect = document.getElementById("casino-system-enabled");
    const minBetInput = document.getElementById("casino-min-bet");
    const maxBetInput = document.getElementById("casino-max-bet");
    const kazikazanCostInput = document.getElementById("casino-kazikazan-cost");

    if (enabledSelect) enabledSelect.value = String(Boolean(data.enabled));
    if (minBetInput) minBetInput.value = data.minBet ?? 10;
    if (maxBetInput) maxBetInput.value = data.maxBet ?? 50000;
    if (kazikazanCostInput) kazikazanCostInput.value = data.kazikazanCost ?? 50;
  } catch (err) {
    showToast("Kumarhane ayarları yüklenirken bağlantı hatası oluştu.", "danger");
  }
};

window.saveCasinoSettings = async function() {
  const targetGuild = currentGuildId || "default";
  const enabled = document.getElementById("casino-system-enabled")?.value === "true";
  const minBet = Number(document.getElementById("casino-min-bet")?.value) || 10;
  const maxBet = Number(document.getElementById("casino-max-bet")?.value) || 50000;
  const kazikazanCost = Number(document.getElementById("casino-kazikazan-cost")?.value) || 50;

  try {
    const res = await fetch(`/api/casino/settings/${targetGuild}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, minBet, maxBet, kazikazanCost })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      showToast("Kumarhane ve düello ayarları başarıyla kaydedildi.");
      loadCasinoData();
    } else {
      showToast(data.error || "Kumarhane ayarları kaydedilemedi.", "danger");
    }
  } catch (err) {
    showToast("Bağlantı hatası.", "danger");
  }
};

loadOverview();
