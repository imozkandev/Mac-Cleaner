/**
 * app.js - Main Application State, Router, Theme & Language Management
 */

const App = {
  activeView: 'dashboard',
  systemStats: null,
  processesData: null,
  processSortBy: 'memory',
  refreshInterval: null,
  currentTheme: localStorage.getItem('mac_cleaner_theme') || 'dark',

  init() {
    this.initTheme();
    this.initLanguage();
    this.bindNavigation();
    this.bindGlobalButtons();
    this.loadSystemStats();
    this.loadStorageBreakdown();
    this.loadProcesses();

    // Auto-refresh metrics every 5 seconds
    this.refreshInterval = setInterval(() => {
      this.loadSystemStats(false);
      if (this.activeView === 'dashboard') {
        this.loadProcesses();
      }
    }, 5000);

    // Initialize all views
    DeepCleanView.init();
    DevCleanView.init();
    UninstallerView.init();
    DuplicatesView.init();
    TreemapView.init();
    CompanionView.init();
    RulesView.init();
    MaintenanceView.init();
  },

  async pickFolder(promptTitle = 'Klasör Yolu Girin') {
    if (window.electronAPI && typeof window.electronAPI.selectFolder === 'function') {
      try {
        const selected = await window.electronAPI.selectFolder();
        if (selected) return selected;
      } catch (e) {}
      return null;
    }
    const val = window.prompt(promptTitle, '~/Downloads');
    return val ? val.trim() : null;
  },

  initTheme() {
    document.body.setAttribute('data-theme', this.currentTheme);
    this.updateThemeButton();

    document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
      this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      document.body.setAttribute('data-theme', this.currentTheme);
      localStorage.setItem('mac_cleaner_theme', this.currentTheme);
      this.updateThemeButton();
      
      // Re-render treemap with theme colors if active
      if (this.activeView === 'treemap') {
        TreemapView.render();
      }
    });
  },

  updateThemeButton() {
    const btn = document.getElementById('btnThemeToggle');
    if (btn) {
      const isDark = this.currentTheme === 'dark';
      btn.innerHTML = isDark
        ? (window.Icons ? window.Icons.svg('moon', 15) : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>')
        : (window.Icons ? window.Icons.svg('sun', 15) : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>');
      btn.title = isDark ? 'Açık Temaya Geç (Light Mode)' : 'Koyu Temaya Geç (Dark Mode)';
    }
  },

  initLanguage() {
    I18n.applyTranslations();

    document.getElementById('btnLangToggle')?.addEventListener('click', () => {
      I18n.toggleLanguage();
    });
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        this.navigateTo(view);

        // Close mobile sidebar if open
        document.getElementById('appSidebar')?.classList.remove('mobile-open');
      });
    });

    // Subtab navigation buttons
    document.querySelectorAll('.subtab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const subtabId = btn.getAttribute('data-subtab');
        const parent = btn.closest('.view-panel') || document;
        
        parent.querySelectorAll('.subtab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        parent.querySelectorAll('.subtab-content').forEach(content => {
          content.style.display = content.id === `subtab-${subtabId}` ? 'block' : 'none';
        });
      });
    });

    // Mobile Hamburger button
    document.getElementById('btnMobileMenu')?.addEventListener('click', () => {
      document.getElementById('appSidebar')?.classList.toggle('mobile-open');
    });
  },

  navigateTo(viewName, targetSubtabId = null) {
    this.activeView = viewName;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-view') === viewName);
    });

    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `view-${viewName}`);
    });

    if (targetSubtabId) {
      const subtabEl = document.getElementById(targetSubtabId);
      if (subtabEl) subtabEl.click();
    }

    if (viewName === 'treemap') {
      TreemapView.onViewActivated();
    }
  },

  bindGlobalButtons() {
    document.getElementById('btnHeaderPurgeRam')?.addEventListener('click', () => this.purgeRam());
    document.getElementById('btnDashboardPurgeRam')?.addEventListener('click', () => this.purgeRam());
    document.getElementById('btnHeaderQuickScan')?.addEventListener('click', () => this.runQuickScan());
    document.getElementById('btnDashboardFullScan')?.addEventListener('click', () => this.runQuickScan());
    document.getElementById('btnEmptyTrash')?.addEventListener('click', () => this.emptyTrash());

    document.getElementById('btnProcSortMem')?.addEventListener('click', (e) => {
      this.processSortBy = 'memory';
      document.getElementById('btnProcSortMem')?.classList.add('active');
      document.getElementById('btnProcSortCpu')?.classList.remove('active');
      this.renderProcesses();
    });

    document.getElementById('btnProcSortCpu')?.addEventListener('click', (e) => {
      this.processSortBy = 'cpu';
      document.getElementById('btnProcSortCpu')?.classList.add('active');
      document.getElementById('btnProcSortMem')?.classList.remove('active');
      this.renderProcesses();
    });

    document.getElementById('btnRefreshProcesses')?.addEventListener('click', () => {
      this.loadProcesses();
    });
  },

  async loadStorageBreakdown(force = false) {
    try {
      const res = await fetch(`/api/system/storage-breakdown${force ? '?force=true' : ''}`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      const cats = json.data.categories;
      const map = [
        { key: 'dev', segId: 'segDev', legId: 'devLegendSize' },
        { key: 'apps', segId: 'segApps', legId: 'appsLegendSize' },
        { key: 'media', segId: 'segMedia', legId: 'mediaLegendSize' },
        { key: 'docs', segId: 'segDocs', legId: 'docsLegendSize' },
        { key: 'trash', segId: 'segTrash', legId: 'trashLegendSize' },
        { key: 'free', segId: 'segFree', legId: 'freeLegendSize' }
      ];

      map.forEach(({ key, segId, legId }) => {
        const c = cats[key];
        if (!c) return;
        const segEl = document.getElementById(segId);
        const legEl = document.getElementById(legId);
        if (segEl) {
          segEl.style.width = `${c.percent}%`;
          segEl.title = `${c.formatted} (${c.percent}%)`;
        }
        if (legEl) {
          legEl.textContent = c.formatted;
        }
      });
    } catch (e) {}
  },

  async loadProcesses() {
    try {
      const res = await fetch('/api/system/processes');
      const json = await res.json();
      if (!json.success || !json.data) return;
      this.processesData = json.data;
      this.renderProcesses();
    } catch (e) {}
  },

  renderProcesses() {
    const tbody = document.getElementById('tbodyProcesses');
    if (!tbody || !this.processesData) return;

    const list = this.processSortBy === 'cpu'
      ? (this.processesData.byCpu || [])
      : (this.processesData.byMemory || []);

    tbody.innerHTML = '';
    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Süreç bilgisi alınamadı.</td></tr>`;
      return;
    }

    list.slice(0, 8).forEach(proc => {
      const tr = document.createElement('tr');
      const cpuBadgeClass = proc.cpuPercent > 50 ? 'tag-danger' : (proc.cpuPercent > 15 ? 'tag-warning' : 'tag-success');
      tr.innerHTML = `
        <td><span style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">${proc.pid}</span></td>
        <td><strong>${proc.name}</strong></td>
        <td><span class="size-pill">${proc.formattedMemory}</span></td>
        <td><span class="badge-tag ${cpuBadgeClass}">${proc.cpuPercent.toFixed(1)}%</span></td>
        <td>
          <button class="btn btn-danger btn-sm btn-kill-proc" data-pid="${proc.pid}" data-name="${proc.name}">Sonlandır</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-kill-proc').forEach(btn => {
      btn.addEventListener('click', async () => {
        const pid = btn.getAttribute('data-pid');
        const name = btn.getAttribute('data-name');
        const ok = await Modal.confirm({
          title: 'Süreci Sonlandır',
          message: `'${name}' (PID: ${pid}) süreci sonlandırılacak. Kaydedilmemiş veriler kaybolabilir. Onaylıyor musunuz?`,
          confirmText: 'Sonlandır',
          cancelText: 'Vazgeç',
          isDanger: true
        });
        if (!ok) return;

        try {
          const res = await fetch('/api/system/processes/kill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pid })
          });
          const j = await res.json();
          if (j.success) {
            this.showToast(`'${name}' sonlandırıldı.`, 'success');
            this.loadProcesses();
            this.loadSystemStats(false);
          } else {
            this.showToast(j.error || 'Süreç sonlandırılamadı', 'error');
          }
        } catch (e) {
          this.showToast('Hata: ' + e.message, 'error');
        }
      });
    });
  },

  async loadSystemStats(showToastOnFailure = true) {
    try {
      const res = await fetch('/api/system/stats');
      const data = await res.json();
      if (!data.success) return;

      this.systemStats = data;
      this.updateGauges(data);
      this.updateSystemInfo(data.systemInfo, data.trash);
    } catch (err) {
      if (showToastOnFailure) {
        console.error('Failed to load system stats:', err);
      }
    }
  },

  updateGauges(data) {
    const { memory, disk, systemInfo } = data;

    // Disk Gauge
    const diskCircle = document.getElementById('gaugeDiskCircle');
    const diskVal = document.getElementById('gaugeDiskVal');
    const diskSub = document.getElementById('gaugeDiskSubtext');
    const diskFree = document.getElementById('gaugeDiskFree');

    if (disk && diskCircle) {
      const offset = 251.2 - (251.2 * disk.usagePercent) / 100;
      diskCircle.style.strokeDashoffset = offset;
      diskVal.textContent = `${disk.usagePercent}%`;
      diskSub.textContent = `${disk.formatted.used} / ${disk.formatted.total}`;
      diskFree.textContent = `${disk.formatted.available} ${I18n.t('free_space')}`;
    }

    // RAM Gauge
    const ramCircle = document.getElementById('gaugeRamCircle');
    const ramVal = document.getElementById('gaugeRamVal');
    const ramSub = document.getElementById('gaugeRamSubtext');

    if (memory && ramCircle) {
      const offset = 251.2 - (251.2 * memory.usagePercent) / 100;
      ramCircle.style.strokeDashoffset = offset;
      ramVal.textContent = `${memory.usagePercent}%`;
      ramSub.textContent = `${memory.formatted.used} / ${memory.formatted.total}`;
    }

    // CPU Gauge
    const cpuCircle = document.getElementById('gaugeCpuCircle');
    const cpuVal = document.getElementById('gaugeCpuVal');
    const cpuSub = document.getElementById('gaugeCpuSubtext');
    const cpuCores = document.getElementById('gaugeCpuCores');

    if (systemInfo && cpuCircle) {
      const load = parseFloat(systemInfo.loadAverage[0]) || 1.2;
      const cpuPercent = Math.min(100, Math.round((load / systemInfo.cpuCores) * 100));
      const offset = 251.2 - (251.2 * cpuPercent) / 100;
      cpuCircle.style.strokeDashoffset = offset;
      cpuVal.textContent = `${cpuPercent}%`;
      cpuSub.textContent = systemInfo.macModel || 'Apple Silicon';
      cpuCores.textContent = `${systemInfo.cpuCores} Cores · Load: ${systemInfo.loadAverage[0]}`;
    }
  },

  updateSystemInfo(sysInfo, trash) {
    if (sysInfo) {
      const macModelEl = document.getElementById('sidebarMacModel');
      const osVerEl = document.getElementById('sidebarOsVersion');
      if (macModelEl) macModelEl.textContent = sysInfo.macModel || 'Mac';
      if (osVerEl) osVerEl.textContent = sysInfo.osVersion || 'macOS';
    }

    if (trash) {
      const trashCardSize = document.getElementById('cardTrashSize');
      const trashLegend = document.getElementById('trashLegendSize');
      if (trashCardSize) trashCardSize.textContent = trash.formattedSize;
      if (trashLegend) trashLegend.textContent = trash.formattedSize;
    }
  },

  async purgeRam() {
    this.showToast('RAM purge started...', 'info');
    try {
      const res = await fetch('/api/system/purge-ram', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Success! ${data.freedFormatted || 'Inactive memory'} freed.`, 'success');
        this.loadSystemStats(false);
      } else {
        this.showToast('Could not purge RAM: ' + data.error, 'error');
      }
    } catch (err) {
      this.showToast('Error: ' + err.message, 'error');
    }
  },

  async emptyTrash() {
    const ok = await Modal.confirm({
      title: I18n.currentLang === 'tr' ? 'Çöp Kutusunu Boşalt' : 'Empty macOS Trash',
      message: I18n.currentLang === 'tr' ? 'macOS Çöp Kutusu içindeki tüm dosyalar kalıcı olarak silinecek. Emin misiniz?' : 'All files in macOS Trash will be permanently deleted. Are you sure?',
      confirmText: I18n.currentLang === 'tr' ? 'Çöpü Boşalt' : 'Empty Trash',
      cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
      isDanger: true
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/system/empty-trash', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        this.showToast(I18n.currentLang === 'tr' ? 'Çöp Kutusu başarıyla boşaltıldı.' : 'Trash emptied successfully.', 'success');
        this.loadSystemStats(false);
      } else {
        this.showToast('Failed to empty trash.', 'error');
      }
    } catch (err) {
      this.showToast('Error: ' + err.message, 'error');
    }
  },

  async runQuickScan() {
    this.showToast('Quick scan started...', 'info');
    await Promise.all([
      DeepCleanView.loadAll(),
      DevCleanView.loadXcode(),
      DevCleanView.loadDependencies(),
      UninstallerView.loadApps(),
      this.loadStorageBreakdown(true)
    ]);
    this.showToast('Scan complete! Results ready.', 'success');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = window.Icons ? window.Icons.svg('info', 16) : '';
    if (type === 'success') icon = window.Icons ? window.Icons.svg('checkCircle', 16) : '';
    if (type === 'error') icon = window.Icons ? window.Icons.svg('cross', 16) : '';

    toast.innerHTML = `<span style="display:inline-flex; align-items:center;">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }
};

/**
 * MaintenanceView - macOS Maintenance Scripts & LaunchAgents Startup Manager
 */
const MaintenanceView = {
  agentsData: null,

  init() {
    this.bindEvents();
    this.loadLaunchAgents();
  },

  bindEvents() {
    document.getElementById('btnMaintenanceRefresh')?.addEventListener('click', () => {
      this.loadLaunchAgents();
    });

    document.getElementById('searchLaunchAgentsInput')?.addEventListener('input', (e) => {
      this.filterLaunchAgents(e.target.value);
    });

    document.querySelectorAll('.btn-run-maint').forEach(btn => {
      btn.addEventListener('click', async () => {
        const taskId = btn.getAttribute('data-task');
        if (!taskId) return;

        btn.disabled = true;
        const origText = btn.textContent;
        btn.textContent = 'Çalışıyor...';

        try {
          const res = await fetch('/api/system/maintenance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId })
          });
          const json = await res.json();
          if (json.success) {
            App.showToast(json.message || 'Bakım görevi tamamlandı!', 'success');
            App.loadSystemStats(false);
          } else {
            App.showToast(json.error || 'İşlem başarısız', 'error');
          }
        } catch (e) {
          App.showToast('Hata: ' + e.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = origText;
        }
      });
    });
  },

  async loadLaunchAgents() {
    try {
      const res = await fetch('/api/system/launch-agents');
      const json = await res.json();
      if (!json.success) return;

      this.agentsData = json.data;
      this.renderLaunchAgents(json.data.items);

      const countBadge = document.getElementById('countLaunchAgents');
      const runningEl = document.getElementById('runningLaunchAgentsCount');
      if (countBadge) countBadge.textContent = `${json.data.totalCount}`;
      if (runningEl) runningEl.textContent = `${json.data.runningCount} / ${json.data.totalCount}`;
    } catch (e) {
      console.error('LaunchAgents load error:', e);
    }
  },

  renderLaunchAgents(items) {
    const tbody = document.getElementById('tbodyLaunchAgents');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">3. parti başlangıç servisi (LaunchAgent) bulunamadı.</td></tr>`;
      return;
    }

    items.forEach(item => {
      const tr = document.createElement('tr');
      const statusBadge = item.isRunning
        ? `<span class="badge-tag tag-success">Çalışıyor</span>`
        : `<span class="badge-tag" style="background:rgba(255,255,255,0.06); color:var(--text-muted);">Durduruldu</span>`;

      const toggleAction = item.isRunning ? 'unload' : 'load';
      const toggleLabel = item.isRunning ? 'Durdur' : 'Başlat';

      tr.innerHTML = `
        <td>
          <div class="item-main-cell">
            <div class="item-icon" style="background: rgba(56, 189, 248, 0.15); color: var(--accent-cyan);">${window.Icons ? window.Icons.svg('terminal', 16) : ''}</div>
            <div>
              <div class="item-title">${item.name}</div>
              <div class="item-subtitle">${item.path}</div>
            </div>
          </div>
        </td>
        <td><span class="badge-tag tag-warning">${item.scope}</span></td>
        <td>${statusBadge}</td>
        <td><div class="item-subtitle" style="font-family:var(--font-mono);">${item.program}</div></td>
        <td>
          <div style="display:flex; gap:6px;">
            ${item.canModify
              ? `<button class="btn btn-secondary btn-sm btn-toggle-agent" data-path="${item.path}" data-action="${toggleAction}">${toggleLabel}</button>
                 <button class="btn btn-danger btn-sm btn-trash-agent" data-path="${item.path}">Sil</button>`
              : `<span style="font-size:11px; color:var(--text-dim); align-self:center;">Sistem (Salt Okunur)</span>`
            }
            <button class="btn btn-secondary btn-sm btn-finder-agent" data-path="${item.path}">Finder</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-toggle-agent').forEach(btn => {
      btn.addEventListener('click', async () => {
        const plistPath = btn.getAttribute('data-path');
        const action = btn.getAttribute('data-action');
        try {
          const res = await fetch('/api/system/launch-agents/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plistPath, action })
          });
          const j = await res.json();
          if (j.success) {
            App.showToast(`Servis durumu güncellendi (${action === 'unload' ? 'Durduruldu' : 'Başlatıldı'}).`, 'success');
            this.loadLaunchAgents();
          } else {
            App.showToast(j.error || 'İşlem başarısız', 'error');
          }
        } catch (e) {
          App.showToast('Hata: ' + e.message, 'error');
        }
      });
    });

    document.querySelectorAll('.btn-trash-agent').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetPath = btn.getAttribute('data-path');
        const ok = await Modal.confirm({
          title: 'Başlangıç Servisini Sil',
          message: `'${targetPath}' başlangıç servisi durdurulup macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`,
          confirmText: 'Çöpe At',
          cancelText: 'Vazgeç',
          isDanger: true
        });
        if (!ok) return;

        await fetch('/api/system/launch-agents/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plistPath: targetPath, action: 'unload' })
        }).catch(() => {});

        const res = await fetch('/api/action/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPath })
        });
        const j = await res.json();
        if (j.success) {
          App.showToast('Servis dosyası Çöp Kutusu\'na taşındı.', 'success');
          this.loadLaunchAgents();
        } else {
          App.showToast(j.error || 'Silinemedi', 'error');
        }
      });
    });

    document.querySelectorAll('.btn-finder-agent').forEach(btn => {
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

  filterLaunchAgents(query) {
    if (!this.agentsData?.items) return;
    const lower = query.toLowerCase();
    const filtered = this.agentsData.items.filter(i => {
      return i.name.toLowerCase().includes(lower) || i.program.toLowerCase().includes(lower) || i.scope.toLowerCase().includes(lower);
    });
    this.renderLaunchAgents(filtered);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
