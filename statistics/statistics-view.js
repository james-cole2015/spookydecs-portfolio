// Statistics View Controller

class StatisticsView {
    constructor() {
        this.currentTab = 'overview';
        this.inProgressDeployment = null;
        this.selectedCompletedDeployment = null;
        this.completedDeployments = [];
        
        this.init();
    }

    async init() {
        console.log('Initializing Statistics View');
        await this.loadDeployments();
        this.renderView();
        this.attachEventListeners();
    }

    async loadDeployments() {
        try {
            const deployments = await API.listDeployments();
            
            // Find in-progress deployment
            this.inProgressDeployment = deployments.find(d => d.status === 'in_progress') || null;
            
            // Get completed deployments
            this.completedDeployments = deployments
                .filter(d => d.status === 'complete')
                .sort((a, b) => {
                    const dateA = new Date(a.setup_completed_at || a.updated_at);
                    const dateB = new Date(b.setup_completed_at || b.updated_at);
                    return dateB - dateA; // Most recent first
                });
            
            console.log('In-progress:', this.inProgressDeployment?.id || 'None');
            console.log('Completed:', this.completedDeployments.length);
        } catch (error) {
            console.error('Failed to load deployments:', error);
            UIUtils.showToast('Failed to load deployments', 'error');
        }
    }

    renderView() {
        const container = document.getElementById('statistics-view');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-lg shadow">
                <!-- Header -->
                <div class="border-b border-gray-200 px-4 sm:px-6 py-4">
                    <h2 class="text-xl sm:text-2xl font-bold text-gray-900">Statistics Dashboard</h2>
                </div>

                <!-- Tabs -->
                <div class="border-b border-gray-200 px-4 sm:px-6 overflow-x-auto">
                    <nav class="flex space-x-4 sm:space-x-8 min-w-max" aria-label="Tabs">
                        <button 
                            class="stats-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${this.currentTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                            data-tab="overview"
                        >
                            Overview
                        </button>
                        <button 
                            class="stats-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${this.currentTab === 'sessions' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                            data-tab="sessions"
                        >
                            Sessions
                        </button>
                        <button 
                            class="stats-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${this.currentTab === 'zones' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                            data-tab="zones"
                        >
                            Zones
                        </button>
                    </nav>
                </div>

                <!-- Content -->
                <div class="p-4 sm:p-6">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        <!-- Left Column: In-Progress -->
                        <div>
                            <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">In-Progress Deployment</h3>
                            <div id="stats-left-column">
                                ${this.renderLeftColumn()}
                            </div>
                        </div>

                        <!-- Right Column: Completed -->
                        <div>
                            <h3 class="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Completed Deployment</h3>
                            <div id="stats-right-column">
                                ${this.renderRightColumn()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderLeftColumn() {
        if (!this.inProgressDeployment) {
            return `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p class="text-gray-500">No active deployment</p>
                    <p class="text-sm text-gray-400 mt-2">Start a new deployment to see statistics</p>
                </div>
            `;
        }

        const deployment = this.inProgressDeployment;
        
        // Deployment header (consistent with right column)
        const headerHTML = `
            <div class="mb-4">
                <div class="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <p class="font-semibold text-gray-900">${deployment.id}</p>
                    <p class="text-sm text-gray-600">${deployment.season} ${deployment.year}</p>
                </div>
            </div>
        `;
        
        let contentHTML = '';
        switch (this.currentTab) {
            case 'overview':
                contentHTML = this.renderInProgressOverview(deployment);
                break;
            case 'sessions':
                contentHTML = this.renderInProgressSessions(deployment);
                break;
            case 'zones':
                contentHTML = this.renderInProgressZones(deployment);
                break;
            default:
                contentHTML = '';
        }
        
        return headerHTML + contentHTML;
    }

    renderRightColumn() {
        // Dropdown selector
        const dropdownHTML = `
            <div class="mb-4">
                <select 
                    id="completed-deployment-select" 
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="">Select a completed deployment...</option>
                    ${this.completedDeployments.map(d => `
                        <option value="${d.id}" ${this.selectedCompletedDeployment?.id === d.id ? 'selected' : ''}>
                            ${d.id} - ${d.season} ${d.year}
                        </option>
                    `).join('')}
                </select>
            </div>
        `;

        if (!this.selectedCompletedDeployment) {
            return dropdownHTML + `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p class="text-gray-500">Select a deployment to view statistics</p>
                </div>
            `;
        }

        const deployment = this.selectedCompletedDeployment;
        let contentHTML = '';

        switch (this.currentTab) {
            case 'overview':
                contentHTML = this.renderCompletedOverview(deployment);
                break;
            case 'sessions':
                contentHTML = this.renderCompletedSessions(deployment);
                break;
            case 'zones':
                contentHTML = this.renderCompletedZones(deployment);
                break;
        }

        return dropdownHTML + contentHTML;
    }

    renderInProgressOverview(deployment) {
        const sessions = StatisticsCalculations.getAllSessions(deployment);
        const sessionCounts = StatisticsCalculations.countSessions(sessions);
        const totals = StatisticsCalculations.getDeploymentTotals(deployment);
        const elapsedSeconds = StatisticsCalculations.calculateElapsedTime(deployment.setup_started_at);
        const elapsedTime = StatisticsCalculations.formatDuration(elapsedSeconds);
        
        // Get active session if any
        const activeSession = sessions.find(s => !s.end_time);
        
        return `
            <div class="space-y-3 sm:space-y-4">
                <!-- Time Elapsed -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                    <p class="text-xs sm:text-sm text-blue-600 font-medium">Time Elapsed</p>
                    <p class="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">${elapsedTime}</p>
                    <p class="text-xs text-blue-600 mt-1">Since ${StatisticsCalculations.formatDateShort(deployment.setup_started_at)}</p>
                </div>

                <!-- Grid for smaller metrics -->
                <div class="grid grid-cols-2 gap-3 sm:gap-4">
                    <!-- Sessions -->
                    <div class="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                        <p class="text-xs sm:text-sm text-gray-600 font-medium">Sessions</p>
                        <p class="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">${sessionCounts.total}</p>
                        <p class="text-xs text-gray-500 mt-1">${sessionCounts.completed} done, ${sessionCounts.active} active</p>
                    </div>

                    <!-- Total Items -->
                    <div class="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                        <p class="text-xs sm:text-sm text-gray-600 font-medium">Items</p>
                        <p class="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">${totals.totalItems}</p>
                        <p class="text-xs text-gray-500 mt-1">Deployed</p>
                    </div>
                </div>

                <!-- Connections (full width) -->
                <div class="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                    <p class="text-xs sm:text-sm text-gray-600 font-medium">Connections</p>
                    <p class="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">${totals.totalConnections}</p>
                    <p class="text-xs text-gray-500 mt-1">Created</p>
                </div>

                ${activeSession ? `
                    <!-- Active Session Card -->
                    <div class="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-xs sm:text-sm text-green-600 font-medium flex items-center">
                                <span class="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                Active Session
                            </p>
                            <span class="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">${activeSession.location_name}</span>
                        </div>
                        <p class="text-xs sm:text-sm text-green-800 font-mono mb-3">${activeSession.id}</p>
                        <div class="grid grid-cols-2 gap-2 text-xs text-green-700">
                            <div class="bg-green-100 rounded p-2">
                                <p class="font-medium">Items</p>
                                <p class="text-lg font-bold">${StatisticsCalculations.getUniqueSessionItems(activeSession).length}</p>
                            </div>
                            <div class="bg-green-100 rounded p-2">
                                <p class="font-medium">Connections</p>
                                <p class="text-lg font-bold">${(activeSession.connections_created || []).length}</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderCompletedOverview(deployment) {
        const sessions = StatisticsCalculations.getAllSessions(deployment);
        const sessionCounts = StatisticsCalculations.countSessions(sessions);
        const totals = StatisticsCalculations.getDeploymentTotals(deployment);
        const elapsedSeconds = StatisticsCalculations.calculateElapsedTime(
            deployment.setup_started_at, 
            deployment.setup_completed_at
        );
        const elapsedTime = StatisticsCalculations.formatDuration(elapsedSeconds);
        
        const totalSessionSeconds = StatisticsCalculations.calculateTotalSessionTime(sessions);
        const totalSessionTime = StatisticsCalculations.formatDuration(totalSessionSeconds);
        
        return `
            <div class="space-y-3 sm:space-y-4">
                <!-- Time cards in grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <!-- Setup Time (Elapsed) -->
                    <div class="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                        <p class="text-xs sm:text-sm text-green-600 font-medium">Setup Time</p>
                        <p class="text-2xl sm:text-3xl font-bold text-green-900 mt-1">${elapsedTime}</p>
                        <p class="text-xs text-green-600 mt-1">Total elapsed</p>
                    </div>

                    <!-- Actual Work Time -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                        <p class="text-xs sm:text-sm text-blue-600 font-medium">Work Time</p>
                        <p class="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">${totalSessionTime}</p>
                        <p class="text-xs text-blue-600 mt-1">Session total</p>
                    </div>
                </div>

                <!-- Count metrics in grid -->
                <div class="grid grid-cols-3 gap-2 sm:gap-3">
                    <!-- Sessions -->
                    <div class="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
                        <p class="text-xs text-gray-600 font-medium">Sessions</p>
                        <p class="text-xl sm:text-2xl font-bold text-gray-900 mt-1">${sessionCounts.total}</p>
                    </div>

                    <!-- Total Items -->
                    <div class="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
                        <p class="text-xs text-gray-600 font-medium">Items</p>
                        <p class="text-xl sm:text-2xl font-bold text-gray-900 mt-1">${totals.totalItems}</p>
                    </div>

                    <!-- Total Connections -->
                    <div class="bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
                        <p class="text-xs text-gray-600 font-medium">Connects</p>
                        <p class="text-xl sm:text-2xl font-bold text-gray-900 mt-1">${totals.totalConnections}</p>
                    </div>
                </div>

                <!-- Completion Date -->
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                    <p class="text-xs sm:text-sm text-gray-600 font-medium">Completed</p>
                    <p class="text-sm sm:text-base font-semibold text-gray-900 mt-1">${StatisticsCalculations.formatDate(deployment.setup_completed_at)}</p>
                </div>
            </div>
        `;
    }

    renderInProgressSessions(deployment) {
        const sessions = StatisticsCalculations.getAllSessions(deployment);
        
        if (sessions.length === 0) {
            return `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p class="text-gray-500">No sessions yet</p>
                </div>
            `;
        }

        const tableRows = sessions.map((session, index) => {
            const isActive = !session.end_time;
            const duration = session.duration_seconds 
                ? StatisticsCalculations.formatDuration(session.duration_seconds)
                : 'Active';
            const itemsCount = StatisticsCalculations.getUniqueSessionItems(session).length;
            const connectionsCount = (session.connections_created || []).length;
            
            const rowClass = isActive ? 'bg-green-50' : '';
            const activeIndicator = isActive ? '<span class="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>' : '';
            
            return `
                <tr class="${rowClass}">
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                        ${activeIndicator}S${index + 1}
                    </td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        ${StatisticsCalculations.formatDate(session.start_time)}
                    </td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        ${session.end_time ? StatisticsCalculations.formatDate(session.end_time) : '—'}
                    </td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 font-medium whitespace-nowrap">${duration}</td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 text-center">${itemsCount}</td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 text-center">${connectionsCount}</td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">${session.location_name}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full min-w-max">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th class="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th class="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Conns</th>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                <div class="bg-gray-50 px-4 py-2 text-xs text-gray-600 border-t border-gray-200">
                    <span class="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 align-middle"></span>
                    Active session • Scroll horizontally on mobile
                </div>
            </div>
        `;
    }

    renderCompletedSessions(deployment) {
        const sessions = StatisticsCalculations.getAllSessions(deployment);
        
        if (sessions.length === 0) {
            return `
                <div class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
                    <p class="text-gray-500">No sessions recorded</p>
                </div>
            `;
        }

        const mostProductive = StatisticsCalculations.findMostProductiveSession(sessions);

        const tableRows = sessions.map((session, index) => {
            const duration = StatisticsCalculations.formatDuration(session.duration_seconds || 0);
            const itemsCount = StatisticsCalculations.getUniqueSessionItems(session).length;
            const connectionsCount = (session.connections_created || []).length;
            
            const isMostProductive = mostProductive && session.id === mostProductive.id;
            const rowClass = isMostProductive ? 'bg-yellow-50' : '';
            const productiveIndicator = isMostProductive ? '<span class="text-yellow-600 mr-1">⭐</span>' : '';
            
            return `
                <tr class="${rowClass}">
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap">
                        ${productiveIndicator}S${index + 1}
                    </td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        ${StatisticsCalculations.formatDate(session.start_time)}
                    </td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        ${StatisticsCalculations.formatDate(session.end_time)}
                    </td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 font-medium whitespace-nowrap">${duration}</td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 text-center">${itemsCount}</td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 text-center">${connectionsCount}</td>
                    <td class="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">${session.location_name}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full min-w-max">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                <th class="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                                <th class="px-3 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Conns</th>
                                <th class="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Zone</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${tableRows}
                        </tbody>
                    </table>
                </div>
                <div class="bg-gray-50 px-4 py-2 text-xs text-gray-600 border-t border-gray-200">
                    ⭐ Most productive session • Scroll horizontally on mobile
                </div>
            </div>
        `;
    }

    renderInProgressZones(deployment) {
        const zoneStats = StatisticsCalculations.calculateZoneStats(deployment);
        
        return `
            <div class="space-y-3">
                ${zoneStats.map(zone => `
                    <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
                        <h4 class="font-semibold text-gray-900 text-sm sm:text-base mb-2 sm:mb-3">${zone.name}</h4>
                        <div class="grid grid-cols-3 gap-2 sm:gap-3">
                            <div class="text-center">
                                <p class="text-xs text-gray-500 uppercase font-medium mb-1">Items</p>
                                <p class="text-xl sm:text-2xl font-bold text-blue-600">${zone.items_count}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-xs text-gray-500 uppercase font-medium mb-1">Conns</p>
                                <p class="text-xl sm:text-2xl font-bold text-green-600">${zone.connections_count}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-xs text-gray-500 uppercase font-medium mb-1">Sessions</p>
                                <p class="text-xl sm:text-2xl font-bold text-purple-600">${zone.sessions_count}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCompletedZones(deployment) {
        const zoneStats = StatisticsCalculations.calculateZoneStats(deployment);
        
        return `
            <div class="space-y-3">
                ${zoneStats.map(zone => `
                    <div class="border border-gray-200 rounded-lg p-3 sm:p-4">
                        <h4 class="font-semibold text-gray-900 text-sm sm:text-base mb-2 sm:mb-3">${zone.name}</h4>
                        <div class="grid grid-cols-3 gap-2 sm:gap-3">
                            <div class="text-center">
                                <p class="text-xs text-gray-500 uppercase font-medium mb-1">Items</p>
                                <p class="text-xl sm:text-2xl font-bold text-blue-600">${zone.items_count}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-xs text-gray-500 uppercase font-medium mb-1">Conns</p>
                                <p class="text-xl sm:text-2xl font-bold text-green-600">${zone.connections_count}</p>
                            </div>
                            <div class="text-center">
                                <p class="text-xs text-gray-500 uppercase font-medium mb-1">Sessions</p>
                                <p class="text-xl sm:text-2xl font-bold text-purple-600">${zone.completed_sessions}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentTab = e.target.dataset.tab;
                this.renderView();
                this.attachEventListeners();
            });
        });

        // Completed deployment selector
        const selector = document.getElementById('completed-deployment-select');
        if (selector) {
            selector.addEventListener('change', async (e) => {
                const deploymentId = e.target.value;
                if (deploymentId) {
                    await this.loadCompletedDeployment(deploymentId);
                } else {
                    this.selectedCompletedDeployment = null;
                    this.updateRightColumn();
                }
            });
        }
    }

    async loadCompletedDeployment(deploymentId) {
        try {
            UIUtils.showToast('Loading deployment...', 'info');
            
            // Find in cache first
            let deployment = this.completedDeployments.find(d => d.id === deploymentId);
            
            // If not detailed enough, fetch full data
            if (!deployment || !deployment.locations || deployment.locations.length === 0) {
                // Fetch from API (we'll need to use the first location as a proxy)
                const response = await API.getDeployment(deploymentId, 'Front Yard');
                // This returns location data, but we need full deployment
                // For now, use the cached version
                deployment = this.completedDeployments.find(d => d.id === deploymentId);
            }
            
            this.selectedCompletedDeployment = deployment;
            this.updateRightColumn();
            UIUtils.showToast('Deployment loaded', 'success');
        } catch (error) {
            console.error('Failed to load deployment:', error);
            UIUtils.showToast('Failed to load deployment', 'error');
        }
    }

    updateRightColumn() {
        const rightColumn = document.getElementById('stats-right-column');
        if (rightColumn) {
            rightColumn.innerHTML = this.renderRightColumn();
            this.attachEventListeners();
        }
    }

    async refresh() {
        await this.loadDeployments();
        this.renderView();
        this.attachEventListeners();
    }
}

// Initialize when statistics view is shown
let statisticsView = null;

function initStatisticsView() {
    if (!statisticsView) {
        statisticsView = new StatisticsView();
    } else {
        statisticsView.refresh();
    }
}

// Export for use in app.js
window.initStatisticsView = initStatisticsView;
window.StatisticsView = StatisticsView;