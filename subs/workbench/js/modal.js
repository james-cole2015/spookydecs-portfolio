// Modal Dialog Component

export class Modal {
  constructor() {
    this.container = document.getElementById('modal-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'modal-container';
      document.body.appendChild(this.container);
    }
    this.currentModal = null;
  }

  show(config) {
    const {
      title,
      message,
      confirmText = 'Confirm',
      cancelText = 'Cancel',
      type = 'default',
      onConfirm,
      onCancel
    } = config;

    // Remove existing modal if any
    if (this.currentModal) {
      this.close();
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease;
    `;

    const typeColors = {
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      default: '#3b82f6'
    };

    const color = typeColors[type] || typeColors.default;

    modal.innerHTML = `
      <div class="modal-content" style="
        background: white;
        border-radius: 12px;
        width: 90%;
        max-width: 480px;
        box-shadow: 0 20px 25px rgba(0,0,0,0.15);
        animation: slideUp 0.2s ease;
      ">
        <div class="modal-header" style="
          padding: 24px 24px 16px;
          border-bottom: 1px solid #e2e8f0;
        ">
          <h3 style="
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #0f172a;
          ">${title}</h3>
        </div>
        <div class="modal-body" style="
          padding: 24px;
        ">
          <p style="
            margin: 0;
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
          ">${message}</p>
        </div>
        <div class="modal-footer" style="
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: #f8fafc;
        ">
          <button class="modal-cancel" style="
            padding: 10px 24px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            color: #0f172a;
            transition: all 0.15s;
          ">${cancelText}</button>
          <button class="modal-confirm" style="
            padding: 10px 24px;
            background: ${color};
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            color: white;
            transition: all 0.15s;
          ">${confirmText}</button>
        </div>
      </div>
    `;

    // Add animations
    if (!document.getElementById('modal-animations')) {
      const style = document.createElement('style');
      style.id = 'modal-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .modal-cancel:hover {
          background: #f8fafc !important;
          border-color: #cbd5e1 !important;
        }
        .modal-confirm:hover {
          filter: brightness(0.9);
        }
      `;
      document.head.appendChild(style);
    }

    // Event listeners
    const confirmBtn = modal.querySelector('.modal-confirm');
    const cancelBtn = modal.querySelector('.modal-cancel');

    confirmBtn.addEventListener('click', () => {
      if (onConfirm) onConfirm();
      this.close();
    });

    cancelBtn.addEventListener('click', () => {
      if (onCancel) onCancel();
      this.close();
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        if (onCancel) onCancel();
        this.close();
      }
    });

    // ESC key to close
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        if (onCancel) onCancel();
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    this.container.appendChild(modal);
    this.currentModal = modal;

    return modal;
  }

  close() {
    if (this.currentModal && this.currentModal.parentNode) {
      this.currentModal.style.animation = 'fadeOut 0.2s ease';
      setTimeout(() => {
        if (this.currentModal && this.currentModal.parentNode) {
          this.currentModal.parentNode.removeChild(this.currentModal);
        }
        this.currentModal = null;
      }, 200);
    }
  }

  confirm(config) {
    return new Promise((resolve) => {
      this.show({
        ...config,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }
}

// Create singleton instance
export const modal = new Modal();
