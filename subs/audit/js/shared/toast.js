function showToast(message, type = 'info', duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function showSuccessToast(message, duration) { showToast(message, 'success', duration); }
function showErrorToast(message, duration)   { showToast(message, 'error', duration); }
function showWarningToast(message, duration) { showToast(message, 'warning', duration); }
function showInfoToast(message, duration)    { showToast(message, 'info', duration); }
