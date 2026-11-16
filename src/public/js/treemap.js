/**
 * treemap.js - Interactive Canvas Treemap Engine
 * 
 * Features:
 * - Proportional rectangular tiling algorithm
 * - Deep drill-down on click & breadcrumb navigation
 * - Hover tooltip with live dimensions and sizes
 * - File inspector with Finder reveal and safe Trash action
 */

const TreemapView = {
  canvas: null,
  ctx: null,
  rootNode: null,
  currentNode: null,
  nodeHistory: [],
  renderedBoxes: [],
  hoveredBox: null,
  selectedNode: null,

  CATEGORY_COLORS: {
    Developer: '#6366f1',
    Media: '#ec4899',
    Documents: '#38bdf8',
    Archives: '#f59e0b',
    Applications: '#a855f7',
    Folder: '#3b82f6',
    Other: '#64748b'
  },

  init() {
    this.canvas = document.getElementById('treemapCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.bindEvents();
  },

  onViewActivated() {
    if (!this.rootNode) {
      this.loadTree();
    } else {
      this.resizeCanvas();
      this.render();
    }
  },

  bindEvents() {
    window.addEventListener('resize', () => {
      if (App.activeView === 'treemap') {
        this.resizeCanvas();
        this.render();
      }
    });

    document.getElementById('btnTreemapRefresh')?.addEventListener('click', () => {
      this.loadTree(this.currentNode ? this.currentNode.path : null);
    });

    document.getElementById('btnTreemapSelectFolder')?.addEventListener('click', async () => {
      const folder = await App.pickFolder('Disk Haritasında Görselleştirilecek Klasörü Seçin');
      if (folder) {
        this.loadTree(folder);
      }
    });

    document.getElementById('btnCloseInspector')?.addEventListener('click', () => {
      const inspector = document.getElementById('treemapInspector');
      if (inspector) inspector.style.display = 'none';
    });

    document.getElementById('btnInspectorFinder')?.addEventListener('click', () => {
      if (this.selectedNode?.path) {
        fetch('/api/action/show-in-finder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPath: this.selectedNode.path })
        });
      }
    });

    document.getElementById('btnInspectorTrash')?.addEventListener('click', async () => {
      if (!this.selectedNode?.path) return;
      const ok = await Modal.confirm({
        title: I18n.currentLang === 'tr' ? 'Çöp Kutusuna Gönder' : 'Move to Trash',
        message: `'${this.selectedNode.name}' macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`,
        confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
        cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
        isDanger: true
      });
      if (!ok) return;

      try {
        const res = await fetch('/api/action/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPath: this.selectedNode.path })
        });
        const j = await res.json();
        if (j.success) {
          App.showToast('Öğe Çöp Kutusu\'na taşındı', 'success');
          document.getElementById('treemapInspector').style.display = 'none';
          this.loadTree(this.currentNode.path);
          App.loadSystemStats(false);
        } else {
          App.showToast(j.error || 'Silinemedi', 'error');
        }
      } catch (e) {
        App.showToast('Hata: ' + e.message, 'error');
      }
    });

    // Canvas Mouse Events
    this.canvas?.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas?.addEventListener('mouseleave', () => this.handleMouseLeave());
    this.canvas?.addEventListener('click', (e) => this.handleClick(e));
  },

  async loadTree(targetDir = null) {
    App.showToast('Disk haritası taranıyor...', 'info');
    try {
      const res = await fetch('/api/treemap/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDir, depth: 3 })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Disk taranamadı');

      this.rootNode = json.data;
      this.currentNode = json.data;
      this.nodeHistory = [json.data];

      this.resizeCanvas();
      this.render();
      this.updateBreadcrumbs();
      App.showToast('Disk haritası yüklendi!', 'success');
    } catch (e) {
      App.showToast('Hata: ' + e.message, 'error');
    }
  },

  resizeCanvas() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
  },

  render() {
    if (!this.ctx || !this.currentNode) return;
    const ctx = this.ctx;
    const width = this.canvasWidth;
    const height = this.canvasHeight;

    ctx.clearRect(0, 0, width, height);
    this.renderedBoxes = [];

    const children = this.currentNode.children || [];
    if (children.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Bu klasör boş veya içerik bulunamadı', width / 2, height / 2);
      return;
    }

    // Layout algorithm: Squarified / binary partitioning
    this.layoutNodes(children, 0, 0, width, height);

    // Draw all calculated boxes
    this.renderedBoxes.forEach(box => {
      this.drawBox(box);
    });
  },

  layoutNodes(nodes, x, y, w, h) {
    if (nodes.length === 0 || w <= 0 || h <= 0) return;

    const totalWeight = nodes.reduce((sum, n) => sum + (n.sizeBytes || 1), 0);
    let currentX = x;
    let currentY = y;
    const isHorizontal = w >= h;

    nodes.forEach(node => {
      const weight = (node.sizeBytes || 1) / totalWeight;
      let boxW, boxH;

      if (isHorizontal) {
        boxW = Math.max(2, w * weight);
        boxH = h;
        this.renderedBoxes.push({ node, x: currentX, y: currentY, w: boxW, h: boxH });
        currentX += boxW;
      } else {
        boxW = w;
        boxH = Math.max(2, h * weight);
        this.renderedBoxes.push({ node, x: currentX, y: currentY, w: boxW, h: boxH });
        currentY += boxH;
      }
    });
  },

  drawBox(box) {
    const { node, x, y, w, h } = box;
    const ctx = this.ctx;
    const isHovered = this.hoveredBox === box;

    const baseColor = this.CATEGORY_COLORS[node.category] || this.CATEGORY_COLORS.Folder;

    ctx.save();

    // Box background
    ctx.fillStyle = isHovered ? '#ffffff' : baseColor;
    ctx.globalAlpha = isHovered ? 0.35 : (node.type === 'folder' ? 0.25 : 0.45);
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);

    // Border
    ctx.globalAlpha = isHovered ? 1.0 : 0.4;
    ctx.strokeStyle = isHovered ? '#38bdf8' : baseColor;
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // Text Label (only if box is large enough)
    if (w > 50 && h > 30) {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 11.5px Outfit, sans-serif';
      ctx.textAlign = 'left';

      // Truncate name
      let displayName = node.name;
      if (node.type === 'folder' && !displayName.endsWith('/')) displayName = displayName + '/';
      ctx.fillText(displayName, x + 8, y + 18, w - 16);

      if (h > 46) {
        ctx.fillStyle = isHovered ? '#38bdf8' : '#94a3b8';
        ctx.font = '500 10.5px "JetBrains Mono", monospace';
        ctx.fillText(node.formattedSize, x + 8, y + 33, w - 16);
      }
    }

    ctx.restore();
  },

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const found = this.renderedBoxes.find(b => mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h);
    const tooltip = document.getElementById('treemapTooltip');

    if (found) {
      this.hoveredBox = found;
      this.canvas.style.cursor = found.node.type === 'folder' ? 'pointer' : 'default';

      if (tooltip) {
        tooltip.style.display = 'flex';
        tooltip.style.left = `${e.clientX - rect.left}px`;
        tooltip.style.top = `${e.clientY - rect.top}px`;
        document.getElementById('tooltipName').textContent = found.node.name;
        document.getElementById('tooltipSize').textContent = `${found.node.formattedSize} · ${found.node.category}`;
        document.getElementById('tooltipPath').textContent = found.node.path;
      }
    } else {
      this.hoveredBox = null;
      this.canvas.style.cursor = 'default';
      if (tooltip) tooltip.style.display = 'none';
    }

    this.render();
  },

  handleMouseLeave() {
    this.hoveredBox = null;
    const tooltip = document.getElementById('treemapTooltip');
    if (tooltip) tooltip.style.display = 'none';
    this.render();
  },

  async handleClick(e) {
    if (!this.hoveredBox) return;
    const node = this.hoveredBox.node;
    this.selectedNode = node;

    // Open Inspector Drawer
    const inspector = document.getElementById('treemapInspector');
    if (inspector) {
      inspector.style.display = 'flex';
      document.getElementById('inspectorTitle').textContent = node.name;
      document.getElementById('inspectorPath').textContent = node.path;
      document.getElementById('inspectorSize').textContent = `${node.formattedSize} (${node.category})`;
    }

    // If folder, drill down!
    if (node.type === 'folder') {
      if (node.children && node.children.length > 0) {
        this.currentNode = node;
        this.nodeHistory.push(node);
        this.updateBreadcrumbs();
        this.render();
      } else if (node.path) {
        // Load deeper level on-demand when hitting maxDepth boundary
        try {
          App.showToast(`'${node.name}' alt dizini yükleniyor...`, 'info');
          const res = await fetch('/api/treemap/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetDir: node.path, depth: 2 })
          });
          const json = await res.json();
          if (json.success && json.data) {
            node.children = json.data.children || [];
            this.currentNode = node;
            this.nodeHistory.push(node);
            this.updateBreadcrumbs();
            this.render();
          }
        } catch (err) {}
      }
    }
  },

  updateBreadcrumbs() {
    const container = document.getElementById('treemapBreadcrumbs');
    if (!container) return;
    container.innerHTML = '';

    this.nodeHistory.forEach((node, index) => {
      const isLast = index === this.nodeHistory.length - 1;
      const span = document.createElement('span');
      span.className = `crumb-item ${isLast ? 'active' : ''}`;
      span.textContent = node.name || 'Root';

      span.addEventListener('click', () => {
        if (!isLast) {
          this.nodeHistory = this.nodeHistory.slice(0, index + 1);
          this.currentNode = node;
          this.updateBreadcrumbs();
          this.render();
        }
      });

      container.appendChild(span);

      if (!isLast) {
        const sep = document.createElement('span');
        sep.className = 'crumb-separator';
        sep.textContent = '>';
        container.appendChild(sep);
      }
    });
  }
};
