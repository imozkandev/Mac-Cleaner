/**
 * companion.js - Live Menu Bar Companion & Drag-and-Drop File Receiver
 */

const CompanionView = {
  init() {
    this.bindEvents();
    this.setupDropzone();
  },

  bindEvents() {
    document.getElementById('btnCompanionPurge')?.addEventListener('click', () => {
      App.purgeRam();
    });

    document.getElementById('btnCompanionEmptyTrash')?.addEventListener('click', () => {
      App.emptyTrash();
    });
  },

  setupDropzone() {
    const dropzone = document.getElementById('companionDropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-over');
      }, false);
    });

    dropzone.addEventListener('drop', async (e) => {
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      const fileNames = files.map(f => f.name || (f.path ? f.path.split('/').pop() : 'dosya')).slice(0, 3).join(', ') + (files.length > 3 ? '...' : '');
      const ok = await Modal.confirm({
        title: I18n.currentLang === 'tr' ? 'Sürüklenen Dosyaları Sil' : 'Delete Dropped Files',
        message: I18n.currentLang === 'tr'
          ? `Sürüklenen ${files.length} öğe (${fileNames}) macOS Çöp Kutusu'na taşınacak. Onaylıyor musunuz?`
          : `Dropped ${files.length} items (${fileNames}) will be moved to macOS Trash. Do you confirm?`,
        confirmText: I18n.currentLang === 'tr' ? 'Çöpe At' : 'Move to Trash',
        cancelText: I18n.currentLang === 'tr' ? 'Vazgeç' : 'Cancel',
        isDanger: true
      });
      if (!ok) return;

      App.showToast('Öğeler Çöp Kutusu\'na taşınıyor...', 'info');

      for (const f of files) {
        if (f.path) {
          try {
            await fetch('/api/action/trash', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ targetPath: f.path })
            });
          } catch (err) {}
        }
      }

      App.showToast(`${files.length} öğe güvenle Çöp Kutusu'na taşındı!`, 'success');
      App.loadSystemStats(false);
    });
  }
};
