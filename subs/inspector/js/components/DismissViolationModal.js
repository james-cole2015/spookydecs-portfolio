/**
 * Dismiss Violation Modal Component
 * Handles dismissal with enforced character limits
 */

class DismissViolationModal {
    constructor(violation, onDismissSuccess) {
        this.violation = violation;
        this.onDismissSuccess = onDismissSuccess;
        this.modal = null;
        this.minChars = 50;
        this.maxChars = 300;
    }

    /**
     * Show the modal
     */
    show() {
        const contentHtml = this.renderContent();
        
        this.modal = showModal(
            'Dismiss Violation',
            contentHtml,
            [
                {
                    label: 'Cancel',
                    action: 'close',
                    primary: false,
                    onClick: () => {
                        closeModal();
                    }
                },
                {
                    label: 'Dismiss',
                    action: 'dismiss',
                    primary: true,
                    id: 'dismiss-submit-btn',
                    disabled: true,
                    onClick: () => this.handleDismiss()
                }
            ],
            'dismiss-violation-modal'
        );

        // Attach event listeners
        setTimeout(() => this.attachEventListeners(), 100);
    }

    /**
     * Render modal content
     */
    renderContent() {
        return `
            <div class="dismiss-modal-content">
                <div class="dismiss-instructions">
                    <p>Dismissing a violation marks it as reviewed and acceptable. Once dismissed, this violation will not be re-detected by future rule runs.</p>
                    <p><strong>Please explain why this violation is being dismissed (${this.minChars}-${this.maxChars} characters):</strong></p>
                </div>
                
                <div class="dismiss-form">
                    <textarea 
                        id="dismissal-reason" 
                        rows="6" 
                        placeholder="Enter reason for dismissal..."
                        maxlength="${this.maxChars}"
                    ></textarea>
                    
                    <div class="character-counter">
                        <span id="char-count" class="char-count-neutral">0</span>
                        <span class="char-count-divider">/</span>
                        <span class="char-count-max">${this.maxChars}</span>
                        <span id="char-status" class="char-status"></span>
                    </div>
                    
                    <div id="validation-message" class="validation-message"></div>
                </div>
                
                <div class="violation-context">
                    <h4>Violation Details</h4>
                    <div class="context-item">
                        <strong>Rule:</strong> ${sanitizeHtml(this.violation.rule_id)}
                    </div>
                    <div class="context-item">
                        <strong>Item:</strong> ${sanitizeHtml(this.violation.violation_details?.item_short_name || this.violation.entity_id)}
                    </div>
                    <div class="context-item">
                        <strong>Issue:</strong> ${sanitizeHtml(this.violation.violation_details?.message || 'N/A')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const textarea = document.getElementById('dismissal-reason');
        if (!textarea) return;

        textarea.addEventListener('input', () => this.updateCharacterCount());
        textarea.focus();
    }

    /**
     * Update character count and validation
     */
    updateCharacterCount() {
        const textarea = document.getElementById('dismissal-reason');
        const charCount = document.getElementById('char-count');
        const charStatus = document.getElementById('char-status');
        const validationMessage = document.getElementById('validation-message');
        const submitBtn = document.getElementById('dismiss-submit-btn');
        
        if (!textarea || !charCount || !submitBtn) return;

        const length = textarea.value.length;
        charCount.textContent = length;

        // Update character count color
        charCount.className = '';
        if (length < this.minChars) {
            charCount.classList.add('char-count-below-min');
        } else if (length >= this.minChars && length < this.maxChars) {
            charCount.classList.add('char-count-valid');
        } else if (length === this.maxChars) {
            charCount.classList.add('char-count-max-reached');
        }

        // Update status message
        if (length < this.minChars) {
            const remaining = this.minChars - length;
            charStatus.textContent = `(${remaining} more character${remaining === 1 ? '' : 's'} required)`;
            charStatus.className = 'char-status char-status-warning';
            validationMessage.textContent = `Minimum ${this.minChars} characters required`;
            validationMessage.className = 'validation-message validation-error';
            submitBtn.disabled = true;
        } else if (length === this.maxChars) {
            charStatus.textContent = '(maximum reached)';
            charStatus.className = 'char-status char-status-max';
            validationMessage.textContent = '';
            submitBtn.disabled = false;
        } else {
            charStatus.textContent = '(meets requirements)';
            charStatus.className = 'char-status char-status-success';
            validationMessage.textContent = '';
            submitBtn.disabled = false;
        }
    }

/**
 * Handle dismiss action
 */
async handleDismiss() {
    const textarea = document.getElementById('dismissal-reason');
    const dismissalNotes = textarea.value.trim();
    const submitBtn = document.getElementById('dismiss-submit-btn');

    // Final validation
    if (dismissalNotes.length < this.minChars) {
        showErrorToast(`Dismissal reason must be at least ${this.minChars} characters`);
        return;
    }

    if (dismissalNotes.length > this.maxChars) {
        showErrorToast(`Dismissal reason cannot exceed ${this.maxChars} characters`);
        return;
    }

    // Disable button and show loading
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Dismissing...';
    }

    try {
        await InspectorAPI.dismissViolation(this.violation.violation_id, dismissalNotes);
        showSuccessToast('Violation dismissed successfully');
        
        // Close modal BEFORE callback (which might trigger re-renders)
        closeModal();
        
        // Call success callback AFTER modal is closed
        if (this.onDismissSuccess) {
            this.onDismissSuccess();
        }
        
    } catch (error) {
        showErrorToast(`Failed to dismiss violation: ${error.message}`);
        
        // Re-enable button only on error (modal still open)
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Dismiss';
        }
    }
}
}