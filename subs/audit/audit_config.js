export async function loadConfig() {
  try {
    const stage = window.location.hostname.includes('localhost') ||
                  window.location.hostname.startsWith('dev-') ? 'dev' : 'prod';

    const res = await fetch(`https://miinu7boec.execute-api.us-east-2.amazonaws.com/${stage}/admin/config`);

    if (!res.ok) {
      throw new Error(`Failed to load config: ${res.status}`);
    }

    const { data: config } = await res.json();

    console.log('=== Configuration Loaded ===');
    console.log('ENV:', config.ENV);
    console.log('API Endpoint:', config.API_ENDPOINT);
    console.log('===========================');

    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    alert('Failed to load configuration. Please refresh the page.');
    throw error;
  }
}