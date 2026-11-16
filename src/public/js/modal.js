/**
 * modal.js - Reliable Custom Confirmation Modal Dialog
 * 
 * Replaces unreliable native browser confirm() dialogs that can randomly
 * auto-close or fail to capture clicks in modern web browsers and Electron.
 */

const Modal = {
  confirm({
    title = null,
    message = '',
    confirmText = null,
    cancelText = null,
    icon = 'trash',
    isDanger = true
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('confirmModalOverlay');
      const titleEl = document.getElementById('modalTitle');
      const textEl = document.getElementById('modalText');
      const iconEl = document.getElementById('modalIconBadge');
      const btnConfirm = document.getElementById('btnModalConfirm');
      const btnCancel = document.getElementById('btnModalCancel');

      if (!overlay) {
        resolve(true);
        return;
      }

      const isTr = (typeof I18n !== 'undefined' && I18n.currentLang === 'tr');
      titleEl.textContent = title || (isTr ? 'Onay Gerekiyor' : 'Confirmation Needed');
      textEl.textContent = message;

      if (iconEl) {
        if (typeof icon === 'string' && (icon.startsWith('<svg') || icon.includes('</svg>'))) {
          iconEl.innerHTML = icon;
        } else if (window.Icons && window.Icons.svg) {
          iconEl.innerHTML = window.Icons.svg(icon, 22);
        } else {
          iconEl.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;
        }
      }

      btnConfirm.textContent = confirmText || (isTr ? 'Onayla ve Sil' : 'Confirm & Delete');
      btnCancel.textContent = cancelText || (isTr ? 'Vazgeç' : 'Cancel');

      btnConfirm.className = `btn ${isDanger ? 'btn-danger' : 'btn-primary'}`;
      iconEl.className = `modal-icon-badge ${isDanger ? 'badge-danger' : 'badge-info'}`;

      overlay.classList.add('active');

      const cleanup = () => {
        overlay.classList.remove('active');
        btnConfirm.removeEventListener('click', onConfirm);
        btnCancel.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onKey);
      };

      const onConfirm = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        resolve(true);
      };

      const onCancel = (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
        resolve(false);
      };

      const onOverlay = (e) => {
        if (e.target === overlay) {
          cleanup();
          resolve(false);
        }
      };

      const onKey = (e) => {
        if (e.key === 'Escape') {
          cleanup();
          resolve(false);
        } else if (e.key === 'Enter') {
          cleanup();
          resolve(true);
        }
      };

      btnConfirm.addEventListener('click', onConfirm);
      btnCancel.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onKey);
    });
  }
};

window.Modal = Modal;
