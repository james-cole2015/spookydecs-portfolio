/**
 * Toast Notification System
 * Shows temporary notification messages
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toast if any
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    // Add to body
    document.body.appendChild(toast);

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

/**
 * Show success toast
 */
function showSuccessToast(message, duration) {
    showToast(message, 'success', duration);
}

/**
 * Show error toast
 */
function showErrorToast(message, duration) {
    showToast(message, 'error', duration);
}

/**
 * Show warning toast
 */
function showWarningToast(message, duration) {
    showToast(message, 'warning', duration);
}

/**
 * Show info toast
 */
function showInfoToast(message, duration) {
    showToast(message, 'info', duration);
}
