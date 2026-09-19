# Public Bot Ecosystem

Türkiye'nin büyük ölçekli Discord toplulukları için geliştirilmiş, modüler servis mimarisine sahip açık kaynaklı Discord bot ekosistemi ve web yönetim konsolu.

---

## Genel Bakış

Bu ekosistem, yüksek üye sayılı topluluklarda Discord API hız sınırlarını (rate limits) dağıtık servis mimarisi ve token havuzu ile minimize ederek çalışan 8 modüler bot servisini ve 23 modüllü modern bir yönetim panelini (Dashboard V2) bir araya getirir.

### Temel Yetenekler

* **Çoklu Veritabanı Desteği:** PostgreSQL 16 (JSONB indeksleme), MongoDB ve SQLite sürücüleri ile sıfır harici bağımlılıkla veya kurumsal SQL altyapısıyla çalışabilme.
* **Kapsamlı Güvenlik Mimarisi:** RFC 6238 TOTP 2FA (Google Authenticator / Authy), Rol Tabanlı Yetkilendirme (RBAC: SUPERADMIN, ADMIN, MODERATOR), tek seferlik kurulum kilidi, veritabanı denetim günlüğü (Security Audit Log), AES-256-GCM ile şifrelenen sistem yedekleri ve 2FA anahtarları, 15 dakika boşta kalma zaman aşımı (Idle Session Timeout), zorunlu HTTPS yönlendirmesi, CSRF engelleme, otomatik log maskeleme, anti-SSRF süzgeci ve Discord Guard acil kilit modu (Panic Shield).
* **Dayanıklı Denetleyici (Supervisor & Watchdog):** STARTING, READY, DEGRADED, FAILED, STOPPED sağlık durumları, üstel geri çekilme (exponential backoff) ve crash-loop koruma mekanizması.
* **Güvenli Güncelleme:** GitUpdateManager üzerinde komut enjeksiyonu ve dizin geçişi (path traversal) korumaları ile güvenli güncelleme ve otomatik yedekleme.
* **Görsel Kart Motoru:** Node-Canvas ve FFmpeg tabanlı 15 FPS hareketli profil, seviye, cüzdan ve liderlik kartları (PNG, GIF ve MP4).
* **Gelişmiş Ekonomi & Şans Oyunları:** Blackjack 21, Vegas Slot, Rulet, Yazı Tura, Kazı Kazan, Balıkçılık, Madencilik, Borsa, Şirketler, Emlak ve Bahisli Düello.
* **Klanlar ve Loncalar:** Klan kurma, rütbeler, klan sandığı, ortak borsa ve klanlar arası sıralama.
* **Rozet ve Anime Ruh Hayvanları (Pets):** Başarı rozetleri, sanal evcil hayvanlar, besleme, antrenman ve stat bonusları.
* **Battle Pass Sezonları:** Sezonluk seviye ilerlemesi, XP kotaları, görev masası ve özel ödül kilitleri.
* **Destek Biletleri (Tickets):** Panelden canlı talep takibi, tek tıkla arşivleme, puanlama ve sohbet transkripti indirme.
* **Yetkili Görev Masası:** Haftalık ses, mesaj, kayıt ve davet kotaları, yetkili başarı performansı ve terfi puanlama.
* **Güvenlik Kalkanı (Guard) ve Dağıtıcı Havuzu:** Rol, kanal ve sunucu ayarlarını koruyan, çoklu token ile anında kurtarma yapan dağıtıcı havuzu.

---

## Servis Mimarisi

| Servis | Klasör Yolu | Açıklama |
| :--- | :--- | :--- |
| **Dashboard V2** | `apps/dashboard-v2` | Port 3001 üzerinde çalışan tam teşekküllü web yönetim arayüzü ve REST API |
| **Moderasyon** | `apps/moderation` | Ceza puanlama sistemi (Ban, Kick, Jail, Mute, VMute, Uyar), sicil dökümü ve snipe |
| **Kayıt** | `apps/register` | Cinsiyet, tag ve isim-yaş doğrulamalı kayıt sistemi, şüpheli hesap karantinası |
| **İstatistik** | `apps/stats` | Kategori bazlı ses/mesaj takibi, haftalık ödüller, canlı sıralamalar ve yoklama |
| **Ekonomi** | `apps/economy` | Banka, cüzdan, borsa, maden, emlak, klanlar ve kumarhane oyunları |
| **Guard-Main** | `apps/guard-main` | Sunucu koruma kuralları, denetim kaydı izleyicisi ve otomatik ceza motoru |
| **Dağıtıcı Havuzu** | `apps/guard-distributor` | Çoklu token ile anında rol ve kanal kurtarma havuzu |
| **Ses Karşılama** | `apps/voice-welcome` | Ses teyit odalarında 7/24 bekleyen ve panelden yönetilen anons botları |
| **Yardımcı Araçlar** | `apps/utility` | Özel oda sistemi (Join-to-Create), çekiliş, anket ve genel sunucu araçları |

---

## Sistem Gereksinimleri

Kuruluma başlamadan önce sisteminizde aşağıdaki bileşenlerin kurulu olduğundan emin olun:

* **Node.js:** v18.0.0 veya üzeri (LTS sürümü önerilir)
* **npm:** v9.0.0 veya üzeri
* **Git:** En güncel sürüm
* **Veritabanı (Biri Tercih Edilmelidir):**
  * **PostgreSQL:** v15 veya üzeri (Önerilen)
  * **SQLite:** Ek kurulum gerektirmez, doğrudan yerel dosya üzerinde çalışır
  * **MongoDB:** v6.0 veya üzeri

---

## Adım Adım Kurulum Rehberi

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/Ruzgharr/botforeveryone.git
cd botforeveryone
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Ortam Değişkenlerini Hazırlayın
Örnek ortam şablonunu kopyalayarak `.env` dosyanızı oluşturun:
```bash
cp .env.example .env
```

`.env` dosyasını bir metin düzenleyici ile açarak değerlerinizi tanımlayın:
```env
PORT=3000
DASHBOARD_V2_PORT=3001
DASHBOARD_SECRET=guclu-ve-guvenli-bir-secret-anahtar-yazin
ENCRYPTION_KEY=32-karakterli-guvenli-sifreleme-anahtari
ALLOWED_ORIGINS=http://localhost:3001,http://127.0.0.1:3001

DB_PROVIDER=postgres
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=bot_ecosystem
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres_sifreniz

DEFAULT_GUILD_ID=SUNUCU_ID_BURAYA
DEFAULT_PREFIX=.

TOKEN_MODERATION=MODERASYON_BOT_TOKEN
TOKEN_REGISTER=KAYIT_BOT_TOKEN
TOKEN_STATS=ISTATISTIK_BOT_TOKEN
TOKEN_GUARD_MAIN=GUARD_BOT_TOKEN
TOKENS_DISTRIBUTOR=DAGITICI_TOKEN_1,DAGITICI_TOKEN_2
TOKENS_VOICE_WELCOME=SES_TOKEN_1,SES_TOKEN_2
TOKEN_ECONOMY=EKONOMI_BOT_TOKEN
TOKEN_UTILITY=UTILITY_BOT_TOKEN
```

### 4. Discord Developer Portal Ayarları

Botlarınızın sorunsuz çalışabilmesi için [Discord Developer Portal](https://discord.com/developers/applications) üzerinden oluşturduğunuz her bir bot için şu ayarları yapmalısınız:

1. Uygulamanızı seçin ve sol menüden **Bot** sekmesine girin.
2. **Privileged Gateway Intents** başlığı altındaki 3 yetkiyi aktif edin:
   * **Presence Intent**
   * **Server Members Intent**
   * **Message Content Intent**
3. Botunuzu sunucunuza `Administrator` (Yönetici) veya gerekli kanal/rol izinleriyle davet edin.

---

## Çalıştırma Komutları

### Tüm Ekosistemi Başlatma
Tüm botları ve yönetim panelini tek seferde çalıştırmak için:
```bash
npm start
```

### Web Yönetim Panelini Başlatma (Dashboard V2)
Sadece modern yönetim panelini başlatmak için:
```bash
npm run dashboard:v2
```
Tarayıcınızdan `http://localhost:3001` adresine giderek yönetim konsoluna erişebilirsiniz.

### Bot Kümesini Bağımsız Başlatma
8 botun tamamını arka planda küme kontrol sunucusuyla başlatmak için:
```bash
npm run bots
```

### Tekil Bot Başlatma
İhtiyacınıza göre servisleri bağımsız olarak ayağa kaldırabilirsiniz:
* Moderasyon Botu: `npm run moderation`
* Kayıt Botu: `npm run register`
* İstatistik Botu: `npm run stats`
* Ekonomi Botu: `npm run economy`
* Koruma Botu: `npm run guard`
* Dağıtıcı Havuzu: `npm run distributor`
* Ses Karşılama: `npm run voice`
* Yardımcı Araçlar: `npm run utility`

---

## Test ve Doğrulama

Ekosistemin sağlığını ve kaynak kod doğruluğunu denetlemek için yerleşik test komutları:

* **Birim ve Regresyon Testleri:**
```bash
npm test
```
97 birim ve kurumsal güvenlik testini çalıştırır; RFC 6238 TOTP 2FA, geçici 2FA oturumları, güvenlik denetim günlüğü, AES-256-GCM sistem yedekleri, scrypt parola hashleme, tek seferlik ilk kayıt kilidi, brute-force koruması, CSRF engelleme, otomatik log maskeleme (token ve şifre redaction), oturum yönetimi, SSRF ve webhook doğrulaması, HTTP güvenlik başlıkları (CSP, HSTS, X-Frame-Options), token şifreleme, SQL enjeksiyon koruması, git komut güvenliği, görsel kart oluşturma ve veritabanı sürücülerini doğrular.

* **Kaynak Kod ve Sözdizimi Denetimi:**
```bash
npm run check
```
Tüm kaynak dosyaların sözdizimini ve 124 komut modülünün yüklenme kabiliyetini test eder.

---

## Sık Karşılaşılan Sorunlar ve Çözümleri

### 1. Botlar Komutlara Yanıt Vermiyor
* **Sebep:** Discord Developer Portal üzerinde `Message Content Intent` kapalı olabilir.
* **Çözüm:** Developer Portal > Bot > Privileged Gateway Intents bölümünden Message Content Intent seçeneğini işaretleyin ve botu yeniden başlatın.

### 2. Panelde Botlar Çevrimdışı Görünüyor
* **Sebep:** Bot kümesi (`npm run bots` veya `npm start`) henüz başlatılmamış olabilir.
* **Çözüm:** Paneldeki Bot Yönetimi sekmesinden "Tüm Kümeyi Başlat" butonuna tıklayın veya konsoldan `npm run bots` komutunu çalıştırın.

### 3. Veritabanı Bağlantı Hatası
* **Sebep:** PostgreSQL servisiniz aktif olmayabilir veya port/şifre hatalı olabilir.
* **Çözüm:** SQLite kullanmak için `.env` dosyasında `DB_PROVIDER=sqlite` yaparak harici veritabanı gereksinimi olmadan sistemi anında başlatabilirsiniz.

---

## Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında lisanslanmıştır. Detaylar için LICENSE dosyasını inceleyebilirsiniz.
