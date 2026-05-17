/**
 * Stats Bar Component
 * Displays open violation counts grouped by resolution_mode
 */

class StatsBar {
    constructor(container) {
        this.container = container;
        this.stats = null;
    }

    async loadStats() {
        try {
            this.stats = await InspectorAPI.getStats();
            this.render();
        } catch (error) {
            console.error('Error loading stats:', error);
            showErrorToast('Failed to load statistics');
        }
    }

    render() {
        if (!this.stats) return;

        const modes = InspectorConfig.RESOLUTION_MODE;
        const byMode = this.stats.by_resolution_mode || {};

        const modeCells = Object.entries(modes).map(([key, cfg]) => `
            <div class="stat-card stat-${key}">
                <div class="stat-label">${cfg.label}</div>
                <div class="stat-value">${byMode[key] ?? 0}</div>
            </div>
        `).join('');

        this.container.innerHTML = `
            <div class="stats-bar">
                <div class="stat-card stat-total">
                    <div class="stat-label">Open</div>
                    <div class="stat-value">${this.stats.total_open ?? 0}</div>
                </div>
                ${modeCells}
            </div>
        `;
    }
}
