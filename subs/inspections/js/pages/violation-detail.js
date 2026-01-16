/**
 * Violation Detail Page
 * Displays single violation with full details and actions
 */

let currentViolation = null;

/**
 * Render Violation Detail Page
 */
async function renderViolationDetail(violationId) {
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="violation-detail-page">
            <div class="breadcrumb">
                <a href="#" onclick="history.back(); return false;">← Back</a>
            </div>
            
            <div id="violation-content">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading violation...</p>
                </div>
            </div>
        </div>
    `;

    try {
        // Load violation
        const violationData = await InspectorAPI.getViolation(violationId);
        currentViolation = violationData.violation;

        renderViolationContent();

    } catch (error) {
        console.error('Error loading violation:', error);
        const content = document.getElementById('violation-content');
        content.innerHTML = `
            <div class="error-container">
                <p class="error-message">Failed to load violation: ${sanitizeHtml(error.message)}</p>
                <button class="btn btn-primary" onclick="history.back()">Go Back</button>
            </div>
        `;
    }
}

/**
 * Render violation content
 */
function renderViolationContent() {
    const content = document.getElementById('violation-content');
    const severityConfig = getSeverityConfig(currentViolation.severity);
    const statusConfig = getStatusConfig(currentViolation.status);
    const details = currentViolation.violation_details || {};

    const canDismiss = currentViolation.severity !== 'Critical' && currentViolation.status === 'open';

    content.innerHTML = `
        <div class="violation-page-header">
            <div class="violation-title-section">
                <h1>Violation Details</h1>
                <div class="violation-badges">
                    <span class="badge ${severityConfig.badge}">
                        ${severityConfig.icon} ${severityConfig.label}
                    </span>
                    <span class="badge ${statusConfig.badge}">
                        ${statusConfig.label}
                    </span>
                </div>
            </div>
            
            <div class="violation-header-actions">
                <button 
                    class="btn btn-secondary" 
                    id="dismiss-violation-btn"
                    ${!canDismiss ? 'disabled' : ''}
                    ${!canDismiss && currentViolation.severity === 'Critical' ? 'title="Critical violations cannot be dismissed"' : ''}
                >
                    Dismiss
                </button>
            </div>
        </div>

        <div class="violation-content-grid">
            <!-- Left Column: Metadata -->
            <div class="violation-metadata-card">
                <h3>Metadata</h3>
                <dl class="detail-list">
                    <dt>Violation ID:</dt>
                    <dd class="violation-id">${sanitizeHtml(currentViolation.violation_id)}</dd>
                    
                    <dt>Item:</dt>
                    <dd>${sanitizeHtml(details.item_short_name || currentViolation.entity_id)}</dd>
                    
                    <dt>Entity ID:</dt>
                    <dd>${sanitizeHtml(currentViolation.entity_id)}</dd>
                    
                    <dt>Entity Type:</dt>
                    <dd>${sanitizeHtml(currentViolation.entity_type)}</dd>
                    
                    <dt>Rule ID:</dt>
                    <dd>${sanitizeHtml(currentViolation.rule_id)}</dd>
                    
                    <dt>Detected:</dt>
                    <dd>${formatDate(currentViolation.detected_at)}</dd>
                    
                    <dt>Last Evaluated:</dt>
                    <dd>${formatDate(currentViolation.last_evaluated_at)}</dd>
                    
                    ${currentViolation.resolved_at ? `
                        <dt>Resolved:</dt>
                        <dd>${formatDate(currentViolation.resolved_at)}</dd>
                    ` : ''}
                    
                    ${currentViolation.dismissed_at ? `
                        <dt>Dismissed:</dt>
                        <dd>${formatDate(currentViolation.dismissed_at)}</dd>
                        <dt>Dismissed By:</dt>
                        <dd>${sanitizeHtml(currentViolation.dismissed_by || 'N/A')}</dd>
                        ${currentViolation.violation_details?.dismissal_notes ? `
                            <dt>Dismissal Reason:</dt>
                            <dd>${sanitizeHtml(currentViolation.violation_details.dismissal_notes)}</dd>
                        ` : ''}
                    ` : ''}
                    
                    <dt>Updated:</dt>
                    <dd>${formatDate(currentViolation.updated_at)}</dd>
                    
                    ${currentViolation.updated_by ? `
                        <dt>Updated By:</dt>
                        <dd>${sanitizeHtml(currentViolation.updated_by)}</dd>
                    ` : ''}
                </dl>
            </div>

            <!-- Right Column: Issue & Actions -->
            <div class="violation-main-content">
                <div class="violation-issue-card">
                    <h3>Issue Description</h3>
                    <p class="violation-message">${sanitizeHtml(details.message || 'No message available')}</p>
                </div>

                <div class="violation-notes-card">
                    <h3>Notes</h3>
                    <textarea id="violation-notes" 
                              rows="6" 
                              placeholder="Add notes about this violation...">${sanitizeHtml(details.notes || '')}</textarea>
                    <button class="btn btn-primary" id="save-notes-btn">
                        Save Notes
                    </button>
                </div>

                <div class="violation-actions-card">
                    <h3>Actions</h3>
                    
                    ${currentViolation.severity === 'Critical' && currentViolation.status === 'open' ? `
                        <div class="critical-notice">
                            ⚠️ <strong>Critical violations cannot be dismissed.</strong>
                            <p>Please fix the issue or contact admin to adjust the rule severity.</p>
                        </div>
                    ` : ''}
                    
                    <div class="delete-section">
                        <button class="btn btn-danger" id="delete-btn">
                            Delete Violation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Attach event listeners
    attachViolationDetailListeners();
}

/**
 * Attach event listeners
 */
function attachViolationDetailListeners() {
    // Save notes
    const saveNotesBtn = document.getElementById('save-notes-btn');
    if (saveNotesBtn) {
        saveNotesBtn.addEventListener('click', saveViolationNotes);
    }

    // Dismiss button (opens modal)
    const dismissBtn = document.getElementById('dismiss-violation-btn');
    if (dismissBtn && !dismissBtn.disabled) {
        dismissBtn.addEventListener('click', openDismissModal);
    }

    // Delete
    const deleteBtn = document.getElementById('delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteViolation);
    }
}

/**
 * Open dismiss modal
 */
function openDismissModal() {
    const modal = new DismissViolationModal(currentViolation, handleDismissSuccess);
    modal.show();
}

/**
 * Handle successful dismissal
 */
async function handleDismissSuccess() {
    // Reload the violation to show updated status
    try {
        const violationData = await InspectorAPI.getViolation(currentViolation.violation_id);
        currentViolation = violationData.violation;
        renderViolationContent();
    } catch (error) {
        console.error('Error reloading violation:', error);
        showErrorToast('Failed to refresh violation details');
    }
}

/**
 * Save violation notes
 */
async function saveViolationNotes() {
    const notesTextarea = document.getElementById('violation-notes');
    const notes = notesTextarea.value.trim();
    const saveBtn = document.getElementById('save-notes-btn');

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        await InspectorAPI.updateViolation(currentViolation.violation_id, notes);
        showSuccessToast('Notes saved successfully');
        
        // Update local violation
        if (!currentViolation.violation_details) {
            currentViolation.violation_details = {};
        }
        currentViolation.violation_details.notes = notes;
        
    } catch (error) {
        showErrorToast(`Failed to save notes: ${error.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Notes';
    }
}

/**
 * Delete violation
 */
async function deleteViolation() {
    showConfirmModal(
        'Delete Violation',
        'Are you sure you want to permanently delete this violation? This action cannot be undone.',
        async () => {
            try {
                await InspectorAPI.deleteViolation(currentViolation.violation_id);
                showSuccessToast('Violation deleted successfully');
                
                // Navigate back after brief delay
                setTimeout(() => {
                    history.back();
                }, 1000);
                
            } catch (error) {
                showErrorToast(`Failed to delete violation: ${error.message}`);
            }
        }
    );
}