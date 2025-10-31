// Main application initialization

async function init() {
  console.log('🚀 Initializing Gallery Admin...');
  
  try {
    // Load configuration
    await loadConfig();
    
    // Setup filter listeners
    document.getElementById('filterSeason').addEventListener('change', applyFilters);
    document.getElementById('filterCategory').addEventListener('change', applyFilters);
    document.getElementById('filterVisible').addEventListener('change', applyFilters);
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    
    // Setup logout
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
    
    // Load gallery images
    await loadImages();
    
    console.log('✅ Gallery Admin initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Gallery Admin:', error);
    showToast('Failed to initialize application: ' + error.message, 'error');
  }
}

async function loadImages() {
  try {
    allImages = await API.getImages();
    filteredImages = [...allImages];
    
    updateStats();
    renderTable();
  } catch (error) {
    console.error('❌ Error loading images:', error);
    showToast('Failed to load gallery images: ' + error.message, 'error');
  }
}

function handleLogout() {
  console.log('🚪 Logging out...');
  // TODO: Implement Cognito logout
  showToast('Logout functionality will be implemented with Cognito', 'info');
  
  if (config.MAIN_URL) {
    setTimeout(() => {
      window.location.href = config.MAIN_URL;
    }, 1500);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}