// Load configuration from config.json
export async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    console.log('=== Configuration Loaded ===');
    console.log('API Endpoint:', config.API_ENDPOINT);
    console.log('===========================');
    return config.API_ENDPOINT;
  } catch (error) {
    console.error('Failed to load config:', error);
    alert('Failed to load configuration. Please refresh the page.');
    throw error;
  }
}