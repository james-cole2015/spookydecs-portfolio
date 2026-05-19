// Action Center Component
import { fetchInspectorStats, fetchWorkbenchStats, getSubdomainUrls } from '../utils/admin-api.js';

export class ActionCenter {
    constructor() {
        this.inspectorStats = null;
        this.workbenchStats = null;
        this.subdomainUrls = null;
        this.loading = true;
        this.error = null;
    }

    async init() {
        try {
            // Fetch all data in parallel
            const [inspector, workbench, urls] = await Promise.all([
                fetchInspectorStats(),
                fetchWorkbenchStats(),
                getSubdomainUrls()
            ]);
            
            this.inspectorStats = inspector;
            this.workbenchStats = workbench;
            this.subdomainUrls = urls;
            this.loading = false;
        } catch (error) {
            console.error('Failed to load action center data:', error);
            this.error = error.message;
            this.loading = false;
        }
    }

    render() {
        const container = document.createElement('div');
        container.className = 'action-center-container';
        
        container.innerHTML = `
            <div class="action-center-header">
                <h2 class="action-center-title">Action Center</h2>
            </div>
            <div class="action-center-content">
                ${this.renderContent()}
            </div>
        `;
        
        return container;
    }

    renderContent() {
        if (this.loading) {
            return this.renderLoading();
        }
        
        if (this.error) {
            return this.renderError();
        }
        
        return `
            <div class="action-center-grid">
                ${this.renderInspectorSection()}
                ${this.renderWorkbenchSection()}
            </div>
        `;
    }

    renderLoading() {
        return `
            <div class="action-center-loading">
                <div class="spinner"></div>
                <p>Loading action center...</p>
            </div>
        `;
    }

    renderError() {
        return `
            <div class="action-center-error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">Failed to load action center</div>
                <div class="error-details">${this.error}</div>
            </div>
        `;
    }

    renderInspectorSection() {
        if (!this.inspectorStats) {
            return '';
        }

        const { by_resolution_mode = {}, total_open = 0 } = this.inspectorStats;
        const inspectorUrl = this.subdomainUrls?.inspector || '#';

        return `
            <div class="action-section inspector-section">
                <div class="action-section-header">
                    <span class="action-section-icon">🔍</span>
                    <span class="action-section-title"><strong>Inspector</strong> - Data Quality and Readiness</span>
                </div>

                <div class="action-section-body">
                    <div class="stats-list">
                        <div class="stat-item total">
                            <span class="stat-icon">🔴</span>
                            <span class="stat-count">${total_open}</span>
                            <span class="stat-label">Open</span>
                        </div>

                        <div class="stat-item unanalyzed">
                            <span class="stat-icon">🟠</span>
                            <span class="stat-count">${by_resolution_mode.unanalyzed || 0}</span>
                            <span class="stat-label">Unanalyzed</span>
                        </div>

                        <div class="stat-item auto-resolved">
                            <span class="stat-icon">🟡</span>
                            <span class="stat-count">${by_resolution_mode.auto_resolved || 0}</span>
                            <span class="stat-label">Auto-resolved</span>
                        </div>

                        <div class="stat-item dismissed">
                            <span class="stat-icon">🟢</span>
                            <span class="stat-count">${by_resolution_mode.dismissed || 0}</span>
                            <span class="stat-label">Dismissed</span>
                        </div>
                    </div>
                    
                    <div class="action-section-footer">
                        <a href="${inspectorUrl}" class="action-button primary">
                            View Violations →
                        </a>
                    </div>
                </div>
            </div>
        `;
    }

    renderWorkbenchSection() {
        if (!this.workbenchStats) {
            return '';
        }

        const { active, scheduled, completed } = this.workbenchStats;
        const workbenchUrl = this.subdomainUrls?.workbench || '#';

        return `
            <div class="action-section workbench-section">
                <div class="action-section-header">
                    <span class="action-section-icon">🔧</span>
                    <span class="action-section-title"><strong>Workbench</strong> - Off-Season Operations</span>
                </div>
                
                <div class="action-section-body">
                    <div class="stats-list">
                        <div class="stat-item active">
                            <span class="stat-icon">⚙️</span>
                            <span class="stat-count">${active || 0}</span>
                            <span class="stat-label">Active Repairs</span>
                        </div>
                        
                        <div class="stat-item scheduled">
                            <span class="stat-icon">📅</span>
                            <span class="stat-count">${scheduled || 0}</span>
                            <span class="stat-label">Scheduled Builds</span>
                        </div>
                        
                        <div class="stat-item completed">
                            <span class="stat-icon">✓</span>
                            <span class="stat-count">${completed || 0}</span>
                            <span class="stat-label">Completed (90 days)</span>
                        </div>
                    </div>
                    
                    <div class="action-section-footer">
                        <a href="${workbenchUrl}" class="action-button secondary">
                            View Workbench →
                        </a>
                    </div>
                </div>
            </div>
        `;
    }
}