/**
 * duplicates.js - Duplicate and Similar File Finder Controller
 */

const DuplicatesView = {
  scanResult: null,
  customFolders: [],

  init() {
    this.bindEvents();
  },

  bindEvents() {
    document.getElementById('btnStartDuplicateScan')?.addEventListener('click', () => {
      this.startScan();
    });

    document.getElementById('btnAddCustomDupFolder')?.addEventListener('click', async () => {
      const folder = await App.pickFolder('Çift Dosya Taranacak Klasörü Seçin');
      if (folder && !this.customFolders.includes(folder)) {
        this.customFolders.push(folder);
        this.renderCustomFolders();
      }
    });

    document.getElementById('dupSmartSelectDropdown')?.addEventListener('change', (e) => {
      this.applySmartSelect(e.target.value);
    });

    document.getElementById('btnDeleteSelectedDuplicates')?.addEventListener('click', () => {
      this.deleteSelectedDuplicates();
    });
  },

  renderCustomFolders() {
    const container = document.getElementById('dupCustomFoldersList');
    if (!container) return;
    container.innerHTML = '';

    this.customFolders.forEach(folder => {
      const badge = document.createElement('span');
      badge.className = 'badge-tag';
      badge.style.cssText = 'background:rgba(56,189,248,0.12); color:var(--accent-cyan); display:inline-flex; align-items:center; gap:6px; padding:4px 10px;';
      badge.innerHTML = `<span>${folder}</span><button data-folder="${folder}" style="background:none;border:none;color:inherit;cursor:pointer;font-weight:bold;">×</button>`;
      badge.querySelector('button').addEventListener('click', () => {
        this.customFolders = this.customFolders.filter(f => f !== folder);
        this.renderCustomFolders();
      });
      container.appendChild(badge);
    });
  },

  async startScan() {
    const scanBtn = document.getElementById('btnStartDuplicateScan');
    const container = document.getElementById('duplicateGroupsContainer');
    const resultsBar = document.getElementById('dupResultsBar');

    const scanDownloads = document.getElementById('dupScanDownloads')?.checked;
    const scanDocs = document.getElementById('dupScanDocs')?.checked;
    const scanPics = document.getElementById('dupScanPics')?.checked;
    const scanDesktop = document.getElementById('dupScanDesktop')?.checked;
    const findSimilar = document.getElementById('dupFindSimilarPhotos')?.checked;

    const targetDirs = [...this.customFolders];
    if (scanDownloads) targetDirs.push('~/Downloads');
    if (scanDocs) targetDirs.push('~/Documents');
    if (scanPics) targetDirs.push('~/Pictures');
    if (scanDesktop) targetDirs.push('~/Desktop');

    if (targetDirs.length === 0) {
      App.showToast('Lütfen taranacak en az bir klasör seçin.', 'info');
      return;
    }

    if (scanBtn) {
      scanBtn.disabled = true;
      scanBtn.innerHTML = `<div class="spinner" style="width:14px; height:14px; border-width:2px;"></div> Taranıyor...`;
    }

    container.innerHTML = `
      <div class="empty-state">
        <div class="spinner"></div>
        <h3 style="margin-top: 14px;">Dosyalar ve Hash Değerleri Taranıyor...</h3>
        <p>1. Aşama: Boyut gruplama · 2. Aşama: 64KB partial hash · 3. Aşama: Tam SHA-256 doğrulama</p>
      </div>
    `;

    try {
      const res = await fetch('/api/duplicates/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDirs, findSimilarImages: findSimilar })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Tarama başarısız');

      this.scanResult = json.data;
      this.renderDuplicates(json.data);

      if (resultsBar) resultsBar.style.display = 'flex';
      App.showToast(`Tarama bitti! ${json.data.groupsCount} çift grup bulundu.`, 'success');
    } catch (e) {
      App.showToast('Hata: ' + e.message, 'error');
      container.innerHTML = `<div class="empty-state"><p style="color:var(--accent-rose);">Hata: ${e.message}</p></div>`;
    } finally {
      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> Taramayı Başlat`;
      }
    }
  },

  renderDuplicates(data) {
    const container = document.getElementById('duplicateGroupsContainer');
    const wastedEl = document.getElementById('dupWastedSpace');
    const groupCountEl = document.getElementById('dupGroupCount');

    if (wastedEl) wastedEl.textContent = data.formattedWastedTotal;
    if (groupCountEl) groupCountEl.textContent = `${data.groupsCount}`;

    if (!container) return;
    container.innerHTML = '';

    const hasExact = data.groups && data.groups.length > 0;
    const hasSimilar = data.similarPhotos && data.similarPhotos.length > 0;

    if (!hasExact && !hasSimilar) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${window.Icons ? window.Icons.svg('sparkles', 36) : ''}</div>
          <h3>Hiç çift veya benzer dosya bulunamadı!</h3>
          <p>Taranan ${data.scannedFilesCount || 0} dosya tamamen benzersiz ve temiz durumda.</p>
        </div>
      `;
      return;
    }

    data.groups.forEach((group, gIdx) => {
      const groupCard = document.createElement('div');
      groupCard.className = 'card';
      groupCard.style.marginBottom = '16px';

      let filesHtml = '';
      group.files.forEach((file, fIdx) => {
        const isOriginal = file.isOriginal;
        const dateStr = new Date(file.mtime).toLocaleString('tr-TR');
        const badge = isOriginal
          ? `<span class="badge-tag tag-success">Orijinal</span>`
          : `<span class="badge-tag tag-warning">Kopya</span>`;

        filesHtml += `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
            <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
              <input type="checkbox" class="custom-checkbox dup-file-checkbox" 
                     data-path="${file.path}" 
                     data-group="${group.groupId}" 
                     data-mtime="${new Date(file.mtime).getTime()}"
                     ${!isOriginal ? 'checked' : ''}>
              <div style="min-width:0;">
                <div style="font-weight:600; font-size:13px; color:var(--text-main); display:flex; align-items:center; gap:8px;">
                  ${file.name} ${badge}
                </div>
                <div style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  ${file.path}
                </div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:16px;">
              <span style="font-size:12px; color:var(--text-dim);">${dateStr}</span>
              <button class="btn btn-secondary btn-sm btn-finder-reveal" data-path="${file.path}">Finder</button>
            </div>
          </div>
        `;
      });

      groupCard.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid var(--border-subtle); padding-bottom:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="display:inline-flex; align-items:center; color:var(--accent-cyan);">${window.Icons ? window.Icons.svg('copy', 16) : ''}</span>
            <strong style="font-size:13.5px;">Grup #${gIdx + 1} (${group.files.length} Dosya)</strong>
            <span class="badge-tag" style="background:rgba(255,255,255,0.06); font-family:var(--font-mono); font-size:11px;">Hash: ${group.hash.substring(0, 8)}...</span>
          </div>
          <div>
            <span style="font-size:12px; color:var(--text-muted);">Boşa Harcanan: </span>
            <span class="size-pill">${group.formattedWasted}</span>
          </div>
        </div>
        <div>
          ${filesHtml}
        </div>
      `;

      container.appendChild(groupCard);
    });

    // Render Similar Photo Groups if present
    if (data.similarPhotos && data.similarPhotos.length > 0) {
      const simHeader = document.createElement('h3');
      simHeader.style.cssText = 'font-size:14.5px; margin:20px 0 12px; color:var(--accent-purple);';
      simHeader.textContent = `Benzer Fotoğraf Grupları (${data.similarPhotos.length} Grup)`;
      container.appendChild(simHeader);

      data.similarPhotos.forEach((simGroup, sIdx) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.style.marginBottom = '14px';

        let rows = '';
        simGroup.files.forEach((file, fIdx) => {
          const dateStr = new Date(file.mtime).toLocaleString('tr-TR');
          rows += `
            <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.04);">
              <div style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
                <input type="checkbox" class="custom-checkbox dup-file-checkbox"
                       data-path="${file.path}"
                       data-group="${simGroup.groupId}"
                       data-mtime="${new Date(file.mtime).getTime()}"
                       ${fIdx > 0 ? 'checked' : ''}>
                <div style="min-width:0;">
                  <div style="font-weight:600; font-size:13px; color:var(--text-main);">
                    ${file.name} <span class="size-pill" style="margin-left:6px;">${file.formattedSize}</span>
                  </div>
                  <div style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${file.path}
                  </div>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:12px;">
                <span style="font-size:12px; color:var(--text-dim);">${dateStr}</span>
                <button class="btn btn-secondary btn-sm btn-finder-reveal" data-path="${file.path}">Finder</button>
              </div>
            </div>
          `;
        });

        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid var(--border-subtle); padding-bottom:6px;">
            <strong style="font-size:13px; color:var(--accent-purple);">Benzer Görsel Grubu #${sIdx + 1} (${simGroup.files.length} Görsel)</strong>
            <span class="badge-tag tag-warning">Algısal Eşleşme (${simGroup.fingerprint})</span>
          </div>
          <div>${rows}</div>
        `;
        container.appendChild(card);
      });
    }

    // Bind finder reveal
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

  applySmartSelect(mode) {
    if (!this.scanResult?.groups) return;

    this.scanResult.groups.forEach(group => {
      const checkboxes = Array.from(document.querySelectorAll(`.dup-file-checkbox[data-group="${group.groupId}"]`));
      if (checkboxes.length <= 1) return;

      if (mode === 'duplicates') {
        // Keep first, check rest
        checkboxes.forEach((cb, idx) => cb.checked = idx > 0);
      } else if (mode === 'newest') {
        // Keep newest (latest mtime), check older
        let maxTime = -1;
        let newestCb = null;
        checkboxes.forEach(cb => {
          const t = parseInt(cb.getAttribute('data-mtime'), 10);
          if (t > maxTime) {
            maxTime = t;
            newestCb = cb;
          }
        });
        checkboxes.forEach(cb => cb.checked = cb !== newestCb);
      } else if (mode === 'oldest') {
        // Keep oldest (lowest mtime), check newer
        let minTime = Infinity;
        let oldestCb = null;
        checkboxes.forEach(cb => {
          const t = parseInt(cb.getAttribute('data-mtime'), 10);
          if (t < minTime) {
            minTime = t;
            oldestCb = cb;
          }
        });
        checkboxes.forEach(cb => cb.checked = cb !== oldestCb);
      }
    });

    App.showToast('Akıllı seçim kuralı uygulandı.', 'info');
  },

  async deleteSelectedDuplicates() {
    const selected = Array.from(document.querySelectorAll('.dup-file-checkbox:checked')).map(cb => cb.getAttribute('data-path'));
    if (selected.length === 0) {
      App.showToast(I18n.currentLang === 'tr' ? 'Lütfen silinecek çift dosyaları seçin.' : 'Please select duplicate files to delete.', 'info');
      return;
    }

    const ok = await Modal.confirm({
      title: I18n.currentLang === 'tr' ? 'Çift Dosyaları Sil' : 'Delete Duplicate Files',
      message: I18n.currentLang === 'tr'
        ? `Seçilen ${selected.length} adet çift dosya macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`
        : `Selected ${selected.length} duplicate files will be moved to macOS Trash. Do you confirm?`,
      confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
      cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
      isDanger: true
    });
    if (!ok) return;

    App.showToast('Dosyalar Çöp Kutusu\'na taşınıyor...', 'info');
    try {
      const res = await fetch('/api/duplicates/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePaths: selected })
      });
      const json = await res.json();
      if (json.success) {
        App.showToast('Seçili kopyalar başarıyla Çöp Kutusu\'na taşındı!', 'success');
        this.startScan();
        App.loadSystemStats(false);
      } else {
        App.showToast('Hata: ' + json.error, 'error');
      }
    } catch (e) {
      App.showToast('Hata: ' + e.message, 'error');
    }
  }
};
