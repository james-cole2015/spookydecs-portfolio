/**
 * Violation Detail Modal Component
 * Allows editing notes, dismissing, and deleting violations
 */

class ViolationDetailModal {
    constructor(violation, onClose) {
        this.violation = violation;
        this.onClose = onClose;
        this.modal = null;
    }

    /**
     * Show the modal
     */
    show() {
        const contentHtml = this.renderContent();
        
        this.modal = showModal(
            'Violation Details',
            contentHtml,
            [
                {
                    label: 'Close',
                    action: 'close',
                    primary: false,
                    onClick: () => {
                        if (this.onClose) this.onClose();
                    }
                }
            ]
        );

        // Attach event listeners after modal is shown
        setTimeout(() => this.attachEventListeners(), 100);
    }

    /**
     * Render modal content
     */
    renderContent() {
        const severityConfig = getSeverityConfig(this.violation.severity);
        const statusConfig = getStatusConfig(this.violation.status);
        const details = this.violation.violation_details || {};

        return `
            <div class="violation-detail">
                <div class="violation-meta">
                    <div class="meta-row">
                        <span class="meta-label">Violation ID:</span>
                        <span class="meta-value violation-id">${sanitizeHtml(this.violation.violation_id)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Item:</span>
                        <span class="meta-value">${sanitizeHtml(details.item_short_name || this.violation.entity_id)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Entity ID:</span>
                        <span class="meta-value">${sanitizeHtml(this.violation.entity_id)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Rule:</span>
                        <span class="meta-value">${sanitizeHtml(this.violation.rule_id)}</span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Severity:</span>
                        <span class="badge ${severityConfig.badge}">
                            ${severityConfig.icon} ${severityConfig.label}
                        </span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Status:</span>
                        <span class="badge ${statusConfig.badge}">
                            ${statusConfig.label}
                        </span>
                    </div>
                    <div class="meta-row">
                        <span class="meta-label">Detected:</span>
                        <span class="meta-value">${formatDate(this.violation.detected_at)}</span>
                    </div>
                    ${this.violation.resolved_at ? `
                        <div class="meta-row">
                            <span class="meta-label">Resolved:</span>
                            <span class="meta-value">${formatDate(this.violation.resolved_at)}</span>
                        </div>
                    ` : ''}
                    ${this.violation.dismissed_at ? `
                        <div class="meta-row">
                            <span class="meta-label">Dismissed:</span>
                            <span class="meta-value">${formatDate(this.violation.dismissed_at)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="violation-message">
                    <h4>Issue</h4>
                    <p>${sanitizeHtml(details.message || 'No message available')}</p>
                </div>

                <div class="violation-notes">
                    <h4>Notes</h4>
                    <textarea id="violation-notes" 
                              rows="4" 
                              placeholder="Add notes about this violation...">${sanitizeHtml(details.notes || '')}</textarea>
                    <button class="btn btn-primary" id="save-notes-btn">Save Notes</button>
                </div>

                <div class="violation-actions">
                    <h4>Actions</h4>
                    <div class="action-buttons">
                        ${this.violation.status === 'open' ? `
                            <button class="btn btn-secondary" id="dismiss-btn">
                                Dismiss Violation
                            </button>
                        ` : ''}
                        <button class="btn btn-danger" id="delete-btn">
                            Delete Violation
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const saveNotesBtn = document.getElementById('save-notes-btn');
        if (saveNotesBtn) {
            saveNotesBtn.addEventListener('click', () => this.saveNotes());
        }

        const dismissBtn = document.getElementById('dismiss-btn');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => this.dismiss());
        }

        const deleteBtn = document.getElementById('delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.delete());
        }
    }

    /**
     * Save notes
     */
    async saveNotes() {
        const notesTextarea = document.getElementById('violation-notes');
        const notes = notesTextarea.value.trim();

        try {
            await InspectorAPI.updateViolation(this.violation.violation_id, notes);
            showSuccessToast('Notes saved successfully');
            
            // Update local violation object
            if (!this.violation.violation_details) {
                this.violation.violation_details = {};
            }
            this.violation.violation_details.notes = notes;
            
        } catch (error) {
            showErrorToast(`Failed to save notes: ${error.message}`);
        }
    }

    /**
     * Dismiss violation
     */
    async dismiss() {
        showConfirmModal(
            'Dismiss Violation',
            'Are you sure you want to dismiss this violation? It will be marked as dismissed and hidden from active violations.',
            async () => {
                try {
                    await InspectorAPI.dismissViolation(this.violation.violation_id);
                    showSuccessToast('Violation dismissed successfully');
                    closeModal();
                    if (this.onClose) this.onClose();
                } catch (error) {
                    showErrorToast(`Failed to dismiss violation: ${error.message}`);
                }
            }
        );
    }

    /**
     * Delete violation
     */
    async delete() {
        showConfirmModal(
            'Delete Violation',
            'Are you sure you want to permanently delete this violation? This action cannot be undone.',
            async () => {
                try {
                    await InspectorAPI.deleteViolation(this.violation.violation_id);
                    showSuccessToast('Violation deleted successfully');
                    closeModal();
                    if (this.onClose) this.onClose();
                } catch (error) {
                    showErrorToast(`Failed to delete violation: ${error.message}`);
                }
            }
        );
    }
}