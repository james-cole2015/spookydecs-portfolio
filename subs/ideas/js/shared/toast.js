// Toast Notification Component

class Toast {
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
        gap: 10px;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(message, type = 'info', duration = 4000) {
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const colors = {
      success: { bg: '#22c55e', text: '#fff' },
      error:   { bg: '#ef4444', text: '#fff' },
      warning: { bg: '#f97316', text: '#fff' },
      info:    { bg: '#3b82f6', text: '#fff' }
    };
    const color = colors[type] || colors.info;

    if (!document.getElementById('toast-animations')) {
      const style = document.createElement('style');
      style.id = 'toast-animations';
      style.textContent = `
        @keyframes toastIn  { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes toastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(110%); opacity: 0; } }
      `;
      document.head.appendChild(style);
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: ${color.bg};
      color: ${color.text};
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 280px;
      max-width: 460px;
      animation: toastIn 0.25s ease;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
    `;
    toast.innerHTML = `
      <span style="font-size:16px;font-weight:bold;flex-shrink:0">${icons[type] || icons.info}</span>
      <span style="flex:1">${message}</span>
      <button style="background:none;border:none;color:inherit;cursor:pointer;font-size:16px;padding:0;line-height:1;opacity:0.8;flex-shrink:0">×</button>
    `;

    toast.querySelector('button').addEventListener('click', () => this._remove(toast));
    this.container.appendChild(toast);

    if (duration > 0) setTimeout(() => this._remove(toast), duration);
    return toast;
  }

  _remove(toast) {
    toast.style.animation = 'toastOut 0.25s ease forwards';
    setTimeout(() => toast.parentNode?.removeChild(toast), 250);
  }

  success(message, duration) { return this.show(message, 'success', duration); }
  error(message, duration)   { return this.show(message, 'error',   duration); }
  warning(message, duration) { return this.show(message, 'warning', duration); }
  info(message, duration)    { return this.show(message, 'info',    duration); }
}

export const toast = new Toast();

export function showToast(message, type = 'info') {
  return toast.show(message, type);
}
