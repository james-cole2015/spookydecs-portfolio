/**
 * Modal Dialog System
 * Shows modal dialogs for confirmations and custom content
 */

/**
 * Show confirmation modal
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {function} onConfirm - Callback when confirmed
 * @param {function} onCancel - Callback when cancelled (optional)
 */
function showConfirmModal(title, message, onConfirm, onCancel = null) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Create modal content
    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>${sanitizeHtml(title)}</h3>
                <button class="modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <p>${sanitizeHtml(message)}</p>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary modal-cancel">Cancel</button>
                <button class="btn btn-primary modal-confirm">Confirm</button>
            </div>
        </div>
    `;

    // Add to body
    document.body.appendChild(overlay);

    // Get buttons
    const confirmBtn = overlay.querySelector('.modal-confirm');
    const cancelBtn = overlay.querySelector('.modal-cancel');
    const closeBtn = overlay.querySelector('.modal-close');

    // Handle confirm
    confirmBtn.addEventListener('click', () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    });

    // Handle cancel
    const cancelHandler = () => {
        overlay.remove();
        if (onCancel) onCancel();
    };

    cancelBtn.addEventListener('click', cancelHandler);
    closeBtn.addEventListener('click', cancelHandler);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            cancelHandler();
        }
    });

    // Close on Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            cancelHandler();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Trigger animation
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
}

/**
 * Show custom modal with HTML content
 */
function showModal(title, contentHtml, buttons = []) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Create buttons HTML
    const buttonsHtml = buttons.map(btn => {
        const className = btn.primary ? 'btn btn-primary' : 'btn btn-secondary';
        return `<button class="modal-action-btn ${className}" data-action="${btn.action}">${btn.label}</button>`;
    }).join('');

    // Create modal content
    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <h3>${sanitizeHtml(title)}</h3>
                <button class="modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                ${contentHtml}
            </div>
            <div class="modal-footer">
                ${buttonsHtml}
            </div>
        </div>
    `;

    // Add to body
    document.body.appendChild(overlay);

    // Get close button
    const closeBtn = overlay.querySelector('.modal-close');

    // Handle close
    const closeHandler = () => {
        overlay.remove();
    };

    closeBtn.addEventListener('click', closeHandler);

    // Handle action buttons
    buttons.forEach(btn => {
        const btnElement = overlay.querySelector(`[data-action="${btn.action}"]`);
        if (btnElement && btn.onClick) {
            btnElement.addEventListener('click', () => {
                btn.onClick();
                if (btn.closeOnClick !== false) {
                    overlay.remove();
                }
            });
        }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeHandler();
        }
    });

    // Close on Escape key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeHandler();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);

    // Trigger animation
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);

    return overlay;
}

/**
 * Close all modals
 */
function closeModal() {
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => modal.remove());
}
