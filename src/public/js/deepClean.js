/**
 * deepClean.js - Frontend controller for Deep System & User Clean
 */

const DeepCleanView = {
  cachesData: null,
  logsData: null,
  attachmentsData: null,
  downloadsData: null,
  largeFilesData: null,

  init() {
    this.bindEvents();
    this.loadAll();
  },

  bindEvents() {
    document.getElementById('btnDeepCleanRefresh')?.addEventListener('click', () => {
      this.loadAll();
    });

    document.getElementById('checkAllDeepCaches')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-deep-cache-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('checkAllDeepLogs')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-deep-log-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('checkAllDeepAttachments')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-deep-attachment-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('checkAllDeepDownloads')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-deep-download-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('checkAllDeepLarge')?.addEventListener('change', (e) => {
      document.querySelectorAll('.check-deep-large-item').forEach(cb => cb.checked = e.target.checked);
    });

    document.getElementById('btnCleanSelectedDeepCaches')?.addEventListener('click', () => {
      this.cleanSelected('.check-deep-cache-item', () => this.loadCaches());
    });

    document.getElementById('btnCleanSelectedDeepLogs')?.addEventListener('click', () => {
      this.cleanSelected('.check-deep-log-item', () => this.loadLogs());
    });

    document.getElementById('btnCleanSelectedAttachments')?.addEventListener('click', () => {
      this.cleanSelected('.check-deep-attachment-item', () => this.loadAttachments());
    });

    document.getElementById('btnCleanSelectedDownloads')?.addEventListener('click', () => {
      this.cleanSelected('.check-deep-download-item', () => this.loadDownloads());
    });

    document.getElementById('btnCleanSelectedLargeFiles')?.addEventListener('click', () => {
      this.cleanSelected('.check-deep-large-item', () => this.loadLargeFiles());
    });

    document.getElementById('selectLargeFileSize')?.addEventListener('change', (e) => {
      this.loadLargeFiles(parseInt(e.target.value, 10));
    });
  },

  async loadAll() {
    await Promise.all([
      this.loadCaches(),
      this.loadLogs(),
      this.loadAttachments(),
      this.loadDownloads(),
      this.loadLargeFiles()
    ]);
  },

  async loadCaches() {
    try {
      const res = await fetch('/api/deep/caches');
      const json = await res.json();
      if (!json.success) return;

      this.cachesData = json.data;
      this.renderCaches(json.data);

      const countBadge = document.getElementById('countDeepCaches');
      if (countBadge) countBadge.textContent = json.data.formattedGrandTotal;
      const dashCardSize = document.getElementById('cardCachesSize');
      if (dashCardSize) dashCardSize.textContent = json.data.formattedGrandTotal;
    } catch (e) {
      console.error('Deep caches load error:', e);
    }
  },

  renderCaches(data) {
    const tbody = document.getElementById('tbodyDeepCaches');
    const totalEl = document.getElementById('deepCachesTotalSize');
    if (totalEl) totalEl.textContent = data.formattedGrandTotal;

    if (!tbody) return;
    tbody.innerHTML = '';

    const allItems = [];
    for (const cat in data.categories) {
      allItems.push(...data.categories[cat].items);
    }

    if (allItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${I18n.t('no_items')}</td></tr>`;
      return;
    }

    const isAllChecked = document.getElementById('checkAllDeepCaches')?.checked ?? true;
    allItems.forEach(item => {
      const tr = document.createElement('tr');
      let icon = window.Icons ? window.Icons.svg('globe', 16) : '';
      if (item.category === 'apps') icon = window.Icons ? window.Icons.svg('music', 16) : '';
      else if (item.category === 'system') icon = window.Icons ? window.Icons.svg('settings', 16) : '';
      else if (item.category === 'dev') icon = window.Icons ? window.Icons.svg('code', 16) : '';

      tr.innerHTML = `
        <td><input type="checkbox" class="custom-checkbox check-deep-cache-item" data-path="${item.path}" ${isAllChecked ? 'checked' : ''}></td>
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan);">${icon}</div>
            <div>
              <div class="item-title">${item.name}</div>
              <div class="item-subtitle">${item.path}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-warning">${item.category}</span></td>
        <td><span class="size-pill">${item.formattedSize}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-finder-reveal" data-path="${item.path}">${I18n.t('btn_finder')}</button>
          <button class="btn btn-secondary btn-sm btn-trash-deep" data-path="${item.path}">${I18n.t('btn_trash')}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.bindSingleTrashButtons();
  },

  async loadLogs() {
    try {
      const res = await fetch('/api/deep/logs');
      const json = await res.json();
      if (!json.success) return;

      this.logsData = json.data;
      this.renderLogs(json.data);

      const countBadge = document.getElementById('countDeepLogs');
      if (countBadge) countBadge.textContent = json.data.formattedTotal;
    } catch (e) {
      console.error('Deep logs load error:', e);
    }
  },

  renderLogs(data) {
    const tbody = document.getElementById('tbodyDeepLogs');
    const totalEl = document.getElementById('deepLogsTotalSize');
    if (totalEl) totalEl.textContent = data.formattedTotal;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">${I18n.t('no_items')}</td></tr>`;
      return;
    }

    const isAllChecked = document.getElementById('checkAllDeepLogs')?.checked ?? true;
    data.items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="custom-checkbox check-deep-log-item" data-path="${item.path}" ${isAllChecked ? 'checked' : ''}></td>
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-amber);">${window.Icons ? window.Icons.svg('fileText', 16) : ''}</div>
            <div>
              <div class="item-title">${item.name}</div>
              <div class="item-subtitle">${item.path}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-warning">Log</span></td>
        <td><span class="size-pill">${item.formattedSize}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-finder-reveal" data-path="${item.path}">${I18n.t('btn_finder')}</button>
          <button class="btn btn-secondary btn-sm btn-trash-deep" data-path="${item.path}">${I18n.t('btn_trash')}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.bindSingleTrashButtons();
  },

  async loadAttachments() {
    try {
      const res = await fetch('/api/deep/attachments');
      const json = await res.json();
      if (!json.success) return;

      this.attachmentsData = json.data;
      this.renderAttachments(json.data);

      const countBadge = document.getElementById('countDeepAttachments');
      if (countBadge) countBadge.textContent = json.data.formattedTotal;
    } catch (e) {
      console.error('Deep attachments load error:', e);
    }
  },

  renderAttachments(data) {
    const tbody = document.getElementById('tbodyDeepAttachments');
    const totalEl = document.getElementById('deepAttachmentsTotalSize');
    if (totalEl) totalEl.textContent = data.formattedTotal;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Mesaj veya Posta eki bulunamadı.</td></tr>`;
      return;
    }

    const isAllChecked = document.getElementById('checkAllDeepAttachments')?.checked ?? true;
    data.items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="custom-checkbox check-deep-attachment-item" data-path="${item.path}" ${isAllChecked ? 'checked' : ''}></td>
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(236, 72, 153, 0.15); color: var(--accent-pink);">${window.Icons ? window.Icons.svg('paperclip', 16) : ''}</div>
            <div>
              <div class="item-title">${item.name}</div>
              <div class="item-subtitle">${item.path}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-warning">Attachment</span></td>
        <td><span class="size-pill">${item.formattedSize}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-finder-reveal" data-path="${item.path}">${I18n.t('btn_finder')}</button>
          <button class="btn btn-secondary btn-sm btn-trash-deep" data-path="${item.path}">${I18n.t('btn_trash')}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.bindSingleTrashButtons();
  },

  async loadDownloads() {
    try {
      const res = await fetch('/api/deep/download-residues');
      const json = await res.json();
      if (!json.success) return;

      this.downloadsData = json.data;
      this.renderDownloads(json.data);

      const countBadge = document.getElementById('countDeepDownloads');
      if (countBadge) countBadge.textContent = json.data.formattedTotal;
    } catch (e) {
      console.error('Deep downloads load error:', e);
    }
  },

  renderDownloads(data) {
    const tbody = document.getElementById('tbodyDeepDownloads');
    const totalEl = document.getElementById('deepDownloadsTotalSize');
    if (totalEl) totalEl.textContent = data.formattedTotal;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Eski kurulum kalıntısı bulunamadı.</td></tr>`;
      return;
    }

    const isAllChecked = document.getElementById('checkAllDeepDownloads')?.checked ?? true;
    data.items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" class="custom-checkbox check-deep-download-item" data-path="${item.path}" ${isAllChecked ? 'checked' : ''}></td>
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(168, 85, 247, 0.15); color: var(--accent-purple);">${window.Icons ? window.Icons.svg('disc', 16) : ''}</div>
            <div>
              <div class="item-title">${item.name}</div>
              <div class="item-subtitle">${item.path}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-warning">${item.ext}</span></td>
        <td><span class="size-pill">${item.formattedSize}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-finder-reveal" data-path="${item.path}">${I18n.t('btn_finder')}</button>
          <button class="btn btn-secondary btn-sm btn-trash-deep" data-path="${item.path}">${I18n.t('btn_trash')}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.bindSingleTrashButtons();
  },

  async loadLargeFiles(minMb = 100) {
    try {
      const res = await fetch(`/api/deep/large-files?minMb=${minMb}`);
      const json = await res.json();
      if (!json.success) return;

      this.largeFilesData = json.data;
      this.renderLargeFiles(json.data);

      const countBadge = document.getElementById('countDeepLarge');
      if (countBadge) countBadge.textContent = `${json.data.totalCount} (${json.data.formattedTotal})`;
    } catch (e) {
      console.error('Deep large files load error:', e);
    }
  },

  renderLargeFiles(data) {
    const tbody = document.getElementById('tbodyDeepLarge');
    const totalEl = document.getElementById('deepLargeTotalSize');
    if (totalEl) totalEl.textContent = data.formattedTotal;

    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Seçili boyuttan büyük dosya bulunamadı.</td></tr>`;
      return;
    }

    data.items.forEach(item => {
      const tr = document.createElement('tr');
      const dateStr = new Date(item.lastModified).toLocaleDateString();

      tr.innerHTML = `
        <td><input type="checkbox" class="custom-checkbox check-deep-large-item" data-path="${item.path}"></td>
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(244, 63, 94, 0.15); color: #fb7185;">${window.Icons ? window.Icons.svg('hardDrive', 16) : ''}</div>
            <div>
              <div class="item-title">${item.name}</div>
              <div class="item-subtitle">${item.path}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-warning">${item.kind}</span></td>
        <td><span class="size-pill">${item.formattedSize}</span></td>
        <td><span style="font-size:12px; color:var(--text-muted);">${item.ageCategory} (${item.daysOld} gün)</span></td>
        <td>
          <button class="btn btn-secondary btn-sm btn-finder-reveal" data-path="${item.path}">${I18n.t('btn_finder')}</button>
          <button class="btn btn-danger btn-sm btn-trash-deep" data-path="${item.path}">${I18n.t('btn_trash')}</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    this.bindSingleTrashButtons();
    document.querySelectorAll('.btn-finder-reveal').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPath = btn.getAttribute('data-path');
        fetch('/api/action/show-in-finder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPath })
        });
      });
    });
  },

  bindSingleTrashButtons() {
    document.querySelectorAll('#view-deep-clean .btn-finder-reveal').forEach(btn => {
      if (btn.dataset.boundFinder) return;
      btn.dataset.boundFinder = '1';
      btn.addEventListener('click', () => {
        const targetPath = btn.getAttribute('data-path');
        fetch('/api/action/show-in-finder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPath })
        });
      });
    });

    document.querySelectorAll('.btn-trash-deep').forEach(btn => {
      if (btn.dataset.boundTrash) return;
      btn.dataset.boundTrash = '1';
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
            App.showToast('Öğe Çöp Kutusu\'na taşındı', 'success');
            this.loadAll();
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

  async cleanSelected(selector, reloadFn) {
    const selected = Array.from(document.querySelectorAll(`${selector}:checked`)).map(cb => cb.getAttribute('data-path'));
    if (selected.length === 0) {
      App.showToast(I18n.currentLang === 'tr' ? 'Lütfen silinecek en az bir öğe seçin.' : 'Please select at least one item.', 'info');
      return;
    }

    const ok = await Modal.confirm({
      title: I18n.currentLang === 'tr' ? 'Seçili Öğeleri Çöp Kutusuna Taşı' : 'Move Selected Items to Trash',
      message: I18n.currentLang === 'tr' 
        ? `Seçili ${selected.length} öğe macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`
        : `Selected ${selected.length} items will be moved to macOS Trash. Do you confirm?`,
      confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
      cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
      isDanger: true
    });
    if (!ok) return;

    App.showToast('Öğeler Çöp Kutusu\'na taşınıyor...', 'info');
    for (const p of selected) {
      await fetch('/api/action/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: p })
      });
    }
    App.showToast('İşlem başarıyla tamamlandı!', 'success');
    if (reloadFn) reloadFn();
    App.loadSystemStats(false);
  }
};
