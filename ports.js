// Port Calculation Functions

function getUsedPorts(itemId, connections) {
    const usedPorts = {
        male: [],
        female: []
    };
    
    connections.forEach(conn => {
        if (conn.from_item_id === itemId) {
            usedPorts.female.push(conn.from_port);
        }
        if (conn.to_item_id === itemId) {
            usedPorts.male.push(conn.to_port);
        }
    });
    
    return usedPorts;
}

function getAvailableFemalePorts(item, connections) {
    const totalFemale = parseInt(item.female_ends) || 0;
    const usedPorts = getUsedPorts(item.id, connections);
    
    const available = [];
    for (let i = 1; i <= totalFemale; i++) {
        const portName = `Female_${i}`;
        if (!usedPorts.female.includes(portName)) {
            available.push(portName);
        }
    }
    
    return available;
}

function generatePortOptions(item, connections, portType = 'female') {
    if (portType === 'female') {
        const totalFemale = parseInt(item.female_ends) || 0;
        const usedPorts = getUsedPorts(item.id, connections);
        
        const ports = [];
        for (let i = 1; i <= totalFemale; i++) {
            const portName = `Female_${i}`;
            const isUsed = usedPorts.female.includes(portName);
            ports.push({
                name: portName,
                available: !isUsed
            });
        }
        return ports;
    } else {
        // Male ports - items only have 1 male port
        const totalMale = parseInt(item.male_ends) || 0;
        if (totalMale > 0) {
            return [{ name: 'Male_1', available: true }];
        }
        return [];
    }
}

// Export functions
window.PortUtils = {
    getUsedPorts,
    getAvailableFemalePorts,
    generatePortOptions
};