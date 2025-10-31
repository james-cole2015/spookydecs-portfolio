// Configuration management
let config = {};

async function loadConfig() {
  console.log('📡 Loading configuration...');
  
  try {
    const response = await fetch('/config.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    config = await response.json();
    
    console.log('✅ Configuration loaded:');
    console.log('   - Environment:', config.ENV || 'unknown');
    console.log('   - API Endpoint:', config.API_ENDPOINT || 'not set');
    console.log('   - Gallery URL:', config.GALLERY_LINK_FROM_ADM || 'not set');
    
    // Update navigation links
    if (config.GALLERY_LINK_FROM_ADM) {
      document.getElementById('galleryLink').href = config.GALLERY_LINK_FROM_ADM;
    }
    
    if (config.ADMIN_URL) {
      document.getElementById('adminLink').href = config.ADMIN_URL;
    }
    
    return config;
  } catch (error) {
    console.error('❌ Error loading config:', error);
    throw error;
  }
}