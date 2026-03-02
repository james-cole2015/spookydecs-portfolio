/**
 * SpookyDecs Repairs - Configuration
 */

let CONFIG = {
  API_BASE_URL: '',
  ADMIN_URL: '',
  TABLE_NAME: '',
  
  // API endpoints
  ENDPOINTS: {
    LIST_REPAIRS: '/admin/repairs',
    GET_REPAIR: '/admin/repairs/{id}',
    GET_HISTORY: '/admin/repairs/history',
    START_REPAIR: '/admin/repairs/{id}/start',
    COMPLETE_REPAIR: '/admin/repairs/{id}/complete',
    FLAG_REPAIR: '/admin/repairs/{id}/flag',
    RETIRE_ITEM: '/admin/repairs/{id}/retire'
  },

  // Criticality levels
  CRITICALITY_LEVELS: ['Critical', 'High', 'Medium', 'Low'],

  // Status options
  STATUS_OPTIONS: ['Needs Repair', 'In Repair', 'Operational', 'Retired'],

  // Class types
  CLASS_TYPES: ['Inflatable', 'Animatronic', 'Static', 'Lighting', 'Projection', 'Costume']
};

async function loadConfig() {
  try {
    const config = await window.SpookyConfig.get();
    CONFIG.API_BASE_URL = config.API_ENDPOINT;
    CONFIG.ADMIN_URL = config.ADMIN_URL;
    CONFIG.TABLE_NAME = config.TABLE_NAME;
    return true;
  } catch (error) {
    console.error('Failed to load configuration from SpookyConfig:', error);
    return false;
  }
}

// Authentication (to be implemented later)
const AUTH = {
  // Placeholder for auth token
  token: null,

  // Get auth headers
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    // TODO: Uncomment when auth is set up
    // if (this.token) {
    //   headers['Authorization'] = `Bearer ${this.token}`;
    // }

    return headers;
  },

  // Check if user is authenticated
  isAuthenticated() {
    // TODO: Implement actual auth check
    return true;
  },

  // Logout
  logout() {
    // TODO: Implement logout
    this.token = null;
    // Redirect to login page
    // window.location.href = '/login.html';
  }
};