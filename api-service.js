// API Service - Handles all API interactions

// Load configuration
async function loadConfig() {
  try {
    const response = await fetch('config.json');
    config = await response.json();
    
    // Set admin link
    if (config.ADMIN_URL) {
      document.getElementById('adminLink').href = config.ADMIN_URL;
    }
    
    // Load items after config is loaded
    await loadItems();
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

// Load items from API
async function loadItems() {
  try {
    const apiUrl = config.API_ENDPOINT || '';
    if (!apiUrl) {
      console.error('API_ENDPOINT not found in config');
      return;
    }
    
    const response = await fetch(`${apiUrl}/items`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    allItems = data.items || [];
    
    // Filter out Storage and Deployment items
    allItems = allItems.filter(item => 
      item.class !== 'Storage' && item.class !== 'Deployment'
    );
    
    updateStats();
    renderItems();
  } catch (error) {
    console.error('Failed to load items:', error);
  }
}

// Save item changes to API
async function saveItemToAPI(itemId, updatePayload) {
  try {
    const apiUrl = config.API_ENDPOINT || '';
    if (!apiUrl) {
      throw new Error('API endpoint not configured');
    }
    
    const response = await fetch(`${apiUrl}/items/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to update item: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
}