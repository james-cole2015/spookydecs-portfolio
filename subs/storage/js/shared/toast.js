// Toast Notification Component
// Simple toast notifications for success/error messages

class Toast {
  constructor() {
    this.container = null;
    this.createContainer();
  }
  
  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }
  
  show(type, title, message, duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        ${message ? `<div class="toast-message">${message}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    this.container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
  
  success(title, message, duration) {
    this.show('success', title, message, duration);
  }
  
  error(title, message, duration) {
    this.show('error', title, message, duration);
  }
  
  warning(title, message, duration) {
    this.show('warning', title, message, duration);
  }
  
  info(title, message, duration) {
    this.show('info', title, message, duration);
  }
  
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || 'ℹ';
  }
}

// Global instance
export const toast = new Toast();

// Convenience function exports
export function showSuccess(message, title = 'Success', duration) {
  toast.success(title, message, duration);
}

export function showError(message, title = 'Error', duration) {
  toast.error(title, message, duration);
}

export function showWarning(message, title = 'Warning', duration) {
  toast.warning(title, message, duration);
}

export function showInfo(message, title = 'Info', duration) {
  toast.info(title, message, duration);
}

// Make it available globally
if (typeof window !== 'undefined') {
  window.toast = toast;
}