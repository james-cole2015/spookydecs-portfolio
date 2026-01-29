// System Map Component
import { calculateSystemHealth, getSubdomainUrls } from '../utils/admin-api.js';

export class SystemMap {
    constructor() {
        this.health = {};
        this.urls = {};
        this.subdomains = [
            {
                id: 'ideas',
                icon: '💡',
                title: 'Ideas',
                description: 'Brainstorm and plan future decoration projects and seasonal themes.',
                urlKey: 'ideas',
                healthKey: 'ideas'
            },
            {
                id: 'items',
                icon: '📦',
                title: 'Items',
                description: 'Manage your decoration, light, and accessory inventory.',
                urlKey: 'items',
                healthKey: 'items'
            },
            {
                id: 'storage',
                icon: '🗄️',
                title: 'Storage',
                description: 'Organize totes, bins, and storage locations across shed and garage.',
                urlKey: 'storage',
                healthKey: 'storage'
            },
            {
                id: 'deployments',
                icon: '🎯',
                title: 'Deployments',
                description: 'Track what\'s out and when for each holiday season.',
                urlKey: 'deployments',
                healthKey: 'deployments'
            },
            {
                id: 'finance',
                icon: '💰',
                title: 'Finance',
                description: 'Track costs, receipts, and spending across all seasons.',
                urlKey: 'finance',
                healthKey: 'finance'
            },
            {
                id: 'maintenance',
                icon: '🔧',
                title: 'Maintenance',
                description: 'Schedule repairs, inspections, and maintenance tasks for your items.',
                urlKey: 'maintenance',
                healthKey: 'maintenance'
            },
            {
                id: 'workbench',
                icon: '🛠️',
                title: 'Workbench',
                description: 'Project workspace for repairs, modifications, and custom builds.',
                urlKey: 'workbench',
                healthKey: 'workbench'
            },
            {
                id: 'images',
                icon: '📸',
                title: 'Images',
                description: 'Visual catalog and documentation for all items.',
                urlKey: 'images',
                healthKey: 'images'
            },
            {
                id: 'gallery',
                icon: '🖼️',
                title: 'Gallery',
                description: 'Gallery of Previous Displays, Community Displays, and Project Builds.',
                urlKey: 'gallery',
                healthKey: 'gallery',
                placeholder: true
            },
            {
                id: 'audit',
                icon: '📋',
                title: 'Audit',
                description: 'Review system logs, changes, and activity across all subdomains.',
                urlKey: 'audit',
                healthKey: 'audit'
            },
            {
                id: 'inspector',
                icon: '🔍',
                title: 'Inspector',
                description: 'Data quality checks to identify and correct data integrity issues.',
                urlKey: 'inspector',
                healthKey: 'inspector'
            }
        ];
    }

    async init() {
        try {
            // Load both health data and URLs in parallel
            [this.health, this.urls] = await Promise.all([
                calculateSystemHealth(),
                getSubdomainUrls()
            ]);
                    console.log('🔍 DEBUG - Loaded URLs:', this.urls);  // Add this
        console.log('🔍 DEBUG - Inspector URL:', this.urls.inspector);  // And this
        } catch (error) {
            console.error('Failed to load system data:', error);
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
        const url = this.urls[subdomain.urlKey] || '';
        const isPlaceholder = subdomain.placeholder || !url;
        
        return `
            <div class="system-card ${isPlaceholder ? 'system-card-placeholder' : ''}">
                <div class="system-card-header">
                    <span class="system-card-icon">${subdomain.icon}</span>
                    <h3 class="system-card-title">${subdomain.title}</h3>
                    <span class="system-card-health">${healthIcon}</span>
                </div>
                <p class="system-card-description">${subdomain.description}</p>
                ${isPlaceholder 
                    ? `<span class="system-card-placeholder-text">Coming Soon</span>`
                    : `<a href="${url}" target="_blank" rel="noopener noreferrer" class="system-card-action">
                        View ${subdomain.title} →
                    </a>`
                }
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