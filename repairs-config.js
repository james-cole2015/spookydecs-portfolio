/**
 * SpookyDecs Repairs - Configuration
 * Loads configuration from config.json
 */

let CONFIG = {
  // Will be populated from config.json
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

// Load configuration from config.json
async function loadConfig() {
  // Try multiple possible paths for config.json
  const possiblePaths = [
    '/config.json',           // Root of domain
    './config.json',          // Relative to current page
    'config.json',            // Current directory
    '../config.json'          // Parent directory
  ];
  
  for (const path of possiblePaths) {
    try {
      console.log(`Attempting to load config from: ${path}`);
      const response = await fetch(path);
      
      // Check if response is OK
      if (!response.ok) {
        console.warn(`Config not found at ${path} (${response.status})`);
        continue;
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Config at ${path} is not JSON (${contentType})`);
        continue;
      }
      
      const config = await response.json();
      
      // Validate config has required fields
      if (!config.API_ENDPOINT) {
        console.warn(`Config at ${path} missing API_ENDPOINT`);
        continue;
      }
      
      CONFIG.API_BASE_URL = config.API_ENDPOINT;
      CONFIG.ADMIN_URL = config.ADMIN_URL;
      CONFIG.TABLE_NAME = config.TABLE_NAME;
      
      console.log('Configuration loaded successfully from:', path);
      console.log('API Endpoint:', CONFIG.API_BASE_URL);
      return true;
      
    } catch (error) {
      console.warn(`Failed to load config from ${path}:`, error.message);
    }
  }
  
  // If we get here, none of the paths worked
  console.error('Failed to load configuration from any path');
  alert(
    'Failed to load application configuration.\n\n' +
    'Please ensure config.json exists and is accessible.\n' +
    'Expected location: /config.json\n\n' +
    'Check browser console for details.'
  );
  return false;
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