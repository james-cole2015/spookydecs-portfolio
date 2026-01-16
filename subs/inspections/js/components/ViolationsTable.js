/**
 * Violations Table Component
 * Displays violations in a table with infinite scroll
 */

class ViolationsTable {
    constructor(container) {
        this.container = container;
        this.violations = [];
        this.lastKey = null;
        this.hasMore = true;
        this.loading = false;
        this.filters = getFiltersFromUrl();
    }

    /**
     * Initialize and load first page
     */
    async initialize() {
        this.violations = [];
        this.lastKey = null;
        this.hasMore = true;
        
        this.renderFilters();
        await this.loadMore();
        this.setupInfiniteScroll();
    }

    /**
     * Load more violations
     */
    async loadMore() {
        if (this.loading || !this.hasMore) return;

        this.loading = true;
        this.renderLoadingIndicator();

        try {
            const result = await InspectorAPI.getViolations({
                ...this.filters,
                limit: 25,
                lastKey: this.lastKey
            });

            this.violations.push(...result.violations);
            this.lastKey = result.lastKey;
            this.hasMore = result.hasMore;

            this.render();
            
        } catch (error) {
            console.error('Error loading violations:', error);
            showErrorToast('Failed to load violations');
        } finally {
            this.loading = false;
        }
    }

    /**
     * Setup infinite scroll
     */
    setupInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.hasMore && !this.loading) {
                    this.loadMore();
                }
            });
        }, {
            root: null,
            threshold: 0.1
        });

        // Observe the scroll trigger element
        const trigger = this.container.querySelector('.scroll-trigger');
        if (trigger) {
            observer.observe(trigger);
        }

        // Store observer to disconnect later if needed
        this.scrollObserver = observer;
    }

    /**
     * Apply filters
     */
    async applyFilters(filters) {
        this.filters = filters;
        setFilters(filters);
        
        // Reset and reload
        this.violations = [];
        this.lastKey = null;
        this.hasMore = true;
        
        await this.loadMore();
    }

    /**
     * Clear filters
     */
    async clearAllFilters() {
        this.filters = {
            status: null,
            severity: null,
            rule_id: null
        };
        clearFilters();
        
        // Reset and reload
        this.violations = [];
        this.lastKey = null;
        this.hasMore = true;
        
        await this.loadMore();
    }

    /**
     * Open violation detail page
     */
    openViolationDetail(violationId) {
        navigateTo(`/inspector/violations/${violationId}`);
    }

    /**
     * Render filters
     */
    renderFilters() {
        const filtersContainer = document.getElementById('violations-filters');
        if (!filtersContainer) return;

        filtersContainer.innerHTML = `
            <div class="filters-bar">
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="filter-status">
                        <option value="">All</option>
                        <option value="open" ${this.filters.status === 'open' ? 'selected' : ''}>Open</option>
                        <option value="resolved" ${this.filters.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="dismissed" ${this.filters.status === 'dismissed' ? 'selected' : ''}>Dismissed</option>
                    </select>
                </div>
                
                <div class="filter-group">
                    <label>Severity:</label>
                    <select id="filter-severity">
                        <option value="">All</option>
                        <option value="Critical" ${this.filters.severity === 'Critical' ? 'selected' : ''}>Critical</option>
                        <option value="Attention" ${this.filters.severity === 'Attention' ? 'selected' : ''}>Attention</option>
                        <option value="Warning" ${this.filters.severity === 'Warning' ? 'selected' : ''}>Warning</option>
                        <option value="Info" ${this.filters.severity === 'Info' ? 'selected' : ''}>Info</option>
                    </select>
                </div>
                
                <button class="btn btn-secondary" id="clear-filters-btn">Clear Filters</button>
            </div>
        `;

        // Attach filter listeners
        document.getElementById('filter-status').addEventListener('change', (e) => {
            this.applyFilters({
                ...this.filters,
                status: e.target.value || null
            });
        });

        document.getElementById('filter-severity').addEventListener('change', (e) => {
            this.applyFilters({
                ...this.filters,
                severity: e.target.value || null
            });
        });

        document.getElementById('clear-filters-btn').addEventListener('click', () => {
            this.clearAllFilters();
        });
    }

    /**
     * Render violations table
     */
    render() {
        const tableContainer = document.getElementById('violations-table-container');
        if (!tableContainer) return;

        if (this.violations.length === 0 && !this.loading) {
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <p>No violations found</p>
                </div>
            `;
            return;
        }

        tableContainer.innerHTML = `
            <table class="violations-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Rule</th>
                        <th>Issue</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Detected</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.violations.map(v => this.renderViolationRow(v)).join('')}
                </tbody>
            </table>
            <div class="scroll-trigger"></div>
            ${this.loading ? '<div class="loading-more">Loading more...</div>' : ''}
            ${!this.hasMore && this.violations.length > 0 ? '<div class="end-of-list">End of list</div>' : ''}
        `;

        // Attach row click listeners
        tableContainer.querySelectorAll('.violation-row').forEach(row => {
            row.addEventListener('click', () => {
                const violationId = row.dataset.violationId;
                this.openViolationDetail(violationId);
            });
        });
    }

    /**
     * Render single violation row
     */
    renderViolationRow(violation) {
        const severityConfig = getSeverityConfig(violation.severity);
        const statusConfig = getStatusConfig(violation.status);

        return `
            <tr class="violation-row" data-violation-id="${violation.violation_id}">
                <td>${sanitizeHtml(violation.violation_details?.item_short_name || violation.entity_id)}</td>
                <td>${sanitizeHtml(truncateText(violation.rule_id, 30))}</td>
                <td>${sanitizeHtml(truncateText(violation.violation_details?.message || 'N/A', 50))}</td>
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
                <td>${formatRelativeTime(violation.detected_at)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary">View</button>
                </td>
            </tr>
        `;
    }

    /**
     * Render loading indicator
     */
    renderLoadingIndicator() {
        const tableContainer = document.getElementById('violations-table-container');
        if (!tableContainer) return;

        if (this.violations.length === 0) {
            tableContainer.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading violations...</p>
                </div>
            `;
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        if (this.scrollObserver) {
            this.scrollObserver.disconnect();
        }
    }
}