// config.js - Frontend configuration loader
// This file loads config.json generated at build time

let CONFIG = null;

// Load configuration from config.json
async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    if (!response.ok) {
      throw new Error('Failed to load config.json');
    }
    CONFIG = await response.json();
    console.log('Configuration loaded successfully');
    return CONFIG;
  } catch (error) {
    console.error('Error loading configuration:', error);
    throw error;
  }
}

// Get a specific config value
function getConfig(key) {
  if (!CONFIG) {
    throw new Error('Configuration not loaded. Call loadConfig() first.');
  }
  return CONFIG[key];
}

// Get API endpoint (convenience function)
function getApiEndpoint() {
  return getConfig('API_ENDPOINT');
}

// For backward compatibility with existing code
// This will be set after config loads
let API_ENDPOINT = null;

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadConfig, getConfig, getApiEndpoint };
}