// Static Prop Manager
// Handles adding static props to deployment zones

const StaticPropManager = {
    currentDeployment: null,
    currentLocation: null,
    allItems: [],
    
    /**
     * Initialize with deployment context
     */
    init(deployment, locationName, allItems) {
        this.currentDeployment = deployment;
        this.currentLocation = deployment.locations.find(loc => loc.name === locationName);
        this.allItems = allItems;
    },
    
    /**
     * Open static prop selector
     */
    openSelector() {
        if (!this.currentLocation) {
            UIUtils.showToast('No location selected', 'error');
            return;
        }
        
        // Show modal
        document.getElementById('static-prop-selector-modal').classList.remove('hidden');
        
        // Render available static props
        this.renderStaticProps();
    },
    
    /**
     * Close static prop selector
     */
    closeSelector() {
        document.getElementById('static-prop-selector-modal').classList.add('hidden');
    },
    
    /**
     * Render available static props
     */
    renderStaticProps() {
        const container = document.getElementById('static-prop-selector-list');
        container.innerHTML = '';
        
        const itemsDeployed = this.currentLocation?.items_deployed || [];
        
        // Get static props
        const staticProps = this.allItems.filter(item => item.class === 'static_prop');
        
        // Separate into available and used
        const availableProps = [];
        const usedInCurrentLocation = [];
        const usedElsewhere = [];
        
        staticProps.forEach(item => {
            if (itemsDeployed.includes(item.id)) {
                usedInCurrentLocation.push(item);
            } else {
                const usedLocation = PortTracker.getItemLocationUsage(
                    item.id,
                    this.currentDeployment?.locations || [],
                    this.currentLocation.name
                );
                
                if (usedLocation) {
                    usedElsewhere.push({ item, location: usedLocation });
                } else {
                    availableProps.push(item);
                }
            }
        });
        
        // Render sections
        this.renderSection(
            container,
            '✅ Already in This Zone',
            usedInCurrentLocation.length > 0 ? null : 'No static props in this zone yet',
            usedInCurrentLocation.map(item => ({ item, alreadyAdded: true }))
        );
        
        this.renderSection(
            container,
            '📦 Available Static Props',
            availableProps.length > 0 ? null : 'No static props available',
            availableProps.map(item => ({ item, available: true }))
        );
        
        this.renderSection(
            container,
            '🔒 Used in Other Locations',
            usedElsewhere.length > 0 ? null : null,
            usedElsewhere.map(data => ({ 
                item: data.item, 
                disabled: true, 
                location: data.location 
            })),
            true
        );
    },
    
    /**
     * Render a section
     */
    renderSection(container, title, emptyMessage, items, hideIfEmpty = false) {
        if (hideIfEmpty && items.length === 0) return;
        
        const section = document.createElement('div');
        section.className = 'static-prop-section mb-6';
        
        const header = document.createElement('h3');
        header.className = 'text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide';
        header.textContent = title;
        section.appendChild(header);
        
        if (emptyMessage) {
            const message = document.createElement('p');
            message.className = 'text-sm text-gray-500 italic py-4';
            message.textContent = emptyMessage;
            section.appendChild(message);
        } else {
            const list = document.createElement('div');
            list.className = 'space-y-2';
            
            items.forEach(itemData => {
                const itemEl = this.createItemElement(itemData);
                list.appendChild(itemEl);
            });
            
            section.appendChild(list);
        }
        
        container.appendChild(section);
    },
    
    /**
     * Create an item element
     */
    createItemElement(itemData) {
        const { item, available, alreadyAdded, disabled, location } = itemData;
        
        const div = document.createElement('div');
        div.className = `static-prop-card p-4 border-2 rounded-lg transition-all ${
            alreadyAdded
                ? 'bg-green-50 border-green-500'
                : disabled 
                    ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed' 
                    : 'bg-white border-gray-300 hover:border-orange-500 hover:shadow-md cursor-pointer'
        }`;
        
        if (available) {
            div.addEventListener('click', () => this.addStaticProp(item));
        } else if (alreadyAdded) {
            div.addEventListener('click', () => this.removeStaticProp(item));
        }
        
        const badge = alreadyAdded
            ? '<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">In Zone</span>'
            : disabled
                ? `<span class="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs">${location}</span>`
                : '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Click to Add</span>';
        
        const actionHint = alreadyAdded
            ? '<div class="text-xs text-gray-500 mt-2">Click to remove from zone</div>'
            : '';
        
        div.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🎭</span>
                        <span class="font-semibold text-gray-900">${item.short_name || item.name}</span>
                    </div>
                    <div class="text-sm text-gray-600 mt-1">${item.name}</div>
                    ${actionHint}
                </div>
                <div>
                    ${badge}
                </div>
            </div>
        `;
        
        return div;
    },
    
    /**
     * Add static prop to zone
     */
    async addStaticProp(item) {
        try {
            UIUtils.showToast('Adding static prop...', 'info');
            
            // Add to items_deployed in backend
            const response = await fetch(
                `${API_ENDPOINT}/admin/deployments/${this.currentDeployment.id}/locations/${encodeURIComponent(this.currentLocation.name)}/items`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        item_id: item.id
                    })
                }
            );
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to add static prop');
            }
            
            UIUtils.showToast(`${item.short_name || item.name} added to zone`, 'success');
            
            // Reload deployment
            await DeploymentManager.loadDeploymentDetail(this.currentDeployment.id);
            
            // Refresh the selector
            this.renderStaticProps();
            
        } catch (error) {
            console.error('Error adding static prop:', error);
            UIUtils.showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    /**
     * Remove static prop from zone
     */
    async removeStaticProp(item) {
        // Check if item is being illuminated by any spotlight
        const connections = this.currentLocation?.connections || [];
        const isIlluminated = connections.some(conn => {
            return conn.illuminates && conn.illuminates.includes(item.id);
        });
        
        if (isIlluminated) {
            UIUtils.showToast(
                `⚠️ Cannot remove ${item.short_name || item.name} - it is being illuminated by a spotlight. Delete the spotlight connection first.`,
                'warning'
            );
            return;
        }
        
        if (!confirm(`Remove ${item.short_name || item.name} from this zone?`)) {
            return;
        }
        
        try {
            UIUtils.showToast('Removing static prop...', 'info');
            
            // Remove from items_deployed in backend
            const response = await fetch(
                `${API_ENDPOINT}/admin/deployments/${this.currentDeployment.id}/locations/${encodeURIComponent(this.currentLocation.name)}/items/${item.id}`,
                {
                    method: 'DELETE'
                }
            );
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to remove static prop');
            }
            
            UIUtils.showToast(`${item.short_name || item.name} removed from zone`, 'success');
            
            // Reload deployment
            await DeploymentManager.loadDeploymentDetail(this.currentDeployment.id);
            
            // Refresh the selector
            this.renderStaticProps();
            
        } catch (error) {
            console.error('Error removing static prop:', error);
            UIUtils.showToast(`Error: ${error.message}`, 'error');
        }
    }
};