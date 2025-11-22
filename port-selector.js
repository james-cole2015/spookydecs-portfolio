// Port Selector Modal
// Shows available ports for an item when multiple ports exist

const PortSelector = {
    currentItem: null,
    currentPorts: [],
    onSelectCallback: null,
    
    /**
     * Open port selector
     * @param {Object} item - The item to select a port from
     * @param {Array} connections - Current connections in location
     * @param {string} itemId - Item ID
     * @param {string} portType - 'female' or 'male'
     * @param {Function} onSelect - Callback when port is selected
     */
    open(item, connections, itemId, portType, onSelect) {
        this.currentItem = item;
        this.onSelectCallback = onSelect;
        
        // Get available ports
        this.currentPorts = PortTracker.getAvailablePorts(item, connections, itemId, portType);
        
        // Show modal
        document.getElementById('port-selector-modal').classList.remove('hidden');
        
        // Set title
        const portLabel = portType === 'female' ? 'Female Port' : 'Male Port';
        document.getElementById('port-selector-title').textContent = 
            `Select ${portLabel} on ${item.short_name || item.name}`;
        
        // Render ports
        this.renderPorts();
    },
    
    /**
     * Close port selector
     */
    close() {
        document.getElementById('port-selector-modal').classList.add('hidden');
        this.currentItem = null;
        this.currentPorts = [];
        this.onSelectCallback = null;
    },
    
    /**
     * Render ports
     */
    renderPorts() {
        const container = document.getElementById('port-selector-list');
        container.innerHTML = '';
        
        this.currentPorts.forEach(port => {
            const portEl = this.createPortElement(port);
            container.appendChild(portEl);
        });
    },
    
    /**
     * Create a port element
     */
    createPortElement(port) {
        const div = document.createElement('div');
        div.className = `port-card p-4 border-2 rounded-lg transition-all ${
            port.available 
                ? 'bg-white border-gray-300 hover:border-orange-500 hover:shadow-md cursor-pointer' 
                : 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
        }`;
        
        if (port.available) {
            div.addEventListener('click', () => this.selectPort(port.name));
        }
        
        const statusIcon = port.available 
            ? '<span class="text-green-500 text-xl">✓</span>' 
            : '<span class="text-red-500 text-xl">✗</span>';
        
        const statusText = port.available 
            ? '<span class="text-green-700 font-medium">Available</span>'
            : `<span class="text-red-700 font-medium">In Use</span>`;
        
        const connectionInfo = !port.available 
            ? `<div class="text-xs text-gray-600 mt-1">Connected to: ${port.connectedTo}</div>`
            : '';
        
        div.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    ${statusIcon}
                    <div>
                        <div class="font-semibold text-gray-900">${port.name}</div>
                        ${connectionInfo}
                    </div>
                </div>
                <div>
                    ${statusText}
                </div>
            </div>
        `;
        
        return div;
    },
    
    /**
     * Handle port selection
     */
    selectPort(portName) {
        this.close();
        if (this.onSelectCallback) {
            this.onSelectCallback(portName);
        }
    }
};