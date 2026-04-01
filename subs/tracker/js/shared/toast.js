/**
 * toast.js
 * Lightweight toast notifications.
 */

const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 9999;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  function show(message, type = 'info', duration = 3500) {
    const c = getContainer();
    const toast = document.createElement('div');

    const colors = {
      success: { bg: '#c8f13522', border: '#c8f135', text: '#c8f135' },
      error:   { bg: '#ff4d4d22', border: '#ff4d4d', text: '#ff4d4d' },
      info:    { bg: '#1e1e21',   border: '#2a2a2e', text: '#909098' },
    };

    const { bg, border, text } = colors[type] || colors.info;

    toast.style.cssText = `
      background: ${bg};
      border: 1px solid ${border};
      color: ${text};
      font-family: var(--font-mono, monospace);
      font-size: 12px;
      padding: 10px 14px;
      border-radius: 6px;
      max-width: 320px;
      pointer-events: auto;
      animation: toastIn 0.18s ease both;
    `;
    toast.textContent = message;

    if (!document.getElementById('toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        @keyframes toastIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes toastOut { from { opacity:1; } to { opacity:0; transform:translateY(4px); } }
      `;
      document.head.appendChild(style);
    }

    c.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.2s ease both';
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  return { show };
})();
