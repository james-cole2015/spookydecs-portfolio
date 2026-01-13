// System Map Component
import { calculateSystemHealth } from '../utils/admin-api.js';

export class SystemMap {
    constructor() {
        this.health = {};
        this.subdomains = [
            {
                id: 'items',
                icon: '📦',
                title: 'Items',
                description: 'Manage your decoration, light, and accessory inventory.',
                url: '/items',
                healthKey: 'items'
            },
            {
                id: 'storage',
                icon: '🗄️',
                title: 'Storage',
                description: 'Organize totes, bins, and storage locations across shed and garage.',
                url: '/storage',
                healthKey: 'storage'
            },
            {
                id: 'deployments',
                icon: '🎯',
                title: 'Deployments',
                description: 'Track what\'s out and when for each holiday season.',
                url: '/deployments',
                healthKey: 'deployments'
            },
            {
                id: 'finance',
                icon: '💰',
                title: 'Finance',
                description: 'Track costs, receipts, and spending across all seasons.',
                url: '/finance',
                healthKey: 'finance'
            },
            {
                id: 'maintenance',
                icon: '🔧',
                title: 'Maintenance',
                description: 'Schedule repairs, inspections, and maintenance tasks for your items.',
                url: '/maintenance-records',
                healthKey: 'maintenance'
            },
            {
                id: 'photos',
                icon: '📸',
                title: 'Photos',
                description: 'Visual catalog and documentation for all items.',
                url: '/photos',
                healthKey: 'photos'
            }
        ];
    }

    async init() {
        try {
            this.health = await calculateSystemHealth();
        } catch (error) {
            console.error('Failed to load system health:', error);
        }
    }

    render() {
        const container = document.createElement('div');
        container.className = 'system-map-container';
        
        container.innerHTML = `
            <h2 class="system-map-title">System Map</h2>
            <div class="system-map-grid">
                ${this.subdomains.map(subdomain => this.renderCard(subdomain)).join('')}
            </div>
        `;
        
        return container;
    }

    renderCard(subdomain) {
        const healthData = this.health[subdomain.healthKey] || { healthy: true };
        const healthIcon = this.getHealthIcon(healthData);
        
        return `
            <div class="system-card">
                <div class="system-card-header">
                    <span class="system-card-icon">${subdomain.icon}</span>
                    <h3 class="system-card-title">${subdomain.title}</h3>
                    <span class="system-card-health">${healthIcon}</span>
                </div>
                <p class="system-card-description">${subdomain.description}</p>
                <a href="${subdomain.url}" class="system-card-action">
                    View ${subdomain.title} →
                </a>
            </div>
        `;
    }

    getHealthIcon(healthData) {
        // Determine health status based on data
        if (healthData.healthy === false) {
            return '⚠️';
        }
        return '✅';
    }
}
