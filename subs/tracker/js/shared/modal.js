/**
 * modal.js
 * Lightweight modal dialog.
 */

const Modal = (() => {
  let overlay;

  function getOverlay() {
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-overlay';
      overlay.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex; align-items: center; justify-content: center;
        z-index: 8888;
        animation: fadeIn 0.15s ease;
      `;
      overlay.addEventListener('click', e => {
        if (e.target === overlay) close();
      });
      document.body.appendChild(overlay);

      if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }`;
        document.head.appendChild(style);
      }
    }
    return overlay;
  }

  function open({ title = '', body = '', actions = [] } = {}) {
    const o = getOverlay();
    o.innerHTML = `
      <div style="
        background: var(--surface, #161618);
        border: 1px solid var(--border, #2a2a2e);
        border-radius: 10px;
        padding: 24px;
        min-width: 320px;
        max-width: 480px;
        width: 90%;
        font-family: var(--font-mono, monospace);
      ">
        ${title ? `<div style="font-family:var(--font-display,sans-serif);font-size:15px;font-weight:700;margin-bottom:12px;color:var(--text,#e8e8ea)">${title}</div>` : ''}
        <div style="font-size:13px;color:var(--text-2,#909098);line-height:1.6;margin-bottom:20px">${body}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          ${actions.map((a, i) => `
            <button data-action-idx="${i}" style="
              font-family:var(--font-mono,monospace);font-size:12px;
              padding:6px 14px;border-radius:6px;cursor:pointer;
              background:${a.primary ? 'var(--accent,#c8f135)' : 'transparent'};
              color:${a.primary ? '#0e0e0f' : 'var(--text-2,#909098)'};
              border:1px solid ${a.primary ? 'transparent' : 'var(--border,#2a2a2e)'};
            ">${a.label}</button>
          `).join('')}
        </div>
      </div>`;

    o.style.display = 'flex';
    o.querySelectorAll('[data-action-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = actions[parseInt(btn.dataset.actionIdx)];
        if (action?.onClick) action.onClick();
        close();
      });
    });
  }

  function close() {
    if (overlay) overlay.style.display = 'none';
  }

  function confirm({ title, body, confirmLabel = 'Confirm', onConfirm }) {
    open({
      title,
      body,
      actions: [
        { label: 'Cancel',       onClick: () => {} },
        { label: confirmLabel,   onClick: onConfirm, primary: true },
      ],
    });
  }

  return { open, close, confirm };
})();
