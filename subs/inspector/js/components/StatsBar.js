/**
 * Stats Bar Component
 * Displays violation count statistics
 */

class StatsBar {
    constructor(container) {
        this.container = container;
        this.filters = {};
        this.stats = {
            total: 0,
            critical: 0,
            attention: 0,
            warning: 0,
            info: 0
        };
    }

    /**
     * Load stats from violations with optional filters
     */
    async loadStats(filters = {}) {
        try {
            this.filters = filters;
            let violations;

            // If filters are provided, use filtered API call
            if (filters.status || filters.severity || filters.rule_id) {
                violations = await this.fetchFilteredViolations(filters);
            } else {
                violations = await InspectorAPI.getAllViolations();
            }

            this.stats = calculateStats(violations);
            this.render();
        } catch (error) {
            console.error('Error loading stats:', error);
            showErrorToast('Failed to load statistics');
        }
    }

    /**
     * Fetch all violations matching filters (handles pagination)
     */
    async fetchFilteredViolations(filters) {
        const allViolations = [];
        let lastKey = null;
        let hasMore = true;

        while (hasMore) {
            const result = await InspectorAPI.getViolations({
                ...filters,
                limit: 100,
                lastKey: lastKey
            });

            allViolations.push(...result.violations);
            lastKey = result.lastKey;
            hasMore = result.hasMore;
        }

        return allViolations;
    }

    /**
     * Apply filters and reload stats
     */
    async applyFilters(filters) {
        await this.loadStats(filters);
    }

    /**
     * Update stats with provided data
     */
    updateStats(violations) {
        this.stats = calculateStats(violations);
        this.render();
    }

    /**
     * Render stats bar
     */
    render() {
        const criticalConfig = getSeverityConfig('Critical');
        const attentionConfig = getSeverityConfig('Attention');
        const warningConfig = getSeverityConfig('Warning');
        const infoConfig = getSeverityConfig('Info');

        this.container.innerHTML = `
            <div class="stats-bar">
                <div class="stat-card stat-total">
                    <div class="stat-label">Total</div>
                    <div class="stat-value">${this.stats.total}</div>
                </div>
                <div class="stat-card stat-critical">
                    <div class="stat-label">${criticalConfig.icon} Critical</div>
                    <div class="stat-value">${this.stats.critical}</div>
                </div>
                <div class="stat-card stat-attention">
                    <div class="stat-label">${attentionConfig.icon} Attention</div>
                    <div class="stat-value">${this.stats.attention}</div>
                </div>
                <div class="stat-card stat-warning">
                    <div class="stat-label">${warningConfig.icon} Warning</div>
                    <div class="stat-value">${this.stats.warning}</div>
                </div>
                <div class="stat-card stat-info">
                    <div class="stat-label">${infoConfig.icon} Info</div>
                    <div class="stat-value">${this.stats.info}</div>
                </div>
            </div>
        `;
    }
}
