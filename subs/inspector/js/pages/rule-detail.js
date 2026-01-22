/**
 * Rule Detail Page
 * Displays single rule with violations and Run button
 */

let currentRule = null;
let currentRuleViolations = [];

/**
 * Render Rule Detail Page
 */
async function renderRuleDetail(ruleId) {
    const container = document.getElementById('app-container');
    
    container.innerHTML = `
        <div class="rule-detail-container">
            <div class="breadcrumb">
                <a href="/inspector" onclick="navigateTo('/inspector'); return false;">← Back to Inspector</a>
            </div>
            
            <div id="rule-detail-content">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading rule...</p>
                </div>
            </div>
        </div>
    `;

    try {
        // Load rule and its violations
        const [ruleData, violationsData] = await Promise.all([
            InspectorAPI.getRule(ruleId),
            InspectorAPI.getViolationsForRule(ruleId)
        ]);

        currentRule = ruleData.rule;
        currentRuleViolations = violationsData;

        renderRuleDetailContent();

    } catch (error) {
        console.error('Error loading rule detail:', error);
        const content = document.getElementById('rule-detail-content');
        content.innerHTML = `
            <div class="error-container">
                <p class="error-message">Failed to load rule: ${sanitizeHtml(error.message)}</p>
                <button class="btn btn-primary" onclick="navigateTo('/inspector')">Back to Inspector</button>
            </div>
        `;
    }
}

/**
 * Render rule detail content
 */
function renderRuleDetailContent() {
    const content = document.getElementById('rule-detail-content');
    const severityConfig = getSeverityConfig(currentRule.severity);
    const categoryConfig = getRuleCategoryConfig(currentRule.rule_category);
    const stats = calculateStats(currentRuleViolations);

    content.innerHTML = `
        <div class="rule-header">
            <div class="rule-title-section">
                <h1>${sanitizeHtml(currentRule.rule_name)}</h1>
                <div class="rule-badges">
                    <span class="badge ${severityConfig.badge}">
                        ${severityConfig.icon} ${severityConfig.label}
                    </span>
                    <span class="badge ${currentRule.is_active ? 'badge-active' : 'badge-inactive'}">
                        ${currentRule.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </div>
            <div class="rule-actions-section">
                <button class="btn btn-secondary" id="edit-description-btn">
                    ✏️ Edit Description
                </button>
                <button class="btn btn-primary" id="run-rule-btn">
                    ▶ Run Rule
                </button>
                <button class="btn btn-danger" id="deactivate-rule-btn">
                    Deactivate
                </button>
            </div>
        </div>

        <div class="rule-info-grid">
            <div class="info-card">
                <h3>Description</h3>
                <p>${sanitizeHtml(currentRule.description)}</p>
            </div>

            <div class="info-card">
                <h3>Rule Details</h3>
                <dl class="detail-list">
                    <dt>Rule ID:</dt>
                    <dd>${sanitizeHtml(currentRule.rule_id)}</dd>
                    
                    <dt>Category:</dt>
                    <dd>${categoryConfig ? categoryConfig.label : currentRule.rule_category}</dd>
                    
                    <dt>Check Type:</dt>
                    <dd>${sanitizeHtml(currentRule.check_type || 'N/A')}</dd>
                    
                    <dt>Created:</dt>
                    <dd>${formatDate(currentRule.created_at)}</dd>
                    
                    <dt>Last Updated:</dt>
                    <dd>${formatDate(currentRule.updated_at)}</dd>
                    
                    <dt>Updated By:</dt>
                    <dd>${sanitizeHtml(currentRule.updated_by || 'N/A')}</dd>
                </dl>
            </div>

            <div class="info-card">
                <h3>Violation Statistics</h3>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Total</span>
                        <span class="stat-value">${stats.total}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Open</span>
                        <span class="stat-value">${stats.open}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Resolved</span>
                        <span class="stat-value">${stats.resolved}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Dismissed</span>
                        <span class="stat-value">${stats.dismissed}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="violations-section">
            <h2>Violations (${currentRuleViolations.length})</h2>
            ${renderRuleViolations()}
        </div>
    `;

    // Attach event listeners
    attachRuleDetailListeners();
}

/**
 * Render violations table for this rule
 */
function renderRuleViolations() {
    if (currentRuleViolations.length === 0) {
        return `
            <div class="empty-state">
                <p>✓ No violations found for this rule</p>
            </div>
        `;
    }

    return `
        <table class="violations-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Issue</th>
                    <th>Status</th>
                    <th>Detected</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${currentRuleViolations.map(v => {
                    const statusConfig = getStatusConfig(v.status);
                    return `
                        <tr>
                            <td>${sanitizeHtml(v.violation_details?.item_short_name || v.entity_id)}</td>
                            <td>${sanitizeHtml(truncateText(v.violation_details?.message || 'N/A', 60))}</td>
                            <td>
                                <span class="badge ${statusConfig.badge}">
                                    ${statusConfig.label}
                                </span>
                            </td>
                            <td>${formatRelativeTime(v.detected_at)}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary view-violation-btn" 
                                        data-violation-id="${v.violation_id}">
                                    View
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

/**
 * Attach event listeners
 */
function attachRuleDetailListeners() {
    // Edit description button
    const editBtn = document.getElementById('edit-description-btn');
    if (editBtn) {
        editBtn.addEventListener('click', openEditDescriptionModal);
    }

    // Run rule button
    const runBtn = document.getElementById('run-rule-btn');
    if (runBtn) {
        runBtn.addEventListener('click', runRule);
    }

    // Deactivate rule button
    const deactivateBtn = document.getElementById('deactivate-rule-btn');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', deactivateRule);
    }

    // View violation buttons
    document.querySelectorAll('.view-violation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const violationId = btn.dataset.violationId;
            openViolationDetail(violationId);
        });
    });
}

/**
 * Open edit description modal
 */
function openEditDescriptionModal() {
    const maxChars = 1000;
    const currentDescription = currentRule.description || '';
    const updatedAt = new Date().toISOString();
    
    const contentHtml = `
        <div class="form-group">
            <label for="rule-description-input">Description</label>
            <textarea 
                id="rule-description-input" 
                class="form-control" 
                rows="6"
                maxlength="${maxChars}"
                placeholder="Enter rule description..."
            >${sanitizeHtml(currentDescription)}</textarea>
            <div class="char-counter">
                <span id="char-count">${currentDescription.length}</span> / ${maxChars} characters
            </div>
        </div>
        
        <div class="form-group">
            <label>Updated By</label>
            <input 
                type="text" 
                class="form-control" 
                value="frontend-update" 
                readonly 
                disabled
            />
        </div>
        
        <div class="form-group">
            <label>Updated At</label>
            <input 
                type="text" 
                class="form-control" 
                value="${updatedAt}" 
                readonly 
                disabled
            />
        </div>
    `;
    
    const modal = showModal('Edit Rule Description', contentHtml, [
        {
            label: 'Cancel',
            action: 'cancel',
            primary: false,
            onClick: () => {}
        },
        {
            label: 'Save',
            action: 'save',
            primary: true,
            onClick: () => saveDescription(),
            closeOnClick: false
        }
    ]);
    
    // Attach character counter
    const textarea = modal.querySelector('#rule-description-input');
    const charCount = modal.querySelector('#char-count');
    if (textarea && charCount) {
        textarea.addEventListener('input', () => {
            charCount.textContent = textarea.value.length;
        });
        
        // Focus textarea
        setTimeout(() => textarea.focus(), 100);
    }
}

/**
 * Save description
 */
async function saveDescription() {
    const textarea = document.querySelector('#rule-description-input');
    if (!textarea) return;
    
    const newDescription = textarea.value.trim();
    
    if (!newDescription) {
        showErrorToast('Description cannot be empty');
        return;
    }
    
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
    }
    
    try {
        const updates = {
            description: newDescription,
            updated_by: 'frontend-update'
        };
        
        const response = await InspectorAPI.updateRule(currentRule.rule_id, updates);
        currentRule = response.rule;
        
        showSuccessToast('Description updated successfully');
        closeModal();
        renderRuleDetailContent();
        
    } catch (error) {
        console.error('Error updating description:', error);
        showErrorToast(`Failed to update description: ${error.message}`);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    }
}

/**
 * Run rule (execute evaluation)
 */
async function runRule() {
    const runBtn = document.getElementById('run-rule-btn');
    if (!runBtn) return;

    runBtn.disabled = true;
    runBtn.textContent = 'Running...';

    try {
        await InspectorAPI.executeRule(currentRule.rule_id, currentRule.rule_category);
        showSuccessToast('Rule executed successfully');

        // Reload violations after a brief delay
        setTimeout(async () => {
            currentRuleViolations = await InspectorAPI.getViolationsForRule(currentRule.rule_id);
            renderRuleDetailContent();
            
            // Re-enable button after reload
            const btn = document.getElementById('run-rule-btn');
            if (btn) {
                btn.disabled = false;
                btn.textContent = '▶ Run Rule';
            }
        }, 2000);

    } catch (error) {
        console.error('Error running rule:', error);
        showErrorToast(`Failed to run rule: ${error.message}`);
        runBtn.disabled = false;
        runBtn.textContent = '▶ Run Rule';
    }
}

/**
 * Deactivate rule
 */
async function deactivateRule() {
    showConfirmModal(
        'Deactivate Rule',
        `Are you sure you want to deactivate "${currentRule.rule_name}"? This will mark the rule as inactive.`,
        async () => {
            try {
                await InspectorAPI.deleteRule(currentRule.rule_id);
                showSuccessToast('Rule deactivated successfully');
                
                // Navigate back to dashboard
                setTimeout(() => {
                    navigateTo('/inspector');
                }, 1000);

            } catch (error) {
                console.error('Error deactivating rule:', error);
                showErrorToast(`Failed to deactivate rule: ${error.message}`);
            }
        }
    );
}

/**
 * Open violation detail page
 */
function openViolationDetail(violationId) {
    navigateTo(`/inspector/violations/${violationId}`);
}