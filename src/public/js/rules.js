/**
 * rules.js - Automation Rules, Growth Alerts and Whitelist Frontend Controller
 */

const RulesView = {
  rules: [],
  whitelist: [],

  init() {
    this.bindEvents();
    this.loadRules();
    this.loadWhitelist();
  },

  bindEvents() {
    document.getElementById('btnEvaluateRulesNow')?.addEventListener('click', () => {
      this.evaluateRules(true);
    });

    document.getElementById('btnExecuteRulesNow')?.addEventListener('click', () => {
      this.evaluateRules(false);
    });

    document.getElementById('btnToggleNewRuleForm')?.addEventListener('click', () => {
      const form = document.getElementById('newRuleFormCard');
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btnCancelNewRule')?.addEventListener('click', () => {
      const form = document.getElementById('newRuleFormCard');
      if (form) form.style.display = 'none';
    });

    document.getElementById('btnPickRuleFolder')?.addEventListener('click', async () => {
      const folder = await App.pickFolder('Kural İçin Hedef Klasör Seçin');
      if (folder) {
        const input = document.getElementById('newRuleTargetDir');
        if (input) input.value = folder;
      }
    });

    document.getElementById('btnSaveNewRule')?.addEventListener('click', () => {
      this.createNewRule();
    });

    document.getElementById('btnSelectWhitelistFolder')?.addEventListener('click', async () => {
      const folder = await App.pickFolder('Korunacak (Whitelist) Klasörü Seçin');
      if (folder) {
        const input = document.getElementById('whitelistInput');
        if (input) input.value = folder;
      }
    });

    document.getElementById('btnAddWhitelistPath')?.addEventListener('click', () => {
      this.addWhitelistPath();
    });
  },

  async loadRules() {
    try {
      const res = await fetch('/api/rules');
      const json = await res.json();
      if (!json.success) return;

      this.rules = json.rules;
      this.renderRules(json.rules);
    } catch (e) {
      console.error('Rules load error:', e);
    }
  },

  renderRules(rules) {
    const container = document.getElementById('rulesListContainer');
    if (!container) return;
    container.innerHTML = '';

    rules.forEach(rule => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'center';

      let details = rule.description;
      if (rule.targetDir) {
        details += ` <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted); display:block; margin-top:4px;">Hedef: ${rule.targetDir}</span>`;
      }

      card.innerHTML = `
        <div style="flex:1; padding-right:20px;">
          <div style="font-weight:600; font-size:14px; color:var(--text-main); margin-bottom:4px; display:flex; align-items:center; gap:8px;">
            <span style="display:inline-flex; align-items:center; color:var(--accent-purple);">${window.Icons ? window.Icons.svg('zap', 14) : ''}</span> ${rule.title}
          </div>
          <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.5;">${details}</div>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <label class="switch-container">
            <div class="switch">
              <input type="checkbox" class="rule-switch" data-id="${rule.id}" ${rule.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </div>
          </label>
          <button class="btn btn-danger btn-sm btn-delete-rule" data-id="${rule.id}" title="Kuralı Sil">Sil</button>
        </div>
      `;

      container.appendChild(card);
    });

    document.querySelectorAll('.btn-delete-rule').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        this.rules = this.rules.filter(r => r.id !== id);
        await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rules: this.rules })
        });
        this.renderRules(this.rules);
        App.showToast('Kural silindi.', 'info');
      });
    });

    document.querySelectorAll('.rule-switch').forEach(sw => {
      sw.addEventListener('change', async (e) => {
        const id = sw.getAttribute('data-id');
        const rule = this.rules.find(r => r.id === id);
        if (rule) {
          rule.enabled = sw.checked;
          await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules: this.rules })
          });
          App.showToast(`'${rule.title}' ${rule.enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`, 'info');
        }
      });
    });
  },

  async createNewRule() {
    const title = document.getElementById('newRuleTitle')?.value.trim();
    const targetDir = document.getElementById('newRuleTargetDir')?.value.trim();
    const extsRaw = document.getElementById('newRuleExts')?.value.trim() || '';
    const ageDays = parseInt(document.getElementById('newRuleAgeDays')?.value, 10) || 30;
    const action = document.getElementById('newRuleAction')?.value || 'trash';

    if (!title || !targetDir) {
      App.showToast('Lütfen kural başlığı ve hedef klasör yolunu girin.', 'info');
      return;
    }

    const extensions = extsRaw
      ? extsRaw.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const newRule = {
      id: `rule_custom_${Date.now()}`,
      title,
      description: `${targetDir} içindeki ${ageDays} günden eski ${extensions.length ? extensions.join(', ') : 'tüm'} öğeleri ${action === 'trash' ? 'Çöp Kutusuna taşı' : 'bildir'}.`,
      enabled: true,
      targetDir,
      extensions,
      ageDays,
      action
    };

    this.rules.unshift(newRule);
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules: this.rules })
    });

    document.getElementById('newRuleTitle').value = '';
    document.getElementById('newRuleExts').value = '';
    document.getElementById('newRuleFormCard').style.display = 'none';

    this.renderRules(this.rules);
    App.showToast(`'${title}' kuralı eklendi!`, 'success');
  },

  async evaluateRules(dryRun = true) {
    if (!dryRun) {
      const ok = await Modal.confirm({
        title: 'Otomasyon Kurallarını Uygula',
        message: 'Etkin kurallarla eşleşen dosyalar macOS Çöp Kutusu\'na taşınacak. Onaylıyor musunuz?',
        confirmText: 'Kuralları Uygula',
        cancelText: 'Vazgeç',
        isDanger: true
      });
      if (!ok) return;
    }

    App.showToast(dryRun ? 'Otomasyon kuralları test ediliyor...' : 'Kurallar uygulanıyor...', 'info');
    try {
      const res = await fetch('/api/rules/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Değerlendirme başarısız');

      let totalMatched = 0;
      let totalBytes = 0;
      json.results.forEach(r => {
        if (r.matchedItems) totalMatched += r.matchedItems.length;
        if (r.totalBytes && r.action !== 'alert') totalBytes += r.totalBytes;
      });

      this.renderEvaluationResults(json.results, dryRun);

      const mbStr = (totalBytes / (1024 * 1024)).toFixed(1);
      App.showToast(
        dryRun
          ? `Test tamamlandı! ${totalMatched} eşleşen öğe bulundu (${mbStr} MB).`
          : `Kurallar uygulandı! ${totalMatched} öğe işlendi (${mbStr} MB).`,
        'success'
      );
      if (!dryRun) App.loadSystemStats(false);
    } catch (e) {
      App.showToast('Hata: ' + e.message, 'error');
    }
  },

  renderEvaluationResults(results, dryRun) {
    const panel = document.getElementById('rulesEvaluationResults');
    if (!panel) return;

    let html = `
      <div class="card" style="border-color: rgba(56, 189, 248, 0.35);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div class="card-title" style="margin-bottom:0; color:var(--accent-cyan);">
            ${dryRun ? 'Kural Test (Dry-Run) Sonuçları' : 'Uygulanan Kural Sonuçları'}
          </div>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('rulesEvaluationResults').style.display='none'">Kapat</button>
        </div>
    `;

    let anyItem = false;
    results.forEach(r => {
      if (r.action === 'alert') {
        anyItem = true;
        html += `
          <div style="padding:8px 12px; border-radius:8px; margin-bottom:8px; background:rgba(255,255,255,0.03); display:flex; justify-content:space-between; align-items:center;">
            <span><strong>${r.title}:</strong> Mevcut klasör boyutu <span class="size-pill">${r.formattedTotal}</span></span>
            <span class="badge-tag ${r.triggeredAlert ? 'tag-danger' : 'tag-success'}">${r.triggeredAlert ? r.alertMessage : 'Limit Altında (Normal)'}</span>
          </div>
        `;
      } else if (r.matchedItems && r.matchedItems.length > 0) {
        anyItem = true;
        html += `
          <div style="margin-bottom:10px;">
            <div style="font-size:13px; font-weight:600; margin-bottom:6px;">
              ${r.title} — <span class="size-pill">${r.matchedItems.length} öğe (${r.formattedTotal})</span>
            </div>
            <div style="max-height:160px; overflow-y:auto; font-size:12px; font-family:var(--font-mono); color:var(--text-secondary); background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:8px;">
              ${r.matchedItems.map(item => `<div style="display:flex; justify-content:space-between; padding:3px 0;"><span>${item.name} (${item.daysOld} gün)</span><span style="color:var(--accent-cyan);">${item.formattedSize}</span></div>`).join('')}
            </div>
          </div>
        `;
      }
    });

    if (!anyItem) {
      html += `<p style="font-size:13px; color:var(--text-muted); margin:0;">Aktif kuralların kriterleriyle eşleşen eski dosya veya boyut aşımı bulunmadı.</p>`;
    }

    html += `</div>`;
    panel.innerHTML = html;
    panel.style.display = 'block';
  },

  async loadWhitelist() {
    try {
      const res = await fetch('/api/whitelist');
      const json = await res.json();
      if (!json.success) return;

      this.whitelist = json.whitelist;
      this.renderWhitelist(json.whitelist);
    } catch (e) {
      console.error('Whitelist load error:', e);
    }
  },

  renderWhitelist(list) {
    const tbody = document.getElementById('tbodyWhitelist');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="2" class="empty-state">Özel istisna eklenmedi. (Sistem dizinleri varsayılan olarak korunmaktadır).</td></tr>`;
      return;
    }

    list.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span style="font-family:var(--font-mono); font-size:12.5px; color:var(--accent-cyan); display:inline-flex; align-items:center; gap:6px;">${window.Icons ? window.Icons.svg('shieldCheck', 14) : ''} ${p}</span></td>
        <td>
          <button class="btn btn-danger btn-sm btn-remove-whitelist" data-path="${p}">Kaldır</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-remove-whitelist').forEach(btn => {
      btn.addEventListener('click', async () => {
        const p = btn.getAttribute('data-path');
        this.whitelist = this.whitelist.filter(item => item !== p);
        await this.saveWhitelist();
      });
    });
  },

  async addWhitelistPath() {
    const input = document.getElementById('whitelistInput');
    const val = input.value.trim();
    if (!val) {
      App.showToast('Lütfen geçerli bir yol girin.', 'info');
      return;
    }

    if (!this.whitelist.includes(val)) {
      this.whitelist.push(val);
      input.value = '';
      await this.saveWhitelist();
      App.showToast(`'${val}' istisna listesine eklendi.`, 'success');
    }
  },

  async saveWhitelist() {
    try {
      await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whitelist: this.whitelist })
      });
      this.renderWhitelist(this.whitelist);
    } catch (e) {
      App.showToast('İstisna listesi kaydedilemedi: ' + e.message, 'error');
    }
  }
};
