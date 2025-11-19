// Application State Management
const state = {
    currentDeploymentId: null,
    currentLocationName: null,
    currentZone: null,
    sourceItem: null,
    destinationItem: null,
    items: [],
    allItems: [],
    connections: [],
    inProgressDeployments: [],
};

// Zone to receptacle mapping
const ZONE_RECEPTACLES = {
    'Front Yard': 'REC-FY-001',
    'Side Yard': 'REC-SY-001',
    'Back Yard': 'REC-BY-001'
};

// Export for use in other modules
window.AppState = state;
window.ZONE_RECEPTACLES = ZONE_RECEPTACLES;