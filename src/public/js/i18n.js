/**
 * i18n.js - Multi-language Localization Engine (Türkçe & English)
 */

const I18n = {
  currentLang: localStorage.getItem('mac_cleaner_lang') || 'tr',

  translations: {
    tr: {
      app_title: "mac-cleaner — Gelişmiş macOS Depolama & Sistem Yöneticisi",
      brand_pro: "Pro",
      sip_active: "SIP & Safe Trash Aktif",
      btn_purge_ram: "RAM Boşalt",
      btn_quick_scan: "Hızlı Tara",
      btn_full_scan: "Tüm Sistemi Tara",
      nav_system: "Sistem",
      nav_dashboard: "Genel Bakış",
      nav_deep_clean: "Derin Sistem Temizliği",
      nav_dev_clean: "Geliştirici Temizliği",
      nav_uninstaller: "Akıllı Kaldırıcı",
      nav_maintenance: "Bakım & Servisler",
      nav_analysis: "Analiz & Görselleştirme",
      nav_duplicates: "Çift Dosya Analizi",
      nav_treemap: "Disk Haritası",
      nav_automation: "Otomasyon",
      nav_companion: "Menü Çubuğu",
      nav_rules: "Otomasyon & Kurallar",
      nav_safety: "Güvenlik & İstisnalar",
      
      // Dashboard
      dashboard_title: "Sistem Durumu & Genel Bakış",
      dashboard_desc: "Anlık RAM, disk kullanımı ve potansiyel temizlik fırsatları",
      gauge_storage: "Depolama Alanı",
      gauge_ram: "Bellek (RAM)",
      gauge_cpu: "CPU & Yük",
      free_space: "Boş Alan",
      quick_purge: "Hızlı Boşalt",
      storage_breakdown: "Disk Dağılım Kırılımı (Storage Breakdown)",
      legend_dev: "Geliştirici (Xcode, Docker, Node)",
      legend_apps: "Uygulamalar",
      legend_media: "Medya & Görseller",
      legend_docs: "Belgeler & İndirilenler",
      legend_trash: "Çöp Kutusu",
      legend_free: "Boş Alan",
      quick_clean_opportunities: "Hızlı Temizlik Fırsatları",
      btn_inspect: "İncele",
      btn_empty: "Boşalt",
      trash_title: "macOS Çöp Kutusu",
      trash_desc: "Bekleyen silinmiş dosyalar",

      // Deep Clean
      deep_clean_title: "Derin Sistem & Kullanıcı Temizliği",
      deep_clean_desc: "Tarayıcılar, mesaj ekleri, çökme logları, yarım kalan indirmeler ve büyük dosyalar",
      subtab_system_caches: "Kullanıcı & Sistem Önbellekleri",
      subtab_logs: "Sistem & Uygulama Logları",
      subtab_attachments: "Mesaj & E-Posta Ekleri",
      subtab_downloads: "İndirme Kalıntıları & DMG",
      subtab_large_files: "Büyük & Eski Dosyalar",
      btn_clean_selected: "Seçilileri Çöp Kutusuna Taşı",
      btn_refresh: "Yeniden Tara",
      col_item: "Öğe Adı",
      col_category: "Kategori",
      col_size: "Boyut",
      col_path: "Dizin Yolu",
      col_action: "İşlem",
      col_date: "Son Değişiklik",
      btn_trash: "Çöpe At",
      btn_finder: "Finder",
      no_items: "Temizlenecek öğe bulunamadı.",

      // Dev Clean
      dev_title: "Geliştirici & Güç Kullanıcısı Temizliği",
      dev_desc: "Xcode kalıntıları, hareketsiz proje bağımlılıkları ve konteyner önbellekleri",
      subtab_xcode: "Xcode Derin Temizlik",
      subtab_deps: "Proje Bağımlılıkları (node_modules, .venv)",
      subtab_containers: "Docker, Homebrew & Paket Önbellekleri",
      btn_clean_all_derived: "Tüm DerivedData'yı Temizle",
      filter_inactive_30: "Sadece Hareketsiz (>30 gün) Göster",
      search_deps: "Proje veya bağımlılık ara...",
      docker_card_title: "Docker Konteyner & İmaj Temizliği",
      brew_card_title: "Homebrew Temizliği (brew cleanup)",
      btn_run_brew: "brew cleanup Çalıştır",

      // Uninstaller
      uninstaller_title: "Akıllı & Kalıntısız Uygulama Kaldırıcı",
      uninstaller_desc: "Uygulamaları Application Support, Caches, Preferences kalıntılarıyla birlikte temizleyin",
      subtab_apps: "Yüklü Uygulamalar",
      subtab_orphans: "Yetim Kalıntılar (Orphaned Files)",
      search_apps: "Uygulama adı veya bundle id ara...",
      btn_clean_all_orphans: "Tüm Yetim Dosyaları Çöp Kutusuna Gönder",
      col_app: "Uygulama",
      col_version: "Sürüm",
      col_app_size: "Uygulama Boyutu",
      col_leftovers: "Kalıntı Sayısı & Boyutu",
      col_total_size: "Toplam Boyut",
      btn_uninstall: "Kaldır",

      // Duplicates
      dup_title: "Gelişmiş Çift & Benzer Dosya Analizörü",
      dup_desc: "2-Aşamalı Hash (MD5/SHA-256) ve Benzer Fotoğraf Algoritması ile %100 Doğruluk",
      btn_start_scan: "Taramayı Başlat",
      target_folders: "Taranacak Klasörler:",
      find_similar_photos: "Benzer Fotoğrafları da Bul",
      wasted_space: "Boşa Harcanan Alan:",
      smart_select_dup: "Akıllı Seçim: Tüm Kopyaları Seç (Orijinali Koru)",
      smart_select_newest: "En Yeniyi Koru (Eskileri Seç)",
      smart_select_oldest: "En Eskiyi Koru (Yenileri Seç)",

      // Treemap
      treemap_title: "Etkileşimli Disk Haritası (Interactive Treemap)",
      treemap_desc: "Disk alanını bloklar halinde görselleştirin, klasörlere tıklayarak alt dizinleri keşfedin",
      selected_item: "Seçili Öğe",

      // Companion
      companion_title: "Canlı Menü Çubuğu Uygulaması (Menu Bar Companion)",
      companion_desc: "macOS Menü Çubuğundan anlık izleme, hızlı önbellek boşaltma ve sürükle-bırak güvenli silme",
      dropzone_title: "Dosya veya Klasörleri Buraya Sürükleyin",
      dropzone_desc: "Sürüklenen öğelerin boyutları güvenli bir şekilde hesaplanır ve macOS Çöp Kutusu'na gönderilir.",

      // Rules & Safety
      rules_title: "Otomasyon & Akıllı Kural Motoru",
      rules_desc: "Belirlediğiniz kurallara göre otomatik temizlik ve depolama büyüme alarmları",
      btn_test_rules: "Kuralları Şimdi Test Et",
      safety_title: "Güvenlik, SIP & İstisna Listesi (Whitelist)",
      safety_desc: "mac-cleaner güvenlik mimarisi ve taranması yasaklanan özel klasörler",
      whitelist_add: "Listeye Ekle",
      btn_toggle_theme: "Tema Değiştir",
      lang_switch: "Dil: EN",
      maintenance_title: "Sistem Bakımı & Başlangıç Servisleri",
      maintenance_desc: "macOS sistem bakım betikleri, DNS/Font/QuickLook sıfırlama ve LaunchAgents başlangıç servis yönetimi",
      subtab_maint_tasks: "macOS Sistem Bakım Araçları",
      subtab_launch_agents: "Başlangıç & Arka Plan Servisleri (LaunchAgents)",
      process_monitor_title: "Canlı Bellek & CPU Tüketen Süreçler (Process Inspector)",
      btn_select_folder: "Klasör Seç"
    },

    en: {
      app_title: "mac-cleaner — Advanced macOS Storage & System Cleaner",
      brand_pro: "Pro",
      sip_active: "SIP & Safe Trash Active",
      btn_purge_ram: "Purge RAM",
      btn_quick_scan: "Quick Scan",
      btn_full_scan: "Scan Entire System",
      nav_system: "System",
      nav_dashboard: "Dashboard",
      nav_deep_clean: "Deep System Clean",
      nav_dev_clean: "Developer Clean",
      nav_uninstaller: "Smart Uninstaller",
      nav_maintenance: "Maintenance & Services",
      nav_analysis: "Analysis & Visualizer",
      nav_duplicates: "Duplicate Finder",
      nav_treemap: "Disk Treemap",
      nav_automation: "Automation",
      nav_companion: "Menu Bar",
      nav_rules: "Smart Rules",
      nav_safety: "Safety & Whitelist",

      // Dashboard
      dashboard_title: "System Status & Overview",
      dashboard_desc: "Real-time RAM, disk utilization and cleanup opportunities",
      gauge_storage: "Storage Space",
      gauge_ram: "Memory (RAM)",
      gauge_cpu: "CPU & Load",
      free_space: "Free Space",
      quick_purge: "Quick Purge",
      storage_breakdown: "Storage Breakdown",
      legend_dev: "Developer (Xcode, Docker, Node)",
      legend_apps: "Applications",
      legend_media: "Media & Images",
      legend_docs: "Documents & Downloads",
      legend_trash: "Trash",
      legend_free: "Free Space",
      quick_clean_opportunities: "Quick Cleanup Opportunities",
      btn_inspect: "Inspect",
      btn_empty: "Empty",
      trash_title: "macOS Trash",
      trash_desc: "Pending deleted files",

      // Deep Clean
      deep_clean_title: "Deep System & User Clean",
      deep_clean_desc: "Browser caches, message attachments, crash logs, unfinished downloads and large files",
      subtab_system_caches: "User & System Caches",
      subtab_logs: "System & App Logs",
      subtab_attachments: "Mail & Message Attachments",
      subtab_downloads: "Download Residues & DMGs",
      subtab_large_files: "Large & Old Files",
      btn_clean_selected: "Move Selected to Trash",
      btn_refresh: "Rescan",
      col_item: "Item Name",
      col_category: "Category",
      col_size: "Size",
      col_path: "Path",
      col_action: "Action",
      col_date: "Modified Date",
      btn_trash: "Trash",
      btn_finder: "Finder",
      no_items: "No items found to clean.",

      // Dev Clean
      dev_title: "Developer & Power User Clean",
      dev_desc: "Xcode build caches, inactive project dependencies and container stores",
      subtab_xcode: "Xcode Deep Clean",
      subtab_deps: "Project Dependencies (node_modules, .venv)",
      subtab_containers: "Docker, Homebrew & Package Caches",
      btn_clean_all_derived: "Clean All DerivedData",
      filter_inactive_30: "Only Inactive (>30 days)",
      search_deps: "Search project or dependency...",
      docker_card_title: "Docker Container & Image Prune",
      brew_card_title: "Homebrew Cleanup (brew cleanup)",
      btn_run_brew: "Run brew cleanup",

      // Uninstaller
      uninstaller_title: "Smart & Residue-Free Uninstaller",
      uninstaller_desc: "Uninstall applications along with Application Support, Caches and Preferences leftovers",
      subtab_apps: "Installed Applications",
      subtab_orphans: "Orphaned Files",
      search_apps: "Search app name or bundle id...",
      btn_clean_all_orphans: "Move All Orphans to Trash",
      col_app: "Application",
      col_version: "Version",
      col_app_size: "App Size",
      col_leftovers: "Leftovers Count & Size",
      col_total_size: "Total Size",
      btn_uninstall: "Uninstall",

      // Duplicates
      dup_title: "Advanced Duplicate & Similar Finder",
      dup_desc: "2-Stage Hashing (MD5/SHA-256) and Perceptual Photo Matching with 100% Accuracy",
      btn_start_scan: "Start Scan",
      target_folders: "Folders to Scan:",
      find_similar_photos: "Find Similar Photos as well",
      wasted_space: "Wasted Space:",
      smart_select_dup: "Smart Select: All Duplicates (Keep Original)",
      smart_select_newest: "Keep Newest (Select Older)",
      smart_select_oldest: "Keep Oldest (Select Newer)",

      // Treemap
      treemap_title: "Interactive Disk Treemap",
      treemap_desc: "Visualize disk space in nested colored blocks, click folders to drill down",
      selected_item: "Selected Item",

      // Companion
      companion_title: "Live Menu Bar Companion",
      companion_desc: "Instant metrics in macOS Menu Bar, fast cache purging and drag-and-drop safe trash",
      dropzone_title: "Drag & Drop Files or Folders Here",
      dropzone_desc: "Dropped items will be safely analyzed and moved to macOS Trash.",

      // Rules & Safety
      rules_title: "Automation & Smart Rules Engine",
      rules_desc: "Automatic cleanup rules and storage threshold growth alerts",
      btn_test_rules: "Test Rules Now",
      safety_title: "Safety, SIP & Whitelist",
      safety_desc: "mac-cleaner safety architecture and user-protected directory paths",
      whitelist_add: "Add to Whitelist",
      btn_toggle_theme: "Toggle Theme",
      lang_switch: "Lang: TR",
      maintenance_title: "System Maintenance & Startup Services",
      maintenance_desc: "macOS maintenance scripts, DNS/Font/QuickLook reset and LaunchAgents startup management",
      subtab_maint_tasks: "macOS Maintenance Toolkit",
      subtab_launch_agents: "Startup & Background Services (LaunchAgents)",
      process_monitor_title: "Live Memory & CPU Processes (Process Inspector)",
      btn_select_folder: "Select Folder"
    }
  },

  t(key) {
    const lang = this.translations[this.currentLang] || this.translations.tr;
    return lang[key] || key;
  },

  setLanguage(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('mac_cleaner_lang', lang);
      this.applyTranslations();
    }
  },

  toggleLanguage() {
    const newLang = this.currentLang === 'tr' ? 'en' : 'tr';
    this.setLanguage(newLang);
  },

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = this.t(key);
      if (translation) {
        if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
          el.placeholder = translation;
        } else {
          el.textContent = translation;
        }
      }
    });

    const langBtn = document.getElementById('btnLangToggle');
    if (langBtn) {
      const globeIcon = window.Icons ? window.Icons.svg('globe', 13) : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
      langBtn.innerHTML = `${globeIcon} <span style="margin-left: 4px; font-weight: 600;">${this.currentLang === 'tr' ? 'EN' : 'TR'}</span>`;
      langBtn.title = this.currentLang === 'tr' ? 'Switch to English' : 'Türkçe\'ye Geç';
    }
  }
};
