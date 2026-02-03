
// Port Availability Tracker
// Tracks which ports are available on items based on existing connections

const PortTracker = {
    /**
     * Get available ports for an item in a specific location
     * @param {Object} item - The item object
     * @param {Array} connections - All connections in the location
     * @param {string} itemId - The item's ID
     * @param {string} portType - 'female' or 'male'
     * @returns {Array} - Array of available port objects {name: 'Female_1', available: true, connectedTo: null}
     */
    getAvailablePorts(item, connections, itemId, portType) {
        const portCount = portType === 'female' 
            ? parseInt(item.female_ends || '0') 
            : parseInt(item.male_ends || '0');
        
        const prefix = portType === 'female' ? 'Female_' : 'Male_';
        const ports = [];
        
        // Generate all ports for this item
        for (let i = 1; i <= portCount; i++) {
            const portName = `${prefix}${i}`;
            const portInfo = {
                name: portName,
                available: true,
                connectedTo: null,
                connectionId: null
            };
            
            // Check if this port is used in any connection
            connections.forEach(conn => {
                if (portType === 'female') {
                    // Check from_port (female ports)
                    if (conn.from_item_id === itemId && conn.from_port === portName) {
                        portInfo.available = false;
                        portInfo.connectedTo = conn.to_item_id;
                        portInfo.connectionId = conn.id;
                    }
                } else {
                    // Check to_port (male ports)
                    if (conn.to_item_id === itemId && conn.to_port === portName) {
                        portInfo.available = false;
                        portInfo.connectedTo = conn.from_item_id;
                        portInfo.connectionId = conn.id;
                    }
                }
            });
            
            ports.push(portInfo);
        }
        
        return ports;
    },
    
    /**
     * Get count of available ports for an item
     * @param {Object} item - The item object
     * @param {Array} connections - All connections in the location
     * @param {string} itemId - The item's ID
     * @param {string} portType - 'female' or 'male'
     * @returns {number} - Number of available ports
     */
    getAvailablePortCount(item, connections, itemId, portType) {
        const ports = this.getAvailablePorts(item, connections, itemId, portType);
        return ports.filter(p => p.available).length;
    },
    
    /**
     * Check if an item has any available ports
     * @param {Object} item - The item object
     * @param {Array} connections - All connections in the location
     * @param {string} itemId - The item's ID
     * @param {string} portType - 'female' or 'male'
     * @returns {boolean}
     */
    hasAvailablePorts(item, connections, itemId, portType) {
        return this.getAvailablePortCount(item, connections, itemId, portType) > 0;
    },
    
    /**
     * Get the first available port (for auto-selection when only 1 port available)
     * @param {Object} item - The item object
     * @param {Array} connections - All connections in the location
     * @param {string} itemId - The item's ID
     * @param {string} portType - 'female' or 'male'
     * @returns {string|null} - Port name or null if none available
     */
    getFirstAvailablePort(item, connections, itemId, portType) {
        const ports = this.getAvailablePorts(item, connections, itemId, portType);
        const availablePort = ports.find(p => p.available);
        return availablePort ? availablePort.name : null;
    },
    
    /**
     * Check if port selection should be skipped (only 1 available port)
     * @param {Object} item - The item object
     * @param {Array} connections - All connections in the location
     * @param {string} itemId - The item's ID
     * @param {string} portType - 'female' or 'male'
     * @returns {boolean}
     */
    shouldSkipPortSelection(item, connections, itemId, portType) {
        return this.getAvailablePortCount(item, connections, itemId, portType) === 1;
    },
    
    /**
     * Get items that are deployed in other locations
     * @param {string} itemId - The item's ID
     * @param {Array} allLocations - All locations in the deployment
     * @param {string} currentLocationName - Current location name
     * @returns {string|null} - Location name where item is deployed, or null
     */
    getItemLocationUsage(itemId, allLocations, currentLocationName) {
        for (const location of allLocations) {
            if (location.name === currentLocationName) continue;
            
            const itemsDeployed = location.items_deployed || [];
            if (itemsDeployed.includes(itemId)) {
                return location.name;
            }
        }
        return null;
    },
    
    /**
     * Check if an item is deployed in the current location
     * @param {string} itemId - The item's ID
     * @param {Array} itemsDeployed - Items deployed in current location
     * @returns {boolean}
     */
    isItemDeployedInLocation(itemId, itemsDeployed) {
        return itemsDeployed.includes(itemId);
    },
    
    /**
     * Get items with open connections (for "Latest Open Connections" section)
     * @param {Array} connections - All connections in the location
     * @param {Array} allItems - All items from inventory
     * @param {Array} itemsDeployed - Items deployed in this location
     * @returns {Array} - Items sorted by last connection time with available port info
     */
    getItemsWithOpenConnections(connections, allItems, itemsDeployed) {
        const itemMap = new Map();
        
        // Build map of items with connection info
        connections.forEach(conn => {
            const timestamp = new Date(conn.connected_at).getTime();
            
            // Check source item (from_item_id with female ports)
            if (!itemMap.has(conn.from_item_id)) {
                itemMap.set(conn.from_item_id, {
                    itemId: conn.from_item_id,
                    lastConnectionTime: timestamp,
                    connections: []
                });
            }
            const fromItem = itemMap.get(conn.from_item_id);
            fromItem.lastConnectionTime = Math.max(fromItem.lastConnectionTime, timestamp);
            fromItem.connections.push(conn);
            
            // Check destination item (to_item_id with male ports)
            if (!itemMap.has(conn.to_item_id)) {
                itemMap.set(conn.to_item_id, {
                    itemId: conn.to_item_id,
                    lastConnectionTime: timestamp,
                    connections: []
                });
            }
            const toItem = itemMap.get(conn.to_item_id);
            toItem.lastConnectionTime = Math.max(toItem.lastConnectionTime, timestamp);
            toItem.connections.push(conn);
        });
        
        // Filter items with available ports and build result
        const itemsWithOpenPorts = [];
        
        itemMap.forEach((info, itemId) => {
            const item = allItems.find(i => i.id === itemId);
            if (!item) return;
            
            const availableFemale = this.getAvailablePortCount(item, connections, itemId, 'female');
            const availableMale = this.getAvailablePortCount(item, connections, itemId, 'male');
            
            if (availableFemale > 0 || availableMale > 0) {
                itemsWithOpenPorts.push({
                    item: item,
                    itemId: itemId,
                    lastConnectionTime: info.lastConnectionTime,
                    availableFemale: availableFemale,
                    availableMale: availableMale,
                    totalAvailable: availableFemale + availableMale
                });
            }
        });
        
        // Sort by last connection time (most recent first)
        itemsWithOpenPorts.sort((a, b) => b.lastConnectionTime - a.lastConnectionTime);
        
        return itemsWithOpenPorts;
    }
};