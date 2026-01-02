// Toast Notification Component

export class Toast {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };

    const colors = {
      success: { bg: '#10b981', text: 'white' },
      error: { bg: '#ef4444', text: 'white' },
      warning: { bg: '#f59e0b', text: 'white' },
      info: { bg: '#3b82f6', text: 'white' }
    };

    const color = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${color.bg};
      color: ${color.text};
      padding: 14px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      max-width: 500px;
      animation: slideIn 0.3s ease;
      font-size: 14px;
      font-weight: 500;
    `;

    toast.innerHTML = `
      <span style="font-size: 18px; font-weight: bold;">${icons[type]}</span>
      <span style="flex: 1;">${message}</span>
      <button style="
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        line-height: 1;
        opacity: 0.8;
      ">×</button>
    `;

    // Add animation keyframes
    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Close button
    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => this.remove(toast));

    this.container.appendChild(toast);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => this.remove(toast), duration);
    }

    return toast;
  }

  remove(toast) {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

// Create singleton instance
export const toast = new Toast();
