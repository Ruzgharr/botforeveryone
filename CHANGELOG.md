# Güncelleme Notları (Changelog)

## [2.2.0] - 2026-09-19

### Mimari Sertlestirme ve Rol Tabanli Güvenlik (RBAC & Architecture Hardening)

#### Güvenlik Degisiklikleri

* **Master Key Login Bypass Kaldirildi**: `/api/auth/login` ucnoktasinda `DASHBOARD_SECRET` kullanarak parola ve 2FA dogrulama atlatabilen arkakapiyi tamamen kapatildi. Artik tüm web paneli girislerinde kullanici adi, scrypt hash ile parola dogrulamasi ve RFC 6238 TOTP 2FA kodu birlikte zorunludur.
* **Rol Tabanli Yetkilendirme (RBAC)**: Dort yetkili rol tanimlandi - `SUPERADMIN`, `ADMIN`, `MODERATOR`, `READ_ONLY`. Her rol icin ayri yetki siniri belirlendi:
  - `/api/terminal/command` - yalnizca `SUPERADMIN`
  - `/api/system/git-update` - yalnizca `SUPERADMIN`
  - `/api/system/restore-backup` - yalnizca `SUPERADMIN`
  - `/api/system/backup-create` - `SUPERADMIN` veya `ADMIN`
  - `/api/guard/lockdown` - `SUPERADMIN` veya `ADMIN`
* **2FA Secret AES-256-GCM Sifrelemesi**: `POST /api/auth/2fa/enable` akisinda üretilen TOTP secret degerleri artik AES-256-GCM ile sifrelenerek veritabanina yaziliyor. Dogrulama ve devre disi birakma asamalarinda `decryptToken` ile cozuluyor. Geriye donuk uyumluluk saglamak icin onceki duz metin kayitlar da destekleniyor (`isEncrypted` kontrolü).
* **Strict Production Guard**: `NODE_ENV=production` modunda `DASHBOARD_SECRET` veya `ENCRYPTION_KEY` eksik, varsayilan (`public-ecosystem-secret-key`, `bfe_default_fallback_encryption_key`) veya 16 karakterden kisa ise sunucu baslama asamasinda hata firlatarak calismaya devam etmiyor.
* **Login Formu Temizlendi**: Panel arayüzünden "Master Key ile Giris" secenekleri kaldirildi. Yerine acik "Yonetici Kullanici Adi" ve "Yonetici Parolasi" alanlari getirildi.

#### Test Kapsamı Genislemesi

* RBAC orta katmani (`requireRole`) icin birim testleri eklendi: `SUPERADMIN` yetkili erisim ve `MODERATOR`/`READ_ONLY` rollerinin 403 Forbidden engeliyle dogrulanmasi.
* Login 2FA bypass engelleme testi: `key` parametresi saglandiginda bile parola ve 2FA dogrulamasi olmadan giris yapilamamasinin dogrulanmasi.
* 2FA secret AES-256-GCM sifrelenmis saklama ve cozme dogrulama testi.
* `validateProductionConfig` siki uretim ortami denetim testi.
* Gecici 2FA oturum yasam dongusu (`createTemp2faToken`, `getTemp2faSession`, `invalidateTemp2faToken`) testleri.
* Test sayisi 97 oldu, 0 basarisizlik (97 pass, 0 fail).

#### Degistirilen Dosyalar

| Dosya | Degisiklik Özeti |
|---|---|
| `apps/dashboard-v2/src/index.js` | Master key bypass kaldirildi; 2FA enable/verify/disable akislarinda AES-256-GCM sifrelenmis secret; RBAC requireRole middleware baglamasi |
| `apps/dashboard-v2/src/middleware/auth.js` | `requireRole` RBAC fonksiyonu eklendi; `getExpectedSecret` production guard; gecici 2FA oturum yonetimi; genel auth akisi güncellendi |
| `apps/dashboard-v2/src/public/app.js` | Master Key giris formu elemanları ve akis kodu kaldirildi |
| `apps/dashboard-v2/src/public/index.html` | Login formunda Master Key alani ve ilgili UI elemanları silindi |
| `packages/config/src/index.js` | `validateProductionConfig` fonksiyonu eklendi; production ortami siki anahtar dogrulama zorunlu kilindi |
| `tests/security-hardening.test.mjs` | RBAC, 2FA bypass engeli, sifrelenmis secret ve production guard testleri eklendi; `requireRole`, `getExpectedSecret`, `validateProductionConfig` importlari güncellendi |
| `README.md` | Belgeler teknik ve olcumlenebilir terimlerle (RBAC, RFC 6238, AES-256-GCM) güncellendi; asiri ifadeler kaldirildi |
| `CHANGELOG.md` | Bu versiyon notlari eklendi |

---

## [2.1.0] - 2026-09-19

### Kapsamlı Güvenlik Sertleştirmesi

* **İki Aşamalı Doğrulama (RFC 6238 TOTP 2FA)**: Sıfır harici bağımlılık ile yerleşik Node.js `crypto` modülü üzerinden RFC 6238 HMAC-SHA1 TOTP algoritması ve Base32 kodlayıcı geliştirildi. Yönetici giriş ekranına ve panele entegre edildi.
* **Güvenlik Denetim Günlüğü (Security Audit Log)**: Oturum açma, 2FA, kilit modu ve sistem olaylarını takip eden `SecurityAuditLog` veritabanı modeli (MongoDB, PostgreSQL ve SQLite uyumlu) ve arayüzü sunuldu.
* **Şifreli Sistem Yedekleri (AES-256-GCM)**: `SecurityHelper` sınıfına 12 baytlık rastgele IV, 16 baytlık Auth Tag ve SHA-256 anahtar türetimli `encryptAesGcm` ve `decryptAesGcm` metodları eklendi. `GitUpdateManager` yedekleri şifrelendi.
* **15 Dakika Boşta Kalma Zaman Aşımı (Idle Session Timeout)**: Hareketsizlik durumunda oturumu güvenlik gerekçesiyle sonlandıran istemci koruması eklendi.
* **Otomatik HTTPS Yönlendirmesi ve Katı Güvenlik Başlıkları**: Force HTTPS, HSTS (1 yıl preload), CSP, X-Frame-Options: DENY, nosniff, COOP ve CSRF koruma katmanları devreye alındı.
* **Discord Guard Lockdown / Panic Kalkanı**: Yetkili suiistimalinde tek tıkla kritik bot operasyonlarını donduran acil durum kilit modu entegre edildi.
* **Hassas Veri Maskeleme ve SSRF Engellemesi**: Konsol ve log çıktılarına düşen token ve şifreler için otomatik maskeleme motoru eklendi. Webhooklar için anti-SSRF süzgeci bağlandı.
