# Public Bot Ecosystem

Türkiye'nin büyük ölçekli Discord Public sunucuları için geliştirilmiş, tamamı açık kaynaklı ve modüler bot ekosistemi.

## Servis Mimarisi

* **Moderation Botu:** Puanlı ceza sistemi (Jail, Mute, VMute, Ban, Warn), anlık sicil sorgulama, ceza ID ve snipe.
* **Register Botu:** Taglı/tagsız kayıt, cinsiyet ve isim-yaş formatlandırma, 7 gün altı hesaplar için şüpheli koruması ve isim geçmişi.
* **Stats Botu:** Kategori bazlı ses ve mesaj takibi, haftalık görev ve terfi puanlama motoru, sesli toplantı yoklama raporlama.
* **Guard-Main:** Rol, kanal ve sunucu ayarı silme/güncelleme engeli, izinsiz bot ve webhook bloklama, güvenli liste (whitelist).
* **Guard-Distributor:** Rate limit engelini aşan çoklu token dağıtıcı havuzu. Yedekleri anında kurtarma sistemi.
* **Voice-Welcome (Ses Karşılama):** Ses teyit kanallarında 7/24 bekleyen ve panelden tek tıkla yeni bot eklenebilen karşılama botları.
* **Economy Botu:** Blackjack (21), Slot, Rulet ve transfer sistemli sunucu içi ekonomi motoru.
* **Utility Botu:** Join-to-Create (JTC) özel oda oluşturucu ve butonlu ticket destek sistemi.
* **Web Dashboard:** Tüm sistemi tek ekrandan yöneten, rol/kanal atamalarını, sicil tablosunu ve ses karşılama botlarını yöneten sade web paneli.

## Kurulum ve Çalıştırma

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. `.env.example` dosyasını `.env` olarak kopyalayın ve tokenlarınızı tanımlayın:
```bash
cp .env.example .env
```

3. Tüm ekosistemi ve web panelini tek komutla başlatın:
```bash
npm start
```

Web Yönetim Paneli varsayılan olarak `http://localhost:3000` adresinde yayına girer.

## Bağımsız Servis Çalıştırma

Herhangi bir botu ayrı bir sunucuda veya bağımsız bir process olarak çalıştırmak isterseniz:

* Dashboard: `npm run dashboard`
* Moderasyon: `npm run moderation`
* Register: `npm run register`
* Stat: `npm run stats`
* Guard: `npm run guard`
* Dağıtıcı: `npm run distributor`
* Ses Karşılama: `npm run voice`
* Ekonomi: `npm run economy`
* Utility: `npm run utility`

## Yeni Bot Ekleme (Ölçekleme)

Yeni bir bot eklemek istediğinizde:
1. `apps/` altında yeni bir klasör açın.
2. `@bot/core` paketindeki `BaseBot` sınıfından türeterek komutlarınızı tanımlayın.
3. Botunuz merkezi veritabanı ve konfigürasyon sistemine anında erişecektir.
