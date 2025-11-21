// Statistics View Controller - Updated Version

class StatisticsView {
    constructor() {
        this.currentTab = 'overview';
        this.inProgressDeployment = null;
        this.autoRefreshInterval = null;
        this.autoRefreshEnabled = false;
        this.expandedZone = null;
        this.expandedItems = false;
        this.expandedSessions = new Set(); // Track which sessions are expanded
        this.isLoading = true;
        
        this.init();
    }

    async init() {
        console.log('Initializing Statistics View');
        this.renderView(); // Show skeleton immediately
        await this.loadDeployments();
        this.isLoading = false;
        this.renderView();
        this.attachEventListeners();
        this.attachResizeListener();
    }

    async loadDeployments() {
        try {
            const deployments = await API.listDeployments();
            
            // Find in-progress deployment
            this.inProgressDeployment = deployments.find(d => d.status === 'in_progress') || null;
            
            console.log('In-progress:', this.inProgressDeployment?.id || 'None');
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
                    <div class="flex justify-between items-center">
                        <h2 class="text-xl sm:text-2xl font-bold text-gray-900">Statistics Dashboard</h2>
                        ${this.inProgressDeployment ? `
                            <button 
                                id="auto-refresh-toggle"
                                class="text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                                    this.autoRefreshEnabled 
                                        ? 'bg-green-50 border-green-300 text-green-700' 
                                        : 'bg-gray-50 border-gray-300 text-gray-600 hover:bg-gray-100'
                                }"
                            >
                                <span class="inline-block mr-1">${this.autoRefreshEnabled ? '🔄' : '⏸'}</span>
                                Auto-refresh ${this.autoRefreshEnabled ? 'ON' : 'OFF'}
                            </button>
                        ` : ''}
                    </div>
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
                            class="stats-tab py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${this.currentTab === 'activity' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                            data-tab="activity"
                        >
                            Activity
                        </button>
                    </nav>
                </div>

                <!-- Content (Single Column, Full Width) -->
                <div class="p-4 sm:p-6">
                    <div id="stats-content">
                        ${this.renderContent()}
                    </div>
                </div>
            </div>
            
            <!-- Zone Drawer (Desktop only) -->
            <div id="zone-drawer" class="hidden fixed inset-0 z-50">
                <div class="drawer-backdrop absolute inset-0 bg-black bg-opacity-50" onclick="statisticsView.closeZoneDrawer()"></div>
                <div class="drawer-content absolute right-0 inset-y-0 bg-white shadow-2xl w-full lg:w-3/5 xl:w-1/2 transform translate-x-full transition-transform duration-300 ease-in-out overflow-y-auto">
                    <div id="drawer-content-body"></div>
                </div>
            </div>
        `;
    }

    renderContent() {
        if (this.isLoading) {
            return this.renderLoadingSkeleton();
        }
        
        if (!this.inProgressDeployment) {
            return this.renderEmptyState();
        }

        // Deployment header
        const headerHTML = `
            <div class="mb-4 sm:mb-6">
                <div class="bg-white border border-gray-200 rounded-lg px-4 py-3">
                    <p class="font-semibold text-gray-900">${this.inProgressDeployment.id}</p>
                    <p class="text-sm text-gray-600">${this.inProgressDeployment.season} ${this.inProgressDeployment.year}</p>
                </div>
            </div>
        `;
        
        let contentHTML = '';
        switch (this.currentTab) {
            case 'overview':
                contentHTML = this.renderOverview(this.inProgressDeployment);
                break;
            case 'activity':
                contentHTML = this.renderActivity(this.inProgressDeployment);
                break;
            default:
                contentHTML = '';
        }
        
        return headerHTML + contentHTML;
    }

    renderLoadingSkeleton() {
        return `
            <div class="space-y-4 animate-pulse">
                <!-- Header skeleton -->
                <div class="h-16 bg-gray-200 rounded-lg"></div>
                
                <!-- Large card skeleton -->
                <div class="h-24 bg-gray-200 rounded-lg"></div>
                
                <!-- Grid skeleton -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="h-20 bg-gray-200 rounded-lg"></div>
                    <div class="h-20 bg-gray-200 rounded-lg"></div>
                </div>
                
                <!-- Another card -->
                <div class="h-20 bg-gray-200 rounded-lg"></div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="text-center py-12 px-4">
                <svg class="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
                <h3 class="mt-4 text-lg font-medium text-gray-900">No Active Deployment</h3>
                <p class="mt-2 text-sm text-gray-500">There's no deployment in progress.<br>Start a new deployment to see statistics.</p>
                <div class="mt-6">
                    <button 
                        onclick="document.querySelector('[data-view=deployments]').click()"
                        class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        Start New Deployment
                    </button>
                </div>
            </div>
        `;
    }

    renderOverview(deployment) {
        const sessions = StatisticsCalculations.getAllSessions(deployment);
        const sessionCounts = StatisticsCalculations.countSessions(sessions);
        const totals = StatisticsCalculations.getDeploymentTotals(deployment);
        const elapsedSeconds = StatisticsCalculations.calculateElapsedTime(deployment.setup_started_at);
        const elapsedTime = StatisticsCalculations.formatDuration(elapsedSeconds);
        
        // Get active session if any
        const activeSession = sessions.find(s => !s.end_time);
        
        // Get items for expandable card
        const allItems = new Set();
        deployment.locations.forEach(location => {
            (location.items_deployed || []).forEach(itemId => allItems.add(itemId));
        });
        const itemsList = Array.from(allItems);
        
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
                        <p class="text-xs text-gray-500 mt-1">${sessionCounts.completed} completed, ${sessionCounts.active} active</p>
                    </div>

                    <!-- Total Items (Expandable) -->
                    <div class="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors" onclick="statisticsView.toggleItems()">
                        <div class="flex justify-between items-start">
                            <p class="text-xs sm:text-sm text-gray-600 font-medium">Items</p>
                            <span class="text-gray-400 text-sm">${this.expandedItems ? '▲' : '▼'}</span>
                        </div>
                        <p class="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">${totals.totalItems}</p>
                        <p class="text-xs text-gray-500 mt-1">Deployed</p>
                    </div>
                </div>
                
                <!-- Expanded Items List -->
                ${this.expandedItems ? `
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                        <p class="text-sm font-medium text-gray-700 mb-2">Items Deployed</p>
                        <div class="space-y-1 max-h-48 overflow-y-auto">
                            ${itemsList.slice(0, 10).map(itemId => `
                                <div class="text-xs text-gray-600 font-mono">${itemId}</div>
                            `).join('')}
                            ${itemsList.length > 10 ? `
                                <button onclick="statisticsView.showAllItems()" class="text-xs text-blue-600 hover:text-blue-700 font-medium mt-2">
                                    View all ${itemsList.length} items →
                                </button>
                            ` : ''}
                        </div>
                    </div>
                ` : ''}

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

    renderActivity(deployment) {
        const zoneStats = StatisticsCalculations.calculateZoneStats(deployment);
        const sessions = StatisticsCalculations.getAllSessions(deployment);
        const mostProductive = StatisticsCalculations.findMostProductiveSession(sessions);
        
        return `
            <div class="space-y-3">
                ${zoneStats.map(zone => {
                    const isExpanded = this.expandedZone === zone.name;
                    const zoneSessions = sessions.filter(s => s.location_name === zone.name);
                    
                    return `
                        <div class="zone-card border border-gray-200 rounded-lg overflow-hidden">
                            <!-- Zone Header (always visible) -->
                            <div 
                                class="zone-header p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-gray-50' : ''}"
                                onclick="statisticsView.toggleZone('${zone.name}')"
                                data-zone="${zone.name}"
                            >
                                <div class="flex justify-between items-center">
                                    <h4 class="font-semibold text-gray-900 text-sm sm:text-base">${zone.name}</h4>
                                    <span class="text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}">▼</span>
                                </div>
                                <div class="mt-2 flex gap-4 text-xs text-gray-600">
                                    <span><strong>${zone.items_count}</strong> items</span>
                                    <span><strong>${zone.connections_count}</strong> conns</span>
                                    <span><strong>${zone.sessions_count}</strong> sessions</span>
                                </div>
                            </div>
                            
                            <!-- Zone Content (expandable - desktop hidden, mobile inline) -->
                            <div class="zone-content lg:hidden ${isExpanded ? '' : 'hidden'}" data-zone-content="${zone.name}">
                                ${this.renderZoneDetails(zone, zoneSessions, mostProductive, deployment)}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderZoneDetails(zone, sessions, mostProductive, deployment) {
        if (sessions.length === 0) {
            return `
                <div class="p-4 border-t border-gray-200">
                    <p class="text-sm text-gray-500">No sessions in this zone yet</p>
                </div>
            `;
        }

        // Get items and connections for this zone
        const location = deployment.locations.find(l => l.name === zone.name);
        const items = location?.items_deployed || [];
        const connections = location?.connections || [];

        return `
            <div class="p-3 sm:p-4 border-t border-gray-200 space-y-4">
                <!-- Sessions -->
                <div>
                    <h5 class="text-sm font-semibold text-gray-700 mb-2">Sessions (${sessions.length})</h5>
                    <div class="space-y-2">
                        ${sessions.map((session, index) => {
                            const sessionKey = `${zone.name}-${session.id}`;
                            const isSessionExpanded = this.expandedSessions.has(sessionKey);
                            const isMostProductive = mostProductive && session.id === mostProductive.id;
                            const duration = session.duration_seconds 
                                ? StatisticsCalculations.formatDuration(session.duration_seconds)
                                : 'Active';
                            const sessionItems = StatisticsCalculations.getUniqueSessionItems(session);
                            const itemsCount = sessionItems.length;
                            const sessionConnections = session.connections_created || [];
                            const connectionsCount = sessionConnections.length;
                            const isActive = !session.end_time;
                            
                            return `
                                <div class="border rounded-lg overflow-hidden ${isActive ? 'bg-green-50 border-green-200' : isMostProductive ? 'bg-yellow-50 border-yellow-200' : 'bg-white'}">
                                    <!-- Session Header (always visible, clickable) -->
                                    <div 
                                        class="p-3 cursor-pointer hover:bg-opacity-70 transition-colors session-toggle"
                                        data-session-key="${sessionKey}"
                                    >
                                        <div class="flex justify-between items-start mb-2">
                                            <span class="font-medium text-sm">
                                                ${isMostProductive ? '⭐ ' : ''}${isActive ? '<span class="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>' : ''}Session ${index + 1}
                                            </span>
                                            <span class="text-gray-400 text-xs">${isSessionExpanded ? '▲' : '▼'}</span>
                                        </div>
                                        <p class="text-xs text-gray-600 mb-1">
                                            ${StatisticsCalculations.formatDate(session.start_time)}
                                            ${session.end_time ? '<br>' + StatisticsCalculations.formatDate(session.end_time) : ''}
                                        </p>
                                        <p class="text-xs text-gray-500 mb-2">${duration}</p>
                                        <div class="grid grid-cols-2 gap-2 text-xs">
                                            <div><span class="text-gray-500">Items:</span> <strong>${itemsCount}</strong></div>
                                            <div><span class="text-gray-500">Connections:</span> <strong>${connectionsCount}</strong></div>
                                        </div>
                                    </div>
                                    
                                    <!-- Session Expanded Content -->
                                    ${isSessionExpanded ? `
                                        <div class="border-t border-gray-200 p-3 bg-white bg-opacity-50 space-y-3">
                                            <!-- Items List -->
                                            ${itemsCount > 0 ? `
                                                <div>
                                                    <p class="text-xs font-semibold text-gray-700 mb-2">Items (${itemsCount})</p>
                                                    <div class="space-y-1 max-h-32 overflow-y-auto">
                                                        ${sessionItems.map(itemId => `
                                                            <div class="text-xs text-gray-600 font-mono pl-2">${itemId}</div>
                                                        `).join('')}
                                                    </div>
                                                </div>
                                            ` : '<p class="text-xs text-gray-500">No items in this session</p>'}
                                            
                                            <!-- Connections List -->
                                            ${connectionsCount > 0 ? `
                                                <div>
                                                    <p class="text-xs font-semibold text-gray-700 mb-2">Connections (${connectionsCount})</p>
                                                    <div class="space-y-1 max-h-32 overflow-y-auto">
                                                        ${sessionConnections.map(conn => `
                                                            <div class="text-xs text-gray-600 font-mono pl-2">
                                                                ${conn.from_item_id} → ${conn.to_item_id}
                                                            </div>
                                                        `).join('')}
                                                    </div>
                                                </div>
                                            ` : '<p class="text-xs text-gray-500">No connections in this session</p>'}
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                <!-- Collapsible Items List (Zone-level) -->
                ${items.length > 0 ? `
                    <div>
                        <button 
                            onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('hidden'); this.querySelector('span:last-child').textContent = this.nextElementSibling.classList.contains('hidden') ? '▼' : '▲';"
                            class="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2 w-full"
                        >
                            <span>All Items in Zone (${items.length})</span>
                            <span class="text-xs">▼</span>
                        </button>
                        <div class="hidden mt-3 space-y-1 max-h-40 overflow-y-auto bg-gray-50 rounded p-2">
                            ${items.map(itemId => `
                                <div class="text-xs text-gray-600 font-mono pl-2">${itemId}</div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- Collapsible Connections List (Zone-level) -->
                ${connections.length > 0 ? `
                    <div>
                        <button 
                            onclick="event.stopPropagation(); this.nextElementSibling.classList.toggle('hidden'); this.querySelector('span:last-child').textContent = this.nextElementSibling.classList.contains('hidden') ? '▼' : '▲';"
                            class="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2 w-full"
                        >
                            <span>All Connections in Zone (${connections.length})</span>
                            <span class="text-xs">▼</span>
                        </button>
                        <div class="hidden mt-3 space-y-1 max-h-40 overflow-y-auto bg-gray-50 rounded p-2">
                            ${connections.map(conn => `
                                <div class="text-xs text-gray-600 font-mono pl-2">
                                    ${conn.from_item_id} → ${conn.to_item_id}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Session expansion toggle
    toggleSession(sessionKey) {
        if (this.expandedSessions.has(sessionKey)) {
            this.expandedSessions.delete(sessionKey);
        } else {
            this.expandedSessions.add(sessionKey);
        }
        this.updateContent();
    }

    // Zone interaction methods
    toggleZone(zoneName) {
        const isDesktop = window.innerWidth >= 1024;
        
        if (isDesktop) {
            this.openZoneDrawer(zoneName);
        } else {
            // Mobile: toggle accordion
            if (this.expandedZone === zoneName) {
                this.expandedZone = null;
            } else {
                this.expandedZone = zoneName;
            }
            this.updateContent();
        }
    }

    openZoneDrawer(zoneName) {
        const drawer = document.getElementById('zone-drawer');
        const drawerContent = drawer.querySelector('.drawer-content');
        const drawerBody = document.getElementById('drawer-content-body');
        
        // Find zone data
        const zoneStats = StatisticsCalculations.calculateZoneStats(this.inProgressDeployment);
        const zone = zoneStats.find(z => z.name === zoneName);
        const sessions = StatisticsCalculations.getAllSessions(this.inProgressDeployment).filter(s => s.location_name === zoneName);
        const mostProductive = StatisticsCalculations.findMostProductiveSession(sessions);
        
        // Render drawer content
        drawerBody.innerHTML = `
            <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${zoneName}</h3>
                    <p class="text-sm text-gray-600">${zone.items_count} items • ${zone.connections_count} connections • ${zone.sessions_count} sessions</p>
                </div>
                <button onclick="statisticsView.closeZoneDrawer()" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="px-6 py-4">
                ${this.renderZoneDetails(zone, sessions, mostProductive, this.inProgressDeployment)}
            </div>
        `;
        
        // Show drawer with animation
        drawer.classList.remove('hidden');
        setTimeout(() => {
            drawerContent.classList.remove('translate-x-full');
        }, 10);
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    closeZoneDrawer() {
        const drawer = document.getElementById('zone-drawer');
        const drawerContent = drawer.querySelector('.drawer-content');
        
        drawerContent.classList.add('translate-x-full');
        
        setTimeout(() => {
            drawer.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    }

    // Items expansion methods
    toggleItems() {
        this.expandedItems = !this.expandedItems;
        this.updateContent();
    }

    showAllItems() {
        // Get all items
        const allItems = new Set();
        this.inProgressDeployment.locations.forEach(location => {
            (location.items_deployed || []).forEach(itemId => allItems.add(itemId));
        });
        const itemsList = Array.from(allItems);
        
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-96 overflow-hidden flex flex-col">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-lg font-semibold">All Items (${itemsList.length})</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
                <div class="px-6 py-4 overflow-y-auto">
                    <div class="space-y-1">
                        ${itemsList.map(itemId => `
                            <div class="text-sm text-gray-700 font-mono py-1">${itemId}</div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Auto-refresh methods
    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;
        
        if (this.autoRefreshEnabled) {
            this.startAutoRefresh();
            UIUtils.showToast('Auto-refresh enabled (30s interval)', 'info');
        } else {
            this.stopAutoRefresh();
            UIUtils.showToast('Auto-refresh disabled', 'info');
        }
        
        this.renderView();
        this.attachEventListeners();
    }

    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(async () => {
            console.log('Auto-refreshing statistics...');
            await this.refresh();
        }, 30000); // 30 seconds
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    // Resize listener for drawer/accordion switch
    attachResizeListener() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Close drawer if switching from desktop to mobile
                if (window.innerWidth < 1024) {
                    this.closeZoneDrawer();
                }
            }, 150);
        });
    }

    updateContent() {
        const contentDiv = document.getElementById('stats-content');
        if (contentDiv) {
            contentDiv.innerHTML = this.renderContent();
            // Re-attach event listeners for session toggles after content update
            this.attachSessionToggleListeners();
        }
    }

    attachSessionToggleListeners() {
        // Session toggles
        document.querySelectorAll('.session-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const sessionKey = toggle.dataset.sessionKey;
                this.toggleSession(sessionKey);
            });
        });
    }

    attachEventListeners() {
        // Tab switching
        document.querySelectorAll('.stats-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentTab = e.target.dataset.tab;
                this.expandedZone = null; // Reset expanded zone when switching tabs
                this.renderView();
                this.attachEventListeners();
            });
        });

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('click', () => {
                this.toggleAutoRefresh();
            });
        }

        // Session toggles
        document.querySelectorAll('.session-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const sessionKey = toggle.dataset.sessionKey;
                this.toggleSession(sessionKey);
            });
        });
    }

    async refresh() {
        this.isLoading = true;
        this.updateContent();
        await this.loadDeployments();
        this.isLoading = false;
        this.updateContent();
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