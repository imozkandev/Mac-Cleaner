# 🚀 mac-cleaner — Proje Detay Dokümanı

## 🌟 Proje Tanımı
`mac-cleaner`, macOS'un dahili depolama araçlarının (Storage Management) sunduğu temel işlevlerin ötesine geçen; geliştiriciler, içerik üreticileri ve güç kullanıcıları (power users) için tasarlanmış minimalist, güvenli ve yüksek performanslı masaüstü depolama yönetim uygulamasıdır.

---

## 🆚 macOS Dahili Depolama vs. `mac-cleaner` Karşılaştırması

| Özellik / Alan | macOS Dahili Depolama Aracı | `mac-cleaner` |
| :--- | :--- | :--- |
| **Geliştirici Önbelleği (Xcode, Docker, Node)** | Yok (Sadece "Sistem Verileri" altında toplar) | ✅ Otomatik tespit, detaylı kırılım ve tek tıkla temizlik |
| **Uygulama Kaldırma** | Sadece `.app` dosyasını siler (Kalııntılar kalır) | ✅ Akıllı Uninstaller (Preferences, Application Support artıkları) |
| **Çift & Benzer Dosya Tespiti** | Yok | ✅ Hash tabanlı (MD5/SHA-256) %100 doğruluk ve görsel benzerlik |
| **Canlı Menü Çubuğu (Menu Bar) İzleyici** | Yok | ✅ Anlık RAM/Disk takibi, hızlı önbellek boşaltma |
| **Eski / İndirilen Dosya Otomasyonu** | Temel (Sadece İndirilenler klasörünü gösterir) | ✅ Kural tabanlı otomatik arşivleme ve akıllı filtreleme |
| **Görsel Alan Analizi** | Sadece kategori çubuğu gösterir | ✅ Interaktif Treemap / Disk Map görselleştirmesi |
| **Büyük Proje Klasör Analizi** | Yok | ✅ `node_modules`, `.venv`, `target/` tespiti ve boyut analizi |

---

## ⚡ macOS'a Ek Olarak Geliştirilecek İleri Düzey Özellikler

### 1. 🛠️ Geliştirici & Güç Kullanıcısı Temizlik Modülü (Dev Clean)
* **Xcode Derin Temizlik:**
  * `DerivedData` klasörü temizliği.
  * Kullanılmayan iOS/watchOS/tvOS simülatörlerinin ve SDK'larının tespiti ve silinmesi.
  * Eski Xcode arşivleri (`.xcarchive`) ve crash log yönetimi.
* **Yazılım Projesi Kalıntı Analizi:**
  * Bilgisayardaki tüm `node_modules`, `.venv`, `target/` (Rust), `vendor/` (Go/PHP) klasörlerinin tespiti.
  * Son 30 gündür dokunulmayan projelere ait bağımlılık klasörlerinin listelenmesi ve toplu silinmesi.
* **Container & Paket Yöneticileri:**
  * **Docker:** Kullanılmayan container, image, volume ve build cache temizliği (`docker system prune` entegrasyonu).
  * **Homebrew:** Eski formül versiyonları ve indirme önbelleği (`brew cleanup`).
  * **PackageManager Cache:** `npm`, `yarn`, `pnpm`, `pip`, `cargo` önbelleklerini temizleme.

---

### 2. 🧹 Akıllı & Tam Kalıntısız Uygulama Kaldırıcı (Smart Uninstaller)
* **Tam Kalıntı Tespiti:** Bir uygulama silindiğinde aşağıdaki dizinlerde bıraktığı izleri otomatik bulur:
  * `~/Library/Application Support/`
  * `~/Library/Caches/` & `~/Library/Preferences/`
  * `~/Library/Saved Application State/`
  * `~/Library/LaunchAgents/` (Arka plan servisleri)
* **Yetim Dosya (Orphaned Files) Bulucu:** Sistemde daha önce silinmiş ama klasörü kalmış eski uygulama artıklarını tarar ve temizler.

---

### 3. 🔍 Gelişmiş Çift & Benzer Dosya Analizörü (Duplicate & Similar Finder)
* **İçerik Tabanlı Hash Analizi:** Dosya adından bağımsız olarak, MD5/SHA-256 hash algoritmaları ile birebir aynı olan dosyaları tespit eder.
* **Benzer Fotoğraf Tespiti:** Seri çekimler, düzenlenmiş kopyalar veya farklı çözünürlükteki aynı görselleri yapay zeka/görsel kıyaslama ile gruplar.
* **Akıllı Seçim (Auto-Select):** Çift dosyalar arasından en yüksek çözünürlüklü veya en yeni olanı koruyup diğerlerini otomatik seçme opsiyonu.

---

### 4. 🗺️ Etkileşimli Disk Haritası (Interactive Treemap Visualizer)
* **Sunburst / Treemap Mimarisi:** Disk alanını iç içe geçen renkli bloklar halinde görselleştirir.
* **Hızlı Gezinme:** Klasörlerin üzerine tıklayarak alt dizinlere anında inme ve doğrudan uygulama içinden silme veya `Finder`'da açma.

---

### 5. 📊 Canlı Menü Çubuğu Uygulaması (Menu Bar Companion)
* **Anlık Sistem Durumu:** Disk doluluk oranı, RAM kullanımı ve CPU yükü.
* **Hızlı Temizlik:** Sistem performansı düştüğünde RAM purge ve geçici önbellek boşaltma.
* **Sürükle-Bırak Silme:** Menü çubuğu ikonuna sürüklenen dosyaları güvenli ve kalıcı olarak silme.

---

### 6. ⚙️ Otomasyon & Kural Motoru (Smart Rules & Automation)
* **Kural Tanımlama:** Örneğin: *"İndirilenler klasöründe 30 günden eski `.dmg` ve `.pkg` dosyalarını otomatik sil."*
* **Büyüme Uyarısı:** Belirli bir klasör (ör. `~/Downloads` veya Docker cache) 20 GB'ı geçtiğinde bildirim gönderme.
* **İstisna Listesi (Whitelist):** Kullanıcının dokunulmasını istemediği kritik klasörleri tarama dışı bırakma.

---

## 🛡️ Güvenlik & Mimari Yaklaşım

1. **SIP (System Integrity Protection) Uyumluluğu:** macOS çekirdek dosyalarına asla müdahale edilmez.
2. **Çöp Kutusu Güvencesi (Safe Delete):** Varsayılan olarak silinen dosyalar kalıcı olarak silinmek yerine macOS Çöp Kutusu'na gönderilir.
3. **Sandbox & Full Disk Access:** Kullanıcıdan şeffaf bir şekilde izin alınarak tarama gerçekleştirilir.
4. **Çoklu İş parçacığı (Multi-threading):** Büyük disk taramaları arka planda non-blocking olarak çalışır, arayüzü dondurmaz.
