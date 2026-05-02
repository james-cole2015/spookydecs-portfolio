function showConfirmModal(title, message, onConfirm, onCancel = null) {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>${_safeText(title)}</h3>
                <button class="modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body"><p>${_safeText(message)}</p></div>
            <div class="modal-footer">
                <button class="btn btn-ghost modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-confirm">Confirm</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const cancel = () => { overlay.remove(); if (onCancel) onCancel(); };
    overlay.querySelector('.modal-confirm').addEventListener('click', () => { overlay.remove(); if (onConfirm) onConfirm(); });
    overlay.querySelector('.modal-cancel').addEventListener('click', cancel);
    overlay.querySelector('.modal-close').addEventListener('click', cancel);
    overlay.addEventListener('click', e => { if (e.target === overlay) cancel(); });

    const esc = e => { if (e.key === 'Escape') { cancel(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);
    setTimeout(() => overlay.classList.add('show'), 10);
}

function _safeText(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}
