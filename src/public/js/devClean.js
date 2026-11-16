/**
 * devClean.js - Developer & Power User Deep Clean Frontend Controller
 */

const DevCleanView = {
  xcodeData: null,
  depsData: null,
  containersData: null,

  init() {
    this.bindEvents();
    this.loadXcode();
    this.loadDependencies();
    this.loadContainers();
  },

  bindEvents() {
    document.getElementById('btnDevRefresh')?.addEventListener('click', () => {
      this.loadXcode();
      this.loadDependencies();
      this.loadContainers();
    });

    document.getElementById('btnCleanAllDerivedData')?.addEventListener('click', () => {
      this.cleanAllDerivedData();
    });

    document.getElementById('btnCleanSelectedDerivedData')?.addEventListener('click', () => {
      this.cleanSelectedDerivedData();
    });

    document.getElementById('btnSelectCustomDepFolder')?.addEventListener('click', async () => {
      const folder = await App.pickFolder('Taranacak Proje Klasörünü Seçin');
      if (folder) {
        this.loadDependencies(folder);
      }
    });

    document.getElementById('checkAllDerived')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-derived-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('checkAllDeps')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-dep-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('searchDepsInput')?.addEventListener('input', (e) => {
      this.filterDependencies();
    });

    document.getElementById('filterInactive30Days')?.addEventListener('change', () => {
      this.filterDependencies();
    });

    document.getElementById('btnDeleteSelectedDeps')?.addEventListener('click', () => {
      this.deleteSelectedDependencies();
    });

    document.getElementById('btnPruneDocker')?.addEventListener('click', () => {
      this.pruneDocker();
    });

    document.getElementById('btnCleanupBrew')?.addEventListener('click', () => {
      this.cleanupBrew();
    });
  },

  async loadXcode() {
    try {
      const res = await fetch('/api/dev/xcode');
      const json = await res.json();
      if (!json.success) return;

      this.xcodeData = json.data;
      this.renderXcode(json.data);
    } catch (e) {
      console.error('Xcode load error:', e);
    }
  },

  renderXcode(data) {
    const totalEl = document.getElementById('xcodeTotalReclaimable');
    const countBadge = document.getElementById('countXcode');
    const tbody = document.getElementById('tbodyDerivedData');
    const cardSummary = document.getElementById('cardXcodeDerivedSummary');
    const cardSize = document.getElementById('cardXcodeDerivedSize');

    if (totalEl) totalEl.textContent = data.formattedTotal;
    if (countBadge) countBadge.textContent = `${data.derivedData.items.length}`;
    if (cardSummary) cardSummary.textContent = `${data.derivedData.items.length} proje önbelleği mevcut`;
    if (cardSize) cardSize.textContent = data.derivedData.formatted;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.derivedData.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">DerivedData klasörü temiz!</td></tr>`;
    } else {
      data.derivedData.items.forEach(item => {
        const tr = document.createElement('tr');
        const dateStr = new Date(item.lastModified).toLocaleDateString('tr-TR');
        tr.innerHTML = `
          <td><input type="checkbox" class="custom-checkbox check-derived-item" data-path="${item.path}"></td>
          <td>
            <div class="item-main-cell">
              <div class="item-icon" style="background: rgba(99, 102, 241, 0.15); color: var(--accent-indigo);">${window.Icons ? window.Icons.svg('hammer', 16) : ''}</div>
              <div>
                <div class="item-title">${item.name}</div>
                <div class="item-subtitle">${item.path}</div>
              </div>
            </div>
          </td>
          <td><span class="size-pill">${item.formattedSize}</span></td>
          <td>${dateStr}</td>
          <td>
            <button class="btn btn-secondary btn-sm btn-trash-single" data-path="${item.path}">Çöpe At</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Render other Xcode cards (Simulators, Archives & Crash Logs)
    const otherCards = document.getElementById('xcodeOtherCards');
    if (otherCards) {
      const archivesPath = data.archives?.items?.[0]?.path
        ? data.archives.items[0].path.split('/').slice(0, -1).join('/')
        : '';
      otherCards.innerHTML = `
        <div class="card">
          <div class="card-title">${window.Icons ? window.Icons.svg('smartphone', 16) : ''} iOS/watchOS Simülatörleri</div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
            ${data.simulators.items[0]?.name || 'Simülatör önbelleği'}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="size-pill">${data.simulators.formatted}</span>
            <button class="btn btn-secondary btn-sm" id="btnCleanSimulators">Simülatörleri Sıfırla</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title">${window.Icons ? window.Icons.svg('package', 16) : ''} Xcode Arşivleri (.xcarchive)</div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
            ${data.archives?.items?.length ? `${data.archives.items.length} arşiv klasörü tespit edildi` : 'Eski paketlenmiş Xcode arşivleri'}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="size-pill">${data.archives?.formatted || '0 B'}</span>
            <button class="btn btn-secondary btn-sm btn-trash-single" data-path="${archivesPath}" ${!data.archives?.totalBytes ? 'disabled' : ''}>Arşivleri Temizle</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title">${window.Icons ? window.Icons.svg('alert', 16) : ''} Crash Logları & Raporlar</div>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
            DiagnosticReports içinde biriken çökme logları.
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="size-pill">${data.crashLogs.formatted}</span>
            <button class="btn btn-secondary btn-sm btn-trash-single" data-path="${data.crashLogs.items[0]?.path || ''}" ${!data.crashLogs?.totalBytes ? 'disabled' : ''}>Logları Temizle</button>
          </div>
        </div>
      `;

      document.getElementById('btnCleanSimulators')?.addEventListener('click', async () => {
        const ok = await Modal.confirm({
          title: I18n.currentLang === 'tr' ? 'Simülatörleri Sıfırla' : 'Reset Simulators',
          message: I18n.currentLang === 'tr' ? 'Tüm kullanılmayan simülatör önbellekleri sıfırlanacak. Onaylıyor musunuz?' : 'All unused simulator caches will be erased. Do you confirm?',
          confirmText: I18n.currentLang === 'tr' ? 'Sıfırla' : 'Reset',
          cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
          isDanger: true
        });
        if (!ok) return;

        try {
          const res = await fetch('/api/dev/simulators/clean', { method: 'POST' });
          const j = await res.json();
          if (j.success) {
            App.showToast('Simülatörler temizlendi!', 'success');
            this.loadXcode();
          }
        } catch (e) {
          App.showToast('Hata: ' + e.message, 'error');
        }
      });
    }

    // Bind single trash buttons
    document.querySelectorAll('.btn-trash-single').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetPath = btn.getAttribute('data-path');
        if (!targetPath) return;

        const ok = await Modal.confirm({
          title: I18n.currentLang === 'tr' ? 'Çöp Kutusuna Gönder' : 'Move to Trash',
          message: `'${targetPath}' macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`,
          confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
          cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
          isDanger: true
        });
        if (!ok) return;

        try {
          const res = await fetch('/api/action/trash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPath })
          });
          const j = await res.json();
          if (j.success) {
            App.showToast('Çöp Kutusuna taşındı', 'success');
            this.loadXcode();
            App.loadSystemStats(false);
          } else {
            App.showToast(j.error || 'Silinemedi', 'error');
          }
        } catch (e) {
          App.showToast('Hata: ' + e.message, 'error');
        }
      });
    });
  },

  async cleanSelectedDerivedData() {
    const selected = Array.from(document.querySelectorAll('.check-derived-item:checked')).map(cb => cb.getAttribute('data-path'));
    if (selected.length === 0) {
      App.showToast(I18n.currentLang === 'tr' ? 'Lütfen silinecek en az bir DerivedData öğesi seçin.' : 'Please select at least one DerivedData item.', 'info');
      return;
    }

    const ok = await Modal.confirm({
      title: I18n.currentLang === 'tr' ? 'Seçili DerivedData Temizliği' : 'Clean Selected DerivedData',
      message: I18n.currentLang === 'tr'
        ? `Seçili ${selected.length} adet DerivedData klasörü macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`
        : `Selected ${selected.length} DerivedData folders will be moved to macOS Trash. Do you confirm?`,
      confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
      cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
      isDanger: true
    });
    if (!ok) return;

    for (const p of selected) {
      await fetch('/api/action/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: p })
      });
    }
    App.showToast('Seçili DerivedData klasörleri temizlendi!', 'success');
    this.loadXcode();
    App.loadSystemStats(false);
  },

  async cleanAllDerivedData() {
    if (!this.xcodeData?.derivedData?.items?.length) {
      App.showToast(I18n.currentLang === 'tr' ? 'Temizlenecek DerivedData bulunamadı.' : 'No DerivedData found to clean.', 'info');
      return;
    }

    const ok = await Modal.confirm({
      title: I18n.currentLang === 'tr' ? 'DerivedData Temizliği' : 'Clean DerivedData',
      message: I18n.currentLang === 'tr' 
        ? `DerivedData klasöründeki ${this.xcodeData.derivedData.items.length} adet derleme önbelleği (${this.xcodeData.derivedData.formatted}) macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`
        : `All ${this.xcodeData.derivedData.items.length} build caches in DerivedData (${this.xcodeData.derivedData.formatted}) will be moved to macOS Trash. Do you confirm?`,
      confirmText: I18n.currentLang === 'tr' ? 'Tümünü Temizle' : 'Clean All',
      cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
      isDanger: true
    });
    if (!ok) return;

    App.showToast('DerivedData temizleniyor...', 'info');
    for (const item of this.xcodeData.derivedData.items) {
      await fetch('/api/action/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: item.path })
      });
    }
    App.showToast('Tüm DerivedData temizlendi!', 'success');
    this.loadXcode();
    App.loadSystemStats(false);
  },

  async loadDependencies(customRoot = null) {
    try {
      const url = customRoot
        ? `/api/dev/dependencies?roots=${encodeURIComponent(customRoot)}`
        : '/api/dev/dependencies';
      if (customRoot) {
        App.showToast(`'${customRoot}' içindeki bağımlılıklar taranıyor...`, 'info');
      }
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) return;

      this.depsData = json.data;
      this.renderDependencies(json.data.items);

      const countBadge = document.getElementById('countDeps');
      const cardNodeSummary = document.getElementById('cardNodeModulesSummary');
      const cardNodeSize = document.getElementById('cardNodeModulesSize');

      if (countBadge) countBadge.textContent = `${json.data.items.length}`;
      if (cardNodeSummary) cardNodeSummary.textContent = `${json.data.inactiveCount} proje >30 gündür dokunulmamış`;
      if (cardNodeSize) cardNodeSize.textContent = json.data.formattedInactive || json.data.formattedTotal;
    } catch (e) {
      console.error('Deps load error:', e);
    }
  },

  renderDependencies(items) {
    const tbody = document.getElementById('tbodyDeps');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Hiç proje bağımlılık klasörü bulunamadı.</td></tr>`;
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      const inactiveBadge = item.isUntouched30Days
        ? `<span class="badge-tag tag-warning">${item.daysInactive} gün önce</span>`
        : `<span class="badge-tag tag-success">Aktif (${item.daysInactive} gün)</span>`;

      tr.innerHTML = `
        <td><input type="checkbox" class="custom-checkbox check-dep-item" data-path="${item.path}"></td>
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan);">${window.Icons ? window.Icons.svg('folder', 16) : ''}</div>
            <div>
              <div class="item-title">${item.projectName}</div>
              <div class="item-subtitle" style="font-family: var(--font-mono); font-size:11px;">${item.name}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-warning" style="background: rgba(255,255,255,0.06); color:var(--text-main);">${item.type}</span></td>
        <td><span class="size-pill">${item.formattedSize}</span></td>
        <td>${inactiveBadge}</td>
        <td><div class="item-subtitle">${item.parentPath}</div></td>
        <td>
          <button class="btn btn-danger btn-sm btn-trash-dep" data-path="${item.path}">Sil</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-trash-dep').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetPath = btn.getAttribute('data-path');
        const ok = await Modal.confirm({
          title: I18n.currentLang === 'tr' ? 'Proje Bağımlılığını Sil' : 'Delete Project Dependency',
          message: `'${targetPath}' macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`,
          confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
          cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
          isDanger: true
        });
        if (!ok) return;

        try {
          const res = await fetch('/api/action/trash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPath })
          });
          const j = await res.json();
          if (j.success) {
            App.showToast('Klasör Çöp Kutusuna taşındı', 'success');
            this.loadDependencies();
            App.loadSystemStats(false);
          } else {
            App.showToast(j.error || 'Silinemedi', 'error');
          }
        } catch (e) {
          App.showToast('Hata: ' + e.message, 'error');
        }
      });
    });
  },

  filterDependencies() {
    if (!this.depsData?.items) return;
    const query = document.getElementById('searchDepsInput')?.value.toLowerCase() || '';
    const onlyInactive = document.getElementById('filterInactive30Days')?.checked || false;

    const filtered = this.depsData.items.filter(item => {
      const matchQuery = item.projectName.toLowerCase().includes(query) || item.path.toLowerCase().includes(query);
      const matchInactive = !onlyInactive || item.isUntouched30Days;
      return matchQuery && matchInactive;
    });

    this.renderDependencies(filtered);
  },

  async deleteSelectedDependencies() {
    const selected = Array.from(document.querySelectorAll('.check-dep-item:checked')).map(cb => cb.getAttribute('data-path'));
    if (selected.length === 0) {
      App.showToast(I18n.currentLang === 'tr' ? 'Lütfen silinecek en az bir proje klasörü seçin.' : 'Please select at least one folder to delete.', 'info');
      return;
    }

    const ok = await Modal.confirm({
      title: I18n.currentLang === 'tr' ? 'Seçili Bağımlılıkları Sil' : 'Delete Selected Dependencies',
      message: I18n.currentLang === 'tr' 
        ? `Seçili ${selected.length} proje klasörü (node_modules/.venv vb.) macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`
        : `Selected ${selected.length} project dependency folders will be moved to macOS Trash. Do you confirm?`,
      confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
      cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
      isDanger: true
    });
    if (!ok) return;

    App.showToast('Seçililer taşınıyor...', 'info');
    for (const p of selected) {
      await fetch('/api/action/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: p })
      });
    }
    App.showToast('İşlem tamamlandı!', 'success');
    this.loadDependencies();
    App.loadSystemStats(false);
  },

  async loadContainers() {
    try {
      const res = await fetch('/api/dev/containers-packages');
      const json = await res.json();
      if (!json.success) return;

      this.containersData = json.data;
      this.renderContainers(json.data);
    } catch (e) {
      console.error('Containers load error:', e);
    }
  },

  renderContainers(data) {
    const dockerSize = document.getElementById('dockerReclaimableSize');
    const dockerStatus = document.getElementById('dockerStatusText');
    const brewSize = document.getElementById('brewCacheSize');
    const tbodyPM = document.getElementById('tbodyPackageManagers');

    if (dockerSize) dockerSize.textContent = data.docker.formatted;
    if (dockerStatus) {
      dockerStatus.textContent = data.docker.running
        ? `Docker çalışıyor. ${data.docker.details ? data.docker.details.length + ' kategori' : ''} tespit edildi.`
        : (data.docker.error || 'Docker kapalı veya yüklü değil.');
    }

    if (brewSize) brewSize.textContent = data.homebrew.formatted;

    if (tbodyPM) {
      tbodyPM.innerHTML = '';
      if (!data.packageManagers || data.packageManagers.length === 0) {
        tbodyPM.innerHTML = `<tr><td colspan="4" class="empty-state">Paket yöneticisi önbelleği bulunamadı.</td></tr>`;
      } else {
        data.packageManagers.forEach(pm => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>
              <div class="item-main-cell">
                <div class="item-icon" style="background: rgba(168, 85, 247, 0.15); color: var(--accent-purple);">${window.Icons ? window.Icons.svg('package', 16) : ''}</div>
                <div>
                  <div class="item-title">${pm.name}</div>
                  <div class="item-subtitle">${pm.type}</div>
                </div>
              </div>
            </td>
            <td><span style="font-family: var(--font-mono); font-size:12px; color:var(--text-muted);">${pm.path}</span></td>
            <td><span class="size-pill">${pm.formattedSize}</span></td>
            <td>
              <button class="btn btn-secondary btn-sm btn-trash-pm" data-path="${pm.path}">Temizle</button>
            </td>
          `;
          tbodyPM.appendChild(tr);
        });

        document.querySelectorAll('.btn-trash-pm').forEach(btn => {
          btn.addEventListener('click', async () => {
            const targetPath = btn.getAttribute('data-path');
            const ok = await Modal.confirm({
              title: I18n.currentLang === 'tr' ? 'Önbelleği Temizle' : 'Clean Cache',
              message: `'${targetPath}' macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`,
              confirmText: I18n.currentLang === 'tr' ? 'Temizle' : 'Clean',
              cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
              isDanger: true
            });
            if (!ok) return;

            try {
              const res = await fetch('/api/action/trash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetPath })
              });
              const j = await res.json();
              if (j.success) {
                App.showToast('Önbellek temizlendi', 'success');
                this.loadContainers();
                App.loadSystemStats(false);
              }
            } catch (e) {
              App.showToast('Hata: ' + e.message, 'error');
            }
          });
        });
      }
    }
  },

  async pruneDocker() {
    const ok = await Modal.confirm({
      title: 'Docker System Prune',
      message: I18n.currentLang === 'tr' 
        ? 'Docker kullanılmayan tüm imaj, container ve build cache verilerini temizleyecek (docker system prune). Emin misiniz?'
        : 'Docker will prune all unused containers, images, and build caches. Are you sure?',
      confirmText: 'Prune',
      cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
      isDanger: true
    });
    if (!ok) return;

    App.showToast('Docker prune çalıştırılıyor...', 'info');
    try {
      const res = await fetch('/api/dev/docker/prune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: false })
      });
      const j = await res.json();
      if (j.success) {
        App.showToast('Docker başarıyla temizlendi!', 'success');
        this.loadContainers();
      } else {
        App.showToast('Docker temizlenemedi: ' + j.error, 'error');
      }
    } catch (e) {
      App.showToast('Hata: ' + e.message, 'error');
    }
  },

  async cleanupBrew() {
    App.showToast('Homebrew temizliği başlatıldı...', 'info');
    try {
      const res = await fetch('/api/dev/brew/cleanup', { method: 'POST' });
      const j = await res.json();
      if (j.success) {
        App.showToast('Homebrew başarıyla temizlendi!', 'success');
        this.loadContainers();
      } else {
        App.showToast('Homebrew temizleme hatası: ' + j.error, 'error');
      }
    } catch (e) {
      App.showToast('Hata: ' + e.message, 'error');
    }
  }
};
