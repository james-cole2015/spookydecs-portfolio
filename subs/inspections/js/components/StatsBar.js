/**
 * Stats Bar Component
 * Displays violation count statistics
 */

class StatsBar {
    constructor(container) {
        this.container = container;
        this.stats = {
            total: 0,
            critical: 0,
            attention: 0,
            warning: 0,
            info: 0
        };
    }

    /**
     * Load stats from violations
     */
    async loadStats() {
        try {
            const violations = await InspectorAPI.getAllViolations();
            this.stats = calculateStats(violations);
            this.render();
        } catch (error) {
            console.error('Error loading stats:', error);
            showErrorToast('Failed to load statistics');
        }
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
        const infoConfig = getSeverityConfig('Info');

        // Combine attention and warning counts
        const warningCount = this.stats.attention + this.stats.warning;

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
                <div class="stat-card stat-warning">
                    <div class="stat-label">${attentionConfig.icon} Warnings</div>
                    <div class="stat-value">${warningCount}</div>
                </div>
                <div class="stat-card stat-info">
                    <div class="stat-label">${infoConfig.icon} Info</div>
                    <div class="stat-value">${this.stats.info}</div>
                </div>
            </div>
        `;
    }
}
