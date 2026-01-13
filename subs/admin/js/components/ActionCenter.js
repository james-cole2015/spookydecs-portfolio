// Action Center Component
import { fetchActionItems } from '../utils/admin-api.js';

export class ActionCenter {
    constructor() {
        this.items = {
            critical: [],
            upcoming: [],
            informational: []
        };
    }

    async init() {
        try {
            this.items = await fetchActionItems();
        } catch (error) {
            console.error('Failed to load action items:', error);
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
        const hasItems = this.items.critical.length > 0 || 
                        this.items.upcoming.length > 0 || 
                        this.items.informational.length > 0;
        
        if (!hasItems) {
            return this.renderEmptyState();
        }
        
        return `
            ${this.renderSection('critical', '🔴 NEEDS ATTENTION', this.items.critical)}
            ${this.renderSection('upcoming', '🟡 UPCOMING', this.items.upcoming)}
            ${this.renderSection('informational', '🟢 INFORMATIONAL', this.items.informational)}
        `;
    }

    renderEmptyState() {
        return `
            <div class="action-center-empty">
                <div class="action-center-empty-icon">✓</div>
                <div class="action-center-empty-title">All Systems Operational</div>
                <div class="action-center-empty-subtitle">0 critical issues · 0 upcoming tasks</div>
                <a href="/admin" class="action-center-empty-action">View System Map</a>
            </div>
        `;
    }

    renderSection(severity, title, items) {
        if (items.length === 0) return '';
        
        return `
            <div class="action-section">
                <div class="action-section-header ${severity}">${title}</div>
                ${items.map(item => this.renderItem(item, severity)).join('')}
            </div>
        `;
    }

    renderItem(item, severity) {
        return `
            <div class="action-item ${severity}">
                <div class="action-item-title">${item.title}</div>
                <div class="action-item-details">${item.details}</div>
                <div class="action-item-actions">
                    ${item.actions.map(action => `
                        <a href="${action.url}" class="action-item-button">${action.label} →</a>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

// Example action items structure (for reference):
// {
//     title: "Critical Repairs Block Deployment",
//     details: "3 items flagged critical · Halloween deployment: 14 days",
//     actions: [
//         { label: "View Repairs", url: "/maintenance" }
//     ]
// }
