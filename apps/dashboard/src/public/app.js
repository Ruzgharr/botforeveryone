let currentGuildId = localStorage.getItem("dash_guildId") || "default";

const messageCatalog = [
  { key: "jailPunish", cat: "mod", title: "Karantina (Jail) Cezası", default: "{user} kullanıcısı {staff} tarafından karantinaya (jail) gönderildi. Sebep: {reason} | Ceza Puanı: +{points}" },
  { key: "jailLift", cat: "mod", title: "Karantina Kaldırma (Af)", default: "{user} kullanıcısının karantina cezası {staff} tarafından kaldırıldı." },
  { key: "mutePunish", cat: "mod", title: "Yazı Susturma (Chat Mute)", default: "{user} kullanıcısı {staff} tarafından metin kanallarında susturuldu. Sebep: {reason}" },
  { key: "muteLift", cat: "mod", title: "Yazı Susturma Kaldırma", default: "{user} kullanıcısının metin susturması {staff} tarafından kaldırıldı." },
  { key: "vmutePunish", cat: "mod", title: "Ses Susturma (Voice Mute)", default: "{user} kullanıcısı {staff} tarafından ses kanallarında susturuldu. Sebep: {reason}" },
  { key: "vmuteLift", cat: "mod", title: "Ses Susturma Kaldırma", default: "{user} kullanıcısının ses susturması {staff} tarafından kaldırıldı." },
  { key: "banPunish", cat: "mod", title: "Yasaklama (Ban)", default: "{user} kullanıcısı {staff} tarafından sunucudan yasaklandı. Sebep: {reason}" },
  { key: "banLift", cat: "mod", title: "Yasak Kaldırma (Unban)", default: "{user} kullanıcısının sunucu yasağı {staff} tarafından kaldırıldı." },
  { key: "sicilClean", cat: "mod", title: "Sicil Temiz Bildirimi", default: "{user} adına kayıtlı herhangi bir ceza bulunmuyor. Toplam Ceza Puanı: 0" },
  { key: "sicilRecord", cat: "mod", title: "Sicil Geçmişi Listesi", default: "{user} kullanıcısının sicil kaydı:\nToplam Ceza Puanı: {points}\n\n{records}" },
  { key: "penaltyPoints", cat: "mod", title: "Ceza Puanı Sorgulama", default: "{user} adlı kullanıcının aktif ceza puanı: {points} / {limit}" },
  { key: "snipeEmpty", cat: "mod", title: "Snipe Boş Bildirimi", default: "Bu kanalda son silinen herhangi bir mesaj bulunmuyor." },
  { key: "snipeMessage", cat: "mod", title: "Snipe Mesaj Yanıtı", default: "Yazar: <@{authorId}>\nİçerik: {content}\nZaman: {time}" },

  { key: "registerWelcome", cat: "reg", title: "Kayıt Hoş Geldin Mesajı", default: "Aramıza hoş geldin {user}! Kayıt olmak için ses teyit odalarına bağlanabilirsiniz." },
  { key: "registerSuccess", cat: "reg", title: "Kayıt Başarılı Bildirimi", default: "{user} kullanıcısı {staff} tarafından {gender} olarak başarıyla kayıt edildi." },
  { key: "suspiciousAlert", cat: "reg", title: "Şüpheli Hesap Karantinası", default: "{user} hesabınız 7 günden yeni olduğu için güvenlik nedeniyle şüpheli karantinasına alındı." },
  { key: "serverStats", cat: "reg", title: "Sunucu Sayım / İstatistik", default: "Toplam Üye: {total}\nTaglı Üye: {tagged}\nSesteki Üye: {voice}\nTakviye Sayısı: {boosts}" },
  { key: "nameChanged", cat: "reg", title: "İsim Güncelleme Mesajı", default: "{user} kullanıcısının ismi {name} olarak güncellendi ve sicile işlendi." },
  { key: "nameHistory", cat: "reg", title: "İsim Geçmişi Listesi", default: "{user} kullanıcısının geçmiş isimleri (Toplam {count}):\n\n{records}" },

  { key: "coinBalance", cat: "eco", title: "Bakiye Sorgulama", default: "{user} Bakiye Durumu:\nCüzdan: {wallet} Coin\nBanka: {bank} Coin" },
  { key: "dailyReward", cat: "eco", title: "Günlük Ödül Toplama", default: "{user} günlük ödülünüz olan {amount} Coin hesabınıza aktarıldı!" },
  { key: "coinTransferSuccess", cat: "eco", title: "Coin Transferi Başarılı", default: "{user} başarıyla {target} kullanıcısına {amount} Coin gönderdi." },
  { key: "blackjackTable", cat: "eco", title: "Blackjack Oyun Başlangıcı", default: "Bahis: {bet} Coin\nSizin Kartlarınız: [ {cards} ] (Toplam: {total})\nKrupiye: [ {dealer} - ? ]" },
  { key: "blackjackWin", cat: "eco", title: "Blackjack Kazanma", default: "Tebrikler! Krupiyeyi yenerek {amount} Coin kazandınız. Yeni Bakiye: {balance}" },
  { key: "blackjackLose", cat: "eco", title: "Blackjack Kaybetme", default: "Krupiye kazandı. {amount} Coin kaybettiniz. Yeni Bakiye: {balance}" },
  { key: "blackjackPush", cat: "eco", title: "Blackjack Berabere (İade)", default: "Berabere! Bahis miktarınız olan {amount} Coin iade edildi. Yeni Bakiye: {balance}" },
  { key: "slotWin", cat: "eco", title: "Slot Kazanma", default: "[ {reel1} | {reel2} | {reel3} ]\nTebrikler! {multiplier}x katlayarak {amount} Coin kazandınız. Yeni Bakiye: {balance}" },
  { key: "slotLose", cat: "eco", title: "Slot Kaybetme", default: "[ {reel1} | {reel2} | {reel3} ]\nBu turda kazanamadınız. {amount} Coin kaybettiniz. Yeni Bakiye: {balance}" },
  { key: "ruletWin", cat: "eco", title: "Rulet Kazanma", default: "Top {color} ({number}) üzerine düştü!\nTebrikler! {amount} Coin kazandınız. Yeni Bakiye: {balance}" },
  { key: "ruletLose", cat: "eco", title: "Rulet Kaybetme", default: "Top {color} ({number}) üzerine düştü!\nKaybettiniz: {amount} Coin. Yeni Bakiye: {balance}" },

  { key: "customRoomCreated", cat: "util", title: "Özel Oda Oluşturuldu", default: "{user} özel ses odanız oluşturuldu: {channel}" },
  { key: "roomLocked", cat: "util", title: "Özel Oda Kilitlendi", default: "Oda başarıyla kilitlendi. Yabancı üyeler artık odaya katılamaz." },
  { key: "roomUnlocked", cat: "util", title: "Özel Oda Kilidi Açıldı", default: "Oda kilidi açıldı. Artık tüm üyeler katılabilir." },
  { key: "ticketCreated", cat: "util", title: "Destek Bileti Açıldı", default: "{user} destek talebiniz açıldı: {channel}" },
  { key: "ticketClosed", cat: "util", title: "Destek Bileti Kapatıldı", default: "Destek talebi sonlandırıldı. Kanal 5 saniye içinde silinecektir..." },

  { key: "userStats", cat: "stat", title: "Kullanıcı Aktivite Özeti", default: "{user} Aktivite İstatistikleri:\nSes Aktifliği (Toplam / Hafta / Gün): {totalVoice} / {weeklyVoice} / {dailyVoice}\nMesaj Aktifliği (Toplam / Hafta / Gün): {totalMsgs} / {weeklyMsgs} / {dailyMsgs}" },
  { key: "topStats", cat: "stat", title: "Liderlik Sıralaması", default: "{guild} En Aktifler Sıralaması:\n\n{ranking}" },
  { key: "staffTask", cat: "stat", title: "Yetkili Görev Durumu", default: "{user} Haftalık Görev Durumu:\nSes: {voiceHours} Saat\nMesaj: {msgs} Mesaj\nKayıt: {regs} Kayıt\nToplam Puan: {points}" },
  { key: "attendanceReport", cat: "stat", title: "Toplantı Yoklama Raporu", default: "Toplantı Raporu - Kanal: {channel}\nKatılan Yetkili: {attendedCount} | Katılmayan: {missingCount}\nKatılanlar: {attendedList}" },

  { key: "guardAlert", cat: "guard", title: "Güvenlik İhlal Uyarısı", default: "Güvenlik Bildirimi: {user} yetkisiz işlem gerçekleştirdi: {reason}" },
  { key: "warnAdd", cat: "mod", title: "Kullanıcı Uyarı Bildirimi", default: "{user} kullanıcısı {staff} tarafından uyarıldı. Sebep: {reason}" },
  { key: "warnClean", cat: "mod", title: "Uyarı Sıfırlama Bildirimi", default: "{user} kullanıcısının tüm uyarıları {staff} tarafından temizlendi." },
  { key: "lockChannel", cat: "mod", title: "Kanal Kilitleme", default: "Bu kanal {staff} tarafından {duration} süreyle kilitlendi." },
  { key: "unlockChannel", cat: "mod", title: "Kanal Kilidi Açıldı", default: "Kanal kilidi açıldı. Artık sohbet edebilirsiniz." },
  { key: "afkSet", cat: "util", title: "AFK Moduna Geçildi", default: "{user} başarıyla AFK moduna geçti. Sebep: {reason}" },
  { key: "suggestionNew", cat: "util", title: "Yeni Öneri Bildirimi", default: "{user} tarafından yeni bir öneri sunuldu: {content}" },
  { key: "confessionNew", cat: "util", title: "Anonim İtiraf", default: "Yeni bir anonim itiraf alındı: {content}" },
  { key: "birthdayWish", cat: "util", title: "Doğum Günü Kutlaması", default: "Doğum günün kutlu olsun {user}! Nice mutlu senelere!" },
  { key: "radioStart", cat: "util", title: "Radyo Yayını Başlatıldı", default: "{station} radyo istasyonu çalınıyor: {url}" },
  { key: "depositSuccess", cat: "eco", title: "Vadeli Mevduat Yatırımı", default: "{amount} Coin tutarında mevduat hesabı açıldı. 24 saat sonra %5 getiri sağlanacaktır." },
  { key: "companyCreated", cat: "eco", title: "Şirket Kuruldu", default: "Tebrikler! {name} adlı şirketiniz kuruldu. Saatlik pasif gelir toplayabilirsiniz." },
  { key: "propertyBought", cat: "eco", title: "Gayrimenkul Satın Alındı", default: "Tebrikler! {type} mülkünü satın aldınız. Günlük kira geliri hesabınıza eklenecektir." },
  { key: "lotteryWin", cat: "eco", title: "Piyango Kazandı", default: "Büyük ikramiye! {amount} Coin ödül kazandınız!" },
  { key: "mineSuccess", cat: "eco", title: "Maden Kazısı Tamamlandı", default: "Kazıdan {mineral} cevheri ve {amount} Coin kazandınız!" },
  { key: "fishSuccess", cat: "eco", title: "Balık Avı Başarılı", default: "Oltanıza {fish} takıldı! Değeri: {amount} Coin." }
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

  { name: "coin", cat: "eco", catTitle: "Ekonomi" },
  { name: "gunluk", cat: "eco", catTitle: "Ekonomi" },
  { name: "calis", cat: "eco", catTitle: "Ekonomi" },
  { name: "gonder", cat: "eco", catTitle: "Ekonomi" },
  { name: "banka", cat: "eco", catTitle: "Ekonomi" },
  { name: "market", cat: "eco", catTitle: "Ekonomi" },
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
    if (target === "tab-bot-fleet") loadBotCredentials();
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
    if (target === "tab-backups") loadBackups();
    if (target === "tab-invites") loadInvites();
    if (target === "tab-staff-tasks") loadStaffTasks();
    if (target === "tab-livechat") {
      fetchConsoleLogs();
      startConsoleAutoRefresh();
    } else {
      stopConsoleAutoRefresh();
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

async function loadChannelMessages() {
  const channelId = document.getElementById("live-channel-id")?.value.trim();
  if (!channelId) {
    showToast("Lütfen geçerli bir kanal ID girin.", "danger");
    return;
  }

  const box = document.getElementById("live-chat-stream-box");
  if (box) box.innerHTML = '<p class="text-muted">Mesajlar alınıyor...</p>';

  try {
    const res = await fetch(`/api/chat/messages/${channelId}`);
    const msgs = await res.json();
    if (!box) return;

    if (!Array.isArray(msgs) || msgs.length === 0) {
      box.innerHTML = '<p class="text-muted">Bu kanalda mesaj bulunamadı veya bota yetki verilmedi.</p>';
      return;
    }

    box.innerHTML = msgs.map((m) => {
      const time = m.timestamp ? new Date(m.timestamp).toLocaleTimeString("tr-TR") : "";
      return `<div style="padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
        <strong style="color: var(--primary);">${m.author}</strong> <span style="font-size: 11px; opacity: 0.6;">(${time})</span>:
        <span style="margin-left: 6px;">${m.content}</span>
      </div>`;
    }).join("");
    box.scrollTop = box.scrollHeight;
  } catch (error) {
    if (box) box.innerHTML = '<p class="text-muted">Mesajlar alınırken bağlantı hatası oluştu.</p>';
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
      document.getElementById("cfg-db-provider").value = cfg.databaseProvider.provider || "MONGODB";
      document.getElementById("cfg-db-uri").value = cfg.databaseProvider.connectionUri || "";
    }

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
    tbody.innerHTML = '<tr><td colspan="5" class="text-muted">Aramanıza uygun komut bulunamadı.</td></tr>';
    return;
  }

  filtered.forEach((cmd) => {
    const saved = loadedCommandsConfig[cmd.name] || {};
    const alias = saved.customName || cmd.name;
    const mode = saved.mode || "BOTH";
    const isEnabled = mode !== "DISABLED";

    const tr = document.createElement("tr");
    tr.setAttribute("data-cmd", cmd.name);
    tr.innerHTML = `
      <td><code>${cmd.name}</code></td>
      <td><span class="status-pill status-pill-active">${cmd.catTitle}</span></td>
      <td><input type="text" class="table-input" value="${alias}" data-field="alias"></td>
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
    const mode = row.querySelector('[data-field="mode"]')?.value || "BOTH";
    loadedCommandsConfig[cmdName] = {
      enabled: mode !== "DISABLED",
      customName,
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
    const format = saved.format || "EMBED";
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
            <option value="EMBED" ${format === "EMBED" ? "selected" : ""}>Klasik Embed</option>
            <option value="COMPONENTS_V2" ${format === "COMPONENTS_V2" ? "selected" : ""}>Components V2 (Modern Konteyner)</option>
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
          <div class="form-group">
            <label>Durum Metni (Presence Text)</label>
            <input type="text" id="bc-acttext-${bot.serviceKey}" value="${bot.activityText || "Public Bot Ecosystem"}" placeholder="Örn: Public Bot Ecosystem">
          </div>
        </div>
        <div class="form-actions mt-3">
          <button class="btn btn-primary btn-sm" onclick="saveBotCredential('${bot.serviceKey}', '${bot.name}')">Bot Bilgilerini Kaydet</button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
  }
}

window.saveBotCredential = async function(serviceKey, botName) {
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
        name: botName,
        clientId,
        token,
        activityType,
        activityText,
        status: "ONLINE",
        enabled: true
      })
    });
    if (res.ok) {
      showToast(`${botName} ayarları başarıyla veritabanına kaydedildi.`);
      loadBotCredentials();
    } else {
      showToast("Bot ayarları kaydedilemedi.", "danger");
    }
  } catch (error) {
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

loadOverview();
