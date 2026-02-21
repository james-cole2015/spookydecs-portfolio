// Confirm Modal Component

class Modal {
  constructor() {
    this.container = document.getElementById('modal-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'modal-container';
      document.body.appendChild(this.container);
    }
    this.currentModal = null;
  }

  show({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', confirmDanger = false }) {
    this.close();

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(15, 23, 42, 0.45);
      z-index: 9000;
      display: flex; align-items: center; justify-content: center;
      animation: modalFadeIn 0.15s ease;
    `;

    if (!document.getElementById('modal-animations')) {
      const style = document.createElement('style');
      style.id = 'modal-animations';
      style.textContent = `
        @keyframes modalFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes modalSlideIn { from { transform: translateY(-12px) scale(0.97); opacity: 0; } to { transform: none; opacity: 1; } }
      `;
      document.head.appendChild(style);
    }

    const confirmBg = confirmDanger ? '#ef4444' : '#3b82f6';
    const confirmHover = confirmDanger ? '#dc2626' : '#2563eb';

    overlay.innerHTML = `
      <div style="
        background: #fff;
        border-radius: 10px;
        padding: 28px 28px 24px;
        max-width: 420px;
        width: calc(100% - 48px);
        box-shadow: 0 20px 48px rgba(0,0,0,0.18);
        animation: modalSlideIn 0.18s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <h3 style="margin:0 0 10px;font-size:17px;font-weight:600;color:#0f172a">${title}</h3>
        <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.55">${message}</p>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button id="modal-cancel" style="
            padding: 8px 18px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            background: #fff;
            color: #475569;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          ">Cancel</button>
          <button id="modal-confirm" style="
            padding: 8px 18px;
            border: none;
            border-radius: 6px;
            background: ${confirmBg};
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
          " onmouseover="this.style.background='${confirmHover}'" onmouseout="this.style.background='${confirmBg}'">${confirmLabel}</button>
        </div>
      </div>
    `;

    overlay.querySelector('#modal-cancel').addEventListener('click', () => {
      if (onCancel) onCancel();
      this.close();
    });
    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
      if (onConfirm) onConfirm();
      this.close();
    });
    overlay.addEventListener('click', e => {
      if (e.target === overlay) {
        if (onCancel) onCancel();
        this.close();
      }
    });

    const escHandler = e => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    this.container.appendChild(overlay);
    this.currentModal = overlay;
  }

  close() {
    if (this.currentModal?.parentNode) {
      this.currentModal.style.animation = 'modalFadeOut 0.15s ease forwards';
      setTimeout(() => {
        this.currentModal?.parentNode?.removeChild(this.currentModal);
        this.currentModal = null;
      }, 150);
    }
  }

  confirm(config) {
    return new Promise(resolve => {
      this.show({
        ...config,
        onConfirm: () => resolve(true),
        onCancel:  () => resolve(false)
      });
    });
  }
}

export const modal = new Modal();

export function showConfirmModal({ title, message, onConfirm, confirmLabel = 'Delete', confirmDanger = true }) {
  modal.show({ title, message, onConfirm, confirmLabel, confirmDanger });
}
