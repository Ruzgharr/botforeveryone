# Güncelleme Notları (Changelog)

## [2.1.0] - 2026-09-19

### Güvenlik ve Kurumsal Sertleştirme (Bank-Grade Enterprise Hardening)

Bu sürümle birlikte sistem kurumsal ve finansal düzeyde güvenlik standartlarına yükseltilmiştir. Tüm geliştirmeler 97 otomatik test ve 208 kaynak dosya doğrulaması ile 0 hatayla onaylanmıştır.

#### 1. İki Aşamalı Doğrulama (RFC 6238 TOTP 2FA)
* Sıfır harici bağımlılık ile yerleşik Node.js `crypto` modülü üzerinden RFC 6238 HMAC-SHA1 TOTP algoritması ve Base32 kodlayıcı geliştirildi.
* Yönetici giriş ekranına 6 haneli 2FA doğrulama adımı eklendi.
* Panel içerisine Google Authenticator ve Authy ile uyumlu kurulum sihirbazı, gizli anahtar üretimi ve doğrulama mekanizması entegre edildi.

#### 2. Güvenlik Denetim Günlüğü (Security Audit Log)
* Oturum açma (başarılı/başarısız), 2FA işlemleri, kilit modu tetiklemeleri ve sistem olaylarını takip eden `SecurityAuditLog` veritabanı modeli eklendi (MongoDB, PostgreSQL ve SQLite destekli).
* Dashboard V2 sol menüsüne eklenen "Güvenlik ve Kalkan" sekmesinde olay filtreleme özellikli canlı denetim tablosu sunuldu.

#### 3. Askeri Düzeyde Şifreli Sistem Yedekleri (AES-256-GCM)
* `SecurityHelper` sınıfına 12 baytlık rastgele IV, 16 baytlık Auth Tag ve SHA-256 anahtar türetimli `encryptAesGcm` ve `decryptAesGcm` metodları eklendi.
* `GitUpdateManager` yedekleme ve geri yükleme motoruna AES-256-GCM şifreleme desteği bağlandı; diskteki snapshotlar şifrelendi.

#### 4. 15 Dakika Boşta Kalma Zaman Aşımı (Idle Session Timeout)
* Yönetici oturumlarında 15 dakika boyunca fare veya klavye hareketi tespit edilmediğinde oturumu güvenlik gerekçesiyle otomatik sonlandıran koruma eklendi.

#### 5. Otomatik HTTPS Yönlendirmesi ve Katı Güvenlik Başlıkları
* Force HTTPS yönlendirme middleware'i eklendi.
* HSTS (1 yıl preload), CSP (Content Security Policy), X-Frame-Options: DENY (Clickjacking engeli), nosniff ve COOP başlıkları aktif edildi.
* Cross-Site Request Forgery (CSRF) engelleme katmanı devreye alındı.

#### 6. Discord Guard Lockdown / Panic Kalkanı
* Yetkili suiistimali veya şüpheli işlem anında tek tıkla kritik bot operasyonlarını donduran acil durum kilit modu (`/api/guard/lockdown`) ve arayüz kontrolleri eklendi.

#### 7. Hassas Veri Maskeleme ve SSRF Engellemesi
* Konsol ve log çıktılarına düşen Discord tokenları, veritabanı şifreleri ve secret anahtarlar için otomatik redaction motoru entegre edildi.
* Webhook gönderimlerinde iç ağ ve bulut metadata IP adreslerine erişimi engelleyen anti-SSRF süzgeci devreye alındı.

#### 8. Tek Seferlik Kurulum ve IP Kaba Kuvvet Koruması
* İlk kurulum sonrasında kayıt sistemini kalıcı olarak kapatan tek seferlik yönetici oluşturma mimarisi kuruldu.
* 5 ardışık hatalı denemede IP adresini 15 dakika kilitleyen brute-force savunması eklendi.
