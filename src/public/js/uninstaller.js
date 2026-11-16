/**
 * uninstaller.js - Smart Uninstaller & Orphaned Files Frontend Controller
 */

const UninstallerView = {
  appsData: null,
  orphansData: null,
  inspectedApp: null,

  init() {
    this.bindEvents();
    this.loadApps();
    this.loadOrphans();
  },

  bindEvents() {
    document.getElementById('btnUninstallerRefresh')?.addEventListener('click', () => {
      this.loadApps();
      this.loadOrphans();
    });

    document.getElementById('searchAppsInput')?.addEventListener('input', (e) => {
      this.filterApps(e.target.value);
    });

    document.getElementById('checkAllOrphans')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-orphan-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('btnCleanAllOrphans')?.addEventListener('click', () => {
      this.cleanSelectedOrphans();
    });

    document.getElementById('btnCloseAppInspector')?.addEventListener('click', () => {
      const el = document.getElementById('appLeftoverInspector');
      if (el) el.style.display = 'none';
    });

    document.getElementById('checkAllAppLeftovers')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-app-leftover-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('btnResetAppLeftovers')?.addEventListener('click', () => {
      this.resetSelectedAppLeftovers();
    });
  },

  async loadApps() {
    try {
      const res = await fetch('/api/uninstaller/apps');
      const json = await res.json();
      if (!json.success) return;

      this.appsData = json.data;
      this.renderApps(json.data.items);

      const countBadge = document.getElementById('countApps');
      const totalSizeEl = document.getElementById('appsTotalSize');
      if (countBadge) countBadge.textContent = `${json.data.totalCount}`;
      if (totalSizeEl) totalSizeEl.textContent = json.data.formattedTotal;
    } catch (e) {
      console.error('Apps load error:', e);
    }
  },

  renderApps(apps) {
    const tbody = document.getElementById('tbodyApps');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (apps.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Yüklü uygulama bulunamadı.</td></tr>`;
      return;
    }

    apps.forEach(app => {
      const tr = document.createElement('tr');
      const hasLeftovers = app.leftoversCount > 0;
      const leftoversTag = hasLeftovers
        ? `<span class="badge-tag tag-warning">${app.leftoversCount} kalıntı (${app.formattedLeftoversSize})</span>`
        : `<span class="badge-tag tag-success">Temiz</span>`;

      const systemBadge = app.isSystemApp ? `<span class="badge-tag" style="background:rgba(255,255,255,0.08); font-size:10px;">Sistem</span>` : '';

      tr.innerHTML = `
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(168, 85, 247, 0.15); color: var(--accent-purple);">${window.Icons ? window.Icons.svg('package', 16) : ''}</div>
            <div>
              <div class="item-title">${app.name} ${systemBadge}</div>
              <div class="item-subtitle">${app.bundleId}</div>
            </div>
          </div>
        </td>
        <td><span style="font-family: var(--font-mono); font-size:12px;">v${app.version}</span></td>
        <td><span class="size-pill">${app.formattedAppSize}</span></td>
        <td>${leftoversTag}</td>
        <td><strong style="color:var(--text-main); font-family:var(--font-mono);">${app.formattedTotalSize}</strong></td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            ${hasLeftovers
              ? `<button class="btn btn-secondary btn-sm btn-inspect-app" data-id="${app.id}" title="Kalıntıları İncele / Uygulamayı Sıfırla">Detay & Sıfırla</button>`
              : ''
            }
            ${app.isSystemApp 
              ? '<span style="font-size:11.5px; color:var(--text-dim);">Korumalı</span>' 
              : `<button class="btn btn-danger btn-sm btn-uninstall-app" data-id="${app.id}">Kaldır</button>`
            }
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind inspect & reset action
    document.querySelectorAll('.btn-inspect-app').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = btn.getAttribute('data-id');
        const targetApp = this.appsData.items.find(a => a.id === appId);
        if (targetApp) this.openAppInspector(targetApp);
      });
    });

    // Bind uninstall action
    document.querySelectorAll('.btn-uninstall-app').forEach(btn => {
      btn.addEventListener('click', async () => {
        const appId = btn.getAttribute('data-id');
        const targetApp = this.appsData.items.find(a => a.id === appId);
        const ok = await Modal.confirm({
          title: I18n.currentLang === 'tr' ? 'Uygulamayı Kaldır' : 'Uninstall Application',
          message: I18n.currentLang === 'tr'
            ? `'${targetApp.name}' ve tespit edilen ${targetApp.leftoversCount} adet artık dosyası (${targetApp.formattedTotalSize}) macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`
            : `'${targetApp.name}' and ${targetApp.leftoversCount} leftover files (${targetApp.formattedTotalSize}) will be moved to macOS Trash. Do you confirm?`,
          confirmText: I18n.currentLang === 'tr' ? 'Kaldır ve Çöpe At' : 'Uninstall & Trash',
          cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
          isDanger: true
        });
        if (!ok) return;

        App.showToast(`${targetApp.name} kaldırılıyor...`, 'info');
        try {
          const leftoverPaths = targetApp.leftovers.map(l => l.path);
          const res = await fetch('/api/uninstaller/uninstall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appPath: targetApp.path,
              leftoverPaths
            })
          });
          const j = await res.json();
          if (j.success) {
            App.showToast(`${targetApp.name} tamamen Çöp Kutusu'na taşındı!`, 'success');
            this.loadApps();
            App.loadSystemStats(false);
          } else {
            App.showToast(j.error || 'Uygulama silinemedi', 'error');
          }
        } catch (e) {
          App.showToast('Hata: ' + e.message, 'error');
        }
      });
    });
  },

  openAppInspector(app) {
    this.inspectedApp = app;
    const drawer = document.getElementById('appLeftoverInspector');
    const titleEl = document.getElementById('appInspectorTitle');
    const tbody = document.getElementById('tbodyAppLeftovers');
    if (!drawer || !tbody) return;

    titleEl.textContent = `${app.name} — Kalıntı & Önbellek Dosyaları (${app.leftoversCount} Öğe · ${app.formattedLeftoversSize})`;
    tbody.innerHTML = '';

    app.leftovers.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="custom-checkbox check-app-leftover-item" data-path="${item.path}" checked></td>
        <td><strong>${item.name}</strong></td>
        <td><span class="badge-tag tag-warning">${item.type}</span></td>
        <td><span class="size-pill">${item.formattedSize}</span></td>
        <td><span class="item-subtitle">${item.path}</span></td>
      `;
      tbody.appendChild(tr);
    });

    drawer.style.display = 'block';
    drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  async resetSelectedAppLeftovers() {
    if (!this.inspectedApp) return;
    const selected = Array.from(document.querySelectorAll('.check-app-leftover-item:checked')).map(cb => cb.getAttribute('data-path'));
    if (selected.length === 0) {
      App.showToast('Lütfen sıfırlanacak en az bir kalıntı dosyası seçin.', 'info');
      return;
    }

    const ok = await Modal.confirm({
      title: `${this.inspectedApp.name} — Uygulama Sıfırlama (App Reset)`,
      message: `'${this.inspectedApp.name}' uygulaması SİLİNMEYECEK; yalnızca seçtiğiniz ${selected.length} adet önbellek/kalıntı dosyası macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`,
      confirmText: 'Seçili Kalıntıları Temizle',
      cancelText: 'Vazgeç',
      isDanger: true
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/uninstaller/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appPath: null,
          leftoverPaths: selected
        })
      });
      const j = await res.json();
      if (j.success) {
        App.showToast(`${this.inspectedApp.name} önbellek ve kalıntıları temizlendi!`, 'success');
        document.getElementById('appLeftoverInspector').style.display = 'none';
        this.loadApps();
        App.loadSystemStats(false);
      } else {
        App.showToast(j.error || 'Kalıntılar temizlenemedi', 'error');
      }
    } catch (e) {
      App.showToast('Hata: ' + e.message, 'error');
    }
  },

  filterApps(query) {
    if (!this.appsData?.items) return;
    const lower = query.toLowerCase();
    const filtered = this.appsData.items.filter(a => {
      return a.name.toLowerCase().includes(lower) || a.bundleId.toLowerCase().includes(lower);
    });
    this.renderApps(filtered);
  },

  async loadOrphans() {
    try {
      const res = await fetch('/api/uninstaller/orphaned');
      const json = await res.json();
      if (!json.success) return;

      this.orphansData = json.data;
      this.renderOrphans(json.data.items);

      const countBadge = document.getElementById('countOrphans');
      const orphansSize = document.getElementById('orphansTotalSize');
      if (countBadge) countBadge.textContent = `${json.data.totalCount}`;
      if (orphansSize) orphansSize.textContent = json.data.formattedTotal;
    } catch (e) {
      console.error('Orphans load error:', e);
    }
  },

  renderOrphans(orphans) {
    const tbody = document.getElementById('tbodyOrphans');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (orphans.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Harika! Sistemde hiç yetim kalıntı dosyası bulunamadı.</td></tr>`;
      return;
    }

    orphans.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="custom-checkbox check-orphan-item" data-path="${item.path}"></td>
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(244, 63, 94, 0.15); color: #fb7185;">${window.Icons ? window.Icons.svg('ghost', 16) : ''}</div>
            <div>
              <div class="item-title">${item.name}</div>
              <div class="item-subtitle">Eski silinmiş uygulama artığı</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-warning">${item.type}</span></td>
        <td><span class="size-pill">${item.formattedSize}</span></td>
        <td><span class="item-subtitle">${item.path}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-trash-single" data-path="${item.path}">Çöpe At</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('#tbodyOrphans .btn-trash-single').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetPath = btn.getAttribute('data-path');
        if (!targetPath) return;

        const ok = await Modal.confirm({
          title: I18n.currentLang === 'tr' ? 'Yetim Dosyayı Sil' : 'Delete Orphaned File',
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
            App.showToast('Yetim dosya Çöp Kutusu\'na taşındı', 'success');
            this.loadOrphans();
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

  async cleanSelectedOrphans() {
    const selected = Array.from(document.querySelectorAll('.check-orphan-item:checked')).map(cb => cb.getAttribute('data-path'));
    if (selected.length === 0) {
      App.showToast(I18n.currentLang === 'tr' ? 'Lütfen silinecek yetim dosyaları seçin.' : 'Please select orphaned files to delete.', 'info');
      return;
    }

    const ok = await Modal.confirm({
      title: I18n.currentLang === 'tr' ? 'Yetim Kalıntıları Temizle' : 'Clean Orphaned Files',
      message: I18n.currentLang === 'tr'
        ? `Seçili ${selected.length} yetim dosya/klasör macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`
        : `Selected ${selected.length} orphaned files/folders will be moved to macOS Trash. Do you confirm?`,
      confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
      cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
      isDanger: true
    });
    if (!ok) return;

    App.showToast('Yetim dosyalar taşınıyor...', 'info');
    for (const p of selected) {
      await fetch('/api/action/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: p })
      });
    }
    App.showToast('Yetim dosyalar temizlendi!', 'success');
    this.loadOrphans();
    App.loadSystemStats(false);
  }
};
