// System Map Component
import { calculateSystemHealth, getSubdomainUrls, loadConfig } from '../utils/admin-api.js';

export class SystemMap {
    constructor() {
        this.health = {};
        this.urls = {};
        this.stats = {};
        this.container = null;
        this.subdomains = [
            {
                id: 'ideas',
                title: 'Ideas',
                description: 'Brainstorm and plan future decoration projects and seasonal themes.',
                urlKey: 'ideas',
                healthKey: 'ideas'
            },
            {
                id: 'items',
                title: 'Items',
                description: 'Manage your decoration, light, and accessory inventory.',
                urlKey: 'items',
                healthKey: 'items',
                statsKey: 'items'
            },
            {
                id: 'storage',
                title: 'Storage',
                description: 'Organize totes, bins, and storage locations across shed and garage.',
                urlKey: 'storage',
                healthKey: 'storage'
            },
            {
                id: 'deployments',
                title: 'Deployments',
                description: 'Track what\'s out and when for each holiday season.',
                urlKey: 'deployments',
                healthKey: 'deployments'
            },
            {
                id: 'finance',
                title: 'Finance',
                description: 'Track costs, receipts, and spending across all seasons.',
                urlKey: 'finance',
                healthKey: 'finance'
            },
            {
                id: 'maintenance',
                title: 'Maintenance',
                description: 'Schedule repairs, inspections, and maintenance tasks for your items.',
                urlKey: 'maintenance',
                healthKey: 'maintenance'
            },
            {
                id: 'workbench',
                title: 'Workbench',
                description: 'Project workspace for repairs, modifications, and custom builds.',
                urlKey: 'workbench',
                healthKey: 'workbench'
            },
            {
                id: 'images',
                title: 'Images',
                description: 'Visual catalog and documentation for all items.',
                urlKey: 'images',
                healthKey: 'images'
            },
            {
                id: 'gallery',
                title: 'Gallery',
                description: 'Gallery of Previous Displays, Community Displays, and Project Builds.',
                urlKey: 'gallery',
                healthKey: 'gallery',
                placeholder: true
            },
            {
                id: 'audit',
                title: 'Audit',
                description: 'Review system logs, changes, and activity across all subdomains.',
                urlKey: 'audit',
                healthKey: 'audit'
            },
            {
                id: 'inspector',
                title: 'Inspector',
                description: 'Data quality checks to identify and correct data integrity issues.',
                urlKey: 'inspector',
                healthKey: 'inspector'
            }
        ];
    }

    async init() {
        try {
            // Load health data, URLs, and stats in parallel
            [this.health, this.urls] = await Promise.all([
                calculateSystemHealth(),
                getSubdomainUrls()
            ]);
            console.log('🔍 DEBUG - Loaded URLs:', this.urls);
            console.log('🔍 DEBUG - Inspector URL:', this.urls.inspector);
            
            // Load stats for subdomains that have them
            await this.loadStats();
        } catch (error) {
            console.error('Failed to load system data:', error);
        }
    }

    async loadStats() {
        // Get API base URL from config
        const config = await loadConfig();
        const apiBase = config.API_ENDPOINT;
        
        if (!apiBase) {
            console.warn('API_ENDPOINT not configured, skipping stats load');
            return;
        }
        
        // Load stats for each subdomain that has a statsKey
        const statsPromises = this.subdomains
            .filter(subdomain => subdomain.statsKey)
            .map(async subdomain => {
                try {
                    const response = await fetch(`${apiBase}/stats/${subdomain.statsKey}`);
                    if (response.ok) {
                        const result = await response.json();
                        if (result.success) {
                            this.stats[subdomain.statsKey] = result.data;
                        }
                    }
                } catch (error) {
                    console.error(`Failed to load stats for ${subdomain.statsKey}:`, error);
                }
            });
        
        await Promise.all(statsPromises);
        console.log('📊 Loaded stats:', this.stats);
        
        // Update the UI with the loaded stats
        this.updateStats();
    }

    render() {
        this.container = document.createElement('div');
        this.container.className = 'system-map-container';
        
        this.container.innerHTML = `
            <h2 class="system-map-title">System Map</h2>
            <div class="system-map-grid">
                ${this.subdomains.map(subdomain => this.renderCard(subdomain)).join('')}
            </div>
        `;
        
        return this.container;
    }

    updateStats() {
        // Re-render cards with stats
        const grid = this.container.querySelector('.system-map-grid');
        if (grid) {
            grid.innerHTML = this.subdomains.map(subdomain => this.renderCard(subdomain)).join('');
        }
    }

    renderCard(subdomain) {
        const url = this.urls[subdomain.urlKey] || '';
        const isPlaceholder = subdomain.placeholder || !url;
        const hasStats = subdomain.statsKey && this.stats[subdomain.statsKey];
        
        return `
            <div class="system-card ${isPlaceholder ? 'system-card-placeholder' : ''}">
                <div class="system-card-header">
                    <h3 class="system-card-title">${subdomain.title}</h3>
                </div>
                <p class="system-card-description">${subdomain.description}</p>
                ${hasStats ? this.renderStats(subdomain) : ''}
                ${isPlaceholder 
                    ? `<span class="system-card-placeholder-text">Coming Soon</span>`
                    : `<a href="${url}" target="_blank" rel="noopener noreferrer" class="system-card-action">
                        View ${subdomain.title} →
                    </a>`
                }
            </div>
        `;
    }

    renderStats(subdomain) {
        const statsData = this.stats[subdomain.statsKey];
        if (!statsData) return '';
        
        // Format stats based on subdomain type
        let statsContent = '';
        
        if (subdomain.id === 'items' && statsData.total_items !== undefined) {
            statsContent = `<div class="stat-item">${statsData.total_items} total items</div>`;
        }
        
        return `
            <details class="system-card-stats">
                <summary class="stats-toggle">Quick Stats</summary>
                <div class="stats-content">
                    ${statsContent}
                </div>
            </details>
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