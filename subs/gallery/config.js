// Configuration management
window.config = {};

async function loadConfig() {
  console.log('📡 Loading configuration...');
  
  try {
    const response = await fetch('/config.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    
    window.config = await response.json();
    
    console.log('✅ Configuration loaded:');
    console.log('   - Environment:', window.config.ENV || 'unknown');
    console.log('   - API Endpoint:', window.config.API_ENDPOINT || 'not set');
    console.log('   - Gallery URL:', window.config.GALLERY_LINK_FROM_ADM || 'not set');
    
    // Update navigation links if they exist
    const galleryLink = document.getElementById('galleryLink');
    if (galleryLink && window.config.GALLERY_LINK_FROM_ADM) {
      galleryLink.href = window.config.GALLERY_LINK_FROM_ADM;
    }
    
    const adminLink = document.getElementById('adminLink');
    if (adminLink && window.config.ADMIN_URL) {
      adminLink.href = window.config.ADMIN_URL;
    }
    
    return window.config;
  } catch (error) {
    console.error('❌ Error loading config:', error);
    throw error;
  }
}

// Expose loadConfig globally for app.js
window.loadConfig = loadConfig;

// Automatically start loading config when script loads
loadConfig();