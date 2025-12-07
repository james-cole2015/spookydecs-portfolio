// UI Rendering - Handles displaying items and statistics (UPDATED for primary photos)

// Update statistics cards
function updateStats() {
  // Season stats
  const halloween = allItems.filter(i => i.season === 'Halloween').length;
  const christmas = allItems.filter(i => i.season === 'Christmas').length;
  const shared = allItems.filter(i => i.season === 'Shared').length;
  
  const halloweenEl = document.getElementById('stat-halloween');
  const christmasEl = document.getElementById('stat-christmas');
  const sharedEl = document.getElementById('stat-shared');
  
  if (halloweenEl) halloweenEl.textContent = halloween;
  if (christmasEl) christmasEl.textContent = christmas;
  if (sharedEl) sharedEl.textContent = shared;
  
  // Class stats
  const accessoryEl = document.getElementById('stat-accessory');
  const decorationEl = document.getElementById('stat-decoration');
  const lightClassEl = document.getElementById('stat-light-class');
  
  if (accessoryEl) accessoryEl.textContent = allItems.filter(i => i.class === 'Accessory').length;
  if (decorationEl) decorationEl.textContent = allItems.filter(i => i.class === 'Decoration').length;
  if (lightClassEl) lightClassEl.textContent = allItems.filter(i => i.class === 'Light').length;
}

// Render items in table and cards
function renderItems() {
  // Let the filter system handle everything (which will use pagination)
  FilterSystem.setItems(allItems);
  updateStats();
}

// Show toast notification
function showToast(type, title, message) {
  // Remove any existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = '✅';
  if (type === 'error') icon = '❌';
  if (type === 'info') icon = 'ℹ️';
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentElement) {
      toast.remove();
    }
  }, 4000);
}

/**
 * Get primary photo URL for an item
 */
async function getPrimaryPhotoUrl(itemId) {
  try {
    const photos = await getPhotosForItem(itemId);
    const primaryPhoto = photos.find(p => p.is_primary === true);
    
    if (primaryPhoto) {
      return primaryPhoto.thumb_cloudfront_url || primaryPhoto.cloudfront_url;
    }
    
    // If no primary, return first photo
    if (photos.length > 0) {
      return photos[0].thumb_cloudfront_url || photos[0].cloudfront_url;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting primary photo:', error);
    return null;
  }
}

// UIRenderer object for FilterSystem compatibility
const UIRenderer = {
  async renderTableRows(items) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';
    
    // Render rows with photos
    for (const item of items) {
      const row = document.createElement('tr');
      
      // Create photo cell placeholder
      const photoCell = document.createElement('td');
      photoCell.className = 'photo-column';
      photoCell.innerHTML = '<span class="photo-placeholder">📦</span>';
      
      // Create other cells
      const statusCell = document.createElement('td');
      statusCell.innerHTML = `<span class="badge ${item.status === 'Active' ? 'active' : 'inactive'}">${item.status || 'Unknown'}</span>`;
      
      const nameCell = document.createElement('td');
      nameCell.textContent = item.short_name || 'N/A';
      
      const seasonCell = document.createElement('td');
      seasonCell.innerHTML = `<span class="badge ${(item.season || '').toLowerCase()}">${item.season || 'N/A'}</span>`;
      
      const classTypeCell = document.createElement('td');
      classTypeCell.textContent = item.class_type || 'N/A';
      
      const repairCell = document.createElement('td');
      repairCell.innerHTML = `<span class="badge ${item.repair_status?.needs_repair ? 'needs-repair' : 'ok'}">${item.repair_status?.needs_repair ? 'Needs Repair' : 'OK'}</span>`;
      
      const locationCell = document.createElement('td');
      locationCell.textContent = item.packing_data?.tote_location || 'N/A';
      
      const actionsCell = document.createElement('td');
      actionsCell.innerHTML = `
        <div class="action-buttons">
          <button class="btn-small btn-primary" onclick="viewItem('${item.id}')">View</button>
          <button class="btn-small btn-secondary" onclick="editItem('${item.id}')">Edit</button>
        </div>
      `;
      
      // Append cells to row
      row.appendChild(photoCell);
      row.appendChild(statusCell);
      row.appendChild(nameCell);
      row.appendChild(seasonCell);
      row.appendChild(classTypeCell);
      row.appendChild(repairCell);
      row.appendChild(locationCell);
      row.appendChild(actionsCell);
      
      tableBody.appendChild(row);
      
      // Fetch and update photo asynchronously
      getPrimaryPhotoUrl(item.id).then(photoUrl => {
        if (photoUrl) {
          photoCell.innerHTML = `<img src="${photoUrl}" class="photo-thumbnail-table" onclick="viewItem('${item.id}')" alt="${item.short_name}">`;
        }
      });
    }
  },
  
  async renderMobileCards(items) {
    const itemCards = document.getElementById('itemCards');
    itemCards.innerHTML = '';
    
    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'item-card';
      
      // Get primary photo
      const photoUrl = await getPrimaryPhotoUrl(item.id);
      
      card.innerHTML = `
        <div class="item-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${photoUrl 
              ? `<img src="${photoUrl}" class="photo-thumbnail-table" onclick="viewItem('${item.id}')" alt="${item.short_name}">`
              : '<span class="photo-placeholder" style="font-size: 16px;">📦</span>'
            }
            <div class="item-card-name">${item.short_name || 'N/A'}</div>
          </div>
          <span class="badge ${item.status === 'Active' ? 'active' : 'inactive'}">${item.status || 'Unknown'}</span>
        </div>
        <div class="item-card-row">
          <span class="item-card-label">Season:</span>
          <span class="badge ${(item.season || '').toLowerCase()}">${item.season || 'N/A'}</span>
        </div>
        <div class="item-card-row">
          <span class="item-card-label">Class Type:</span>
          <span>${item.class_type || 'N/A'}</span>
        </div>
        <div class="item-card-row">
          <span class="item-card-label">Repair Status:</span>
          <span class="badge ${item.repair_status?.needs_repair ? 'needs-repair' : 'ok'}">${item.repair_status?.needs_repair ? 'Needs Repair' : 'OK'}</span>
        </div>
        <div class="item-card-row">
          <span class="item-card-label">Location:</span>
          <span>${item.packing_data?.tote_location || 'N/A'}</span>
        </div>
        <div class="action-buttons" style="margin-top: 8px;">
          <button class="btn-small btn-primary" onclick="viewItem('${item.id}')">View</button>
          <button class="btn-small btn-secondary" onclick="editItem('${item.id}')">Edit</button>
        </div>
      `;
      itemCards.appendChild(card);
    }
  }
};
