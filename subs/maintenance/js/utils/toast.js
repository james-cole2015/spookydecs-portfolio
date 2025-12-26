// Toast notification system

export class Toast {
  static init() {
    if (!document.querySelector('.toast-container')) {
      const container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }
  
  static show(type, title, message, duration = 5000) {
    Toast.init();
    
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    
    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Close">×</button>
    `;
    
    container.appendChild(toast);
    
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      Toast.remove(toast);
    });
    
    if (duration > 0) {
      setTimeout(() => {
        Toast.remove(toast);
      }, duration);
    }
  }
  
  static remove(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }
}