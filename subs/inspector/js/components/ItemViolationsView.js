/**
 * Item Violations View Component
 * Displays violations grouped by item
 */

class ItemViolationsView {
    constructor(container) {
        this.container = container;
        this.items = [];
        this.violations = [];
    }

    /**
     * Load and display item violations
     */
    async load() {
        try {
            this.renderLoading();
            
            // Load all violations
            this.violations = await InspectorAPI.getAllViolations();
            
            // Group by item
            this.items = groupViolationsByItem(this.violations);
            
            // Sort by total violations (descending)
            this.items.sort((a, b) => b.violations.length - a.violations.length);
            
            this.render();
            
        } catch (error) {
            console.error('Error loading item violations:', error);
            this.renderError(error.message);
        }
    }

    /**
     * Open violation detail page
     */
    openViolationDetail(violationId) {
        navigateTo(`/inspector/violations/${violationId}`);
    }

    /**
     * Render loading state
     */
    renderLoading() {
        this.container.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading items...</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError(message) {
        this.container.innerHTML = `
            <div class="error-container">
                <p class="error-message">Error loading items: ${sanitizeHtml(message)}</p>
                <button class="btn btn-primary" onclick="location.reload()">Retry</button>
            </div>
        `;
    }

    /**
     * Render item violations view
     */
    render() {
        if (this.items.length === 0) {
            this.container.innerHTML = `
                <div class="empty-state">
                    <p>✓ No items with violations found</p>
                </div>
            `;
            return;
        }

        let html = '<div class="item-violations-list">';

        this.items.forEach(item => {
            const stats = calculateStats(item.violations);
            const criticalCount = stats.critical;
            const attentionCount = stats.attention;
            const warningCount = stats.warning;
            const infoCount = stats.info;

            html += `
                <div class="item-card">
                    <div class="item-header">
                        <div class="item-info">
                            <h4>${sanitizeHtml(item.short_name)}</h4>
                            <span class="item-id">${sanitizeHtml(item.entity_id)}</span>
                        </div>
                        <div class="item-stats">
                            ${criticalCount > 0 ? `<span class="badge severity-critical">🔴 ${criticalCount}</span>` : ''}
                            ${attentionCount > 0 ? `<span class="badge severity-attention">🟡 ${attentionCount}</span>` : ''}
                            ${warningCount > 0 ? `<span class="badge severity-warning">🟡 ${warningCount}</span>` : ''}
                            ${infoCount > 0 ? `<span class="badge severity-info">🔵 ${infoCount}</span>` : ''}
                        </div>
                    </div>
                    
                    <div class="item-violations">
                        ${this.renderItemViolations(item.violations)}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        this.container.innerHTML = html;

        // Attach event listeners
        this.attachEventListeners();
    }

    /**
     * Render violations for an item
     */
    renderItemViolations(violations) {
        return `
            <table class="violations-table-mini">
                <thead>
                    <tr>
                        <th>Rule</th>
                        <th>Issue</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${violations.map(v => {
                        const severityConfig = getSeverityConfig(v.severity);
                        const statusConfig = getStatusConfig(v.status);
                        
                        return `
                            <tr>
                                <td>${sanitizeHtml(truncateText(v.rule_id, 25))}</td>
                                <td>${sanitizeHtml(truncateText(v.violation_details?.message || 'N/A', 40))}</td>
                                <td>
                                    <span class="badge ${severityConfig.badge}">
                                        ${severityConfig.icon} ${severityConfig.label}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${statusConfig.badge}">
                                        ${statusConfig.label}
                                    </span>
                                </td>
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
    attachEventListeners() {
        this.container.querySelectorAll('.view-violation-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const violationId = btn.dataset.violationId;
                this.openViolationDetail(violationId);
            });
        });
    }
}