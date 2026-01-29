// Toast Notification System
// Displays temporary success/error/warning messages

class Toast {
  constructor() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  }
  
  show(title, message, type = 'info', duration = 4000) {
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
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-remove
    if (duration > 0) {
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
    
    return toast;
  }
  
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }
  
  success(title, message, duration) {
    return this.show(title, message, 'success', duration);
  }
  
  error(title, message, duration) {
    return this.show(title, message, 'error', duration);
  }
  
  warning(title, message, duration) {
    return this.show(title, message, 'warning', duration);
  }
  
  info(title, message, duration) {
    return this.show(title, message, 'info', duration);
  }
}

// Styles
const style = document.createElement('style');
style.textContent = `
  .toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 400px;
  }
  
  .toast {
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    opacity: 0;
    transform: translateX(400px);
    transition: all 0.3s ease;
    border-left: 4px solid #6b7280;
  }
  
  .toast.show {
    opacity: 1;
    transform: translateX(0);
  }
  
  .toast-success { border-left-color: #16a34a; }
  .toast-error { border-left-color: #ef4444; }
  .toast-warning { border-left-color: #f59e0b; }
  .toast-info { border-left-color: #3b82f6; }
  
  .toast-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: bold;
    flex-shrink: 0;
  }
  
  .toast-success .toast-icon {
    background: #dcfce7;
    color: #16a34a;
  }
  
  .toast-error .toast-icon {
    background: #fee2e2;
    color: #ef4444;
  }
  
  .toast-warning .toast-icon {
    background: #fef3c7;
    color: #f59e0b;
  }
  
  .toast-info .toast-icon {
    background: #dbeafe;
    color: #3b82f6;
  }
  
  .toast-content {
    flex: 1;
  }
  
  .toast-title {
    font-weight: 600;
    font-size: 14px;
    color: #111827;
    margin-bottom: 4px;
  }
  
  .toast-message {
    font-size: 13px;
    color: #6b7280;
  }
  
  .toast-close {
    background: none;
    border: none;
    color: #9ca3af;
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  
  .toast-close:hover {
    color: #6b7280;
  }
  
  @media (max-width: 768px) {
    .toast-container {
      left: 12px;
      right: 12px;
      max-width: none;
    }
    
    .toast {
      transform: translateY(-100px);
    }
    
    .toast.show {
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

// Export singleton instance
export const toast = new Toast();