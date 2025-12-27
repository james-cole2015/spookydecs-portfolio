/**
 * Toast Notification System
 * 
 * Simple toast notifications for user feedback
 */

let toastContainer = null;

/**
 * Initialize toast container
 */
function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, warning, info)
 * @param {number} duration - Duration in ms (0 = no auto-dismiss)
 */
export function showToast(message, type = 'info', duration = 3000) {
  initToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Determine colors based on type
  const colors = {
    success: { bg: '#00a676', text: '#fff' },
    error: { bg: '#ff6b35', text: '#fff' },
    warning: { bg: '#ffa500', text: '#fff' },
    info: { bg: '#333', text: '#fff' }
  };
  
  const color = colors[type] || colors.info;
  
  toast.style.cssText = `
    background: ${color.bg};
    color: ${color.text};
    padding: 12px 20px;
    border-radius: 4px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    max-width: 350px;
    word-wrap: break-word;
    pointer-events: auto;
    animation: slideIn 0.3s ease-out;
    display: flex;
    align-items: center;
    gap: 10px;
  `;
  
  // Add icon based on type
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  
  toast.innerHTML = `
    <span style="font-size: 18px; font-weight: bold;">${icons[type] || ''}</span>
    <span>${message}</span>
  `;
  
  toastContainer.appendChild(toast);
  
  // Auto-dismiss if duration is set
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }
  
  // Allow manual dismiss on click
  toast.addEventListener('click', () => {
    removeToast(toast);
  });
  
  return toast;
}

/**
 * Remove a toast with animation
 * @param {HTMLElement} toast - Toast element
 */
function removeToast(toast) {
  toast.style.animation = 'slideOut 0.3s ease-out';
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 300);
}

/**
 * Clear all toasts
 */
export function clearToasts() {
  if (toastContainer) {
    toastContainer.innerHTML = '';
  }
}

/**
 * Show success toast
 * @param {string} message 
 * @param {number} duration 
 */
export function showSuccess(message, duration = 3000) {
  return showToast(message, 'success', duration);
}

/**
 * Show error toast
 * @param {string} message 
 * @param {number} duration 
 */
export function showError(message, duration = 5000) {
  return showToast(message, 'error', duration);
}

/**
 * Show warning toast
 * @param {string} message 
 * @param {number} duration 
 */
export function showWarning(message, duration = 4000) {
  return showToast(message, 'warning', duration);
}

/**
 * Show info toast
 * @param {string} message 
 * @param {number} duration 
 */
export function showInfo(message, duration = 3000) {
  return showToast(message, 'info', duration);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
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
      transform: translateX(400px);
      opacity: 0;
    }
  }
  
  .toast {
    cursor: pointer;
    transition: opacity 0.2s;
  }
  
  .toast:hover {
    opacity: 0.9;
  }
`;
document.head.appendChild(style);
