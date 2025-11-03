// UI Rendering - Handles displaying items and statistics

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
  const tableBody = document.getElementById('tableBody');
  const itemCards = document.getElementById('itemCards');
  
  tableBody.innerHTML = '';
  itemCards.innerHTML = '';
  
  allItems.forEach(item => {
    // Render table row
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="badge ${item.status === 'Active' ? 'active' : 'inactive'}">${item.status || 'Unknown'}</span></td>
      <td>${item.short_name || 'N/A'}</td>
      <td><span class="badge ${(item.season || '').toLowerCase()}">${item.season || 'N/A'}</span></td>
      <td>${item.class_type || 'N/A'}</td>
      <td><span class="badge ${item.repair_status?.needs_repair ? 'needs-repair' : 'ok'}">${item.repair_status?.needs_repair ? 'Needs Repair' : 'OK'}</span></td>
      <td>${item.packing_data?.tote_location || 'N/A'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-small btn-primary" onclick="viewItem('${item.id}')">View</button>
          <button class="btn-small btn-secondary" onclick="editItem('${item.id}')">Edit</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
    
    // Render mobile card
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-card-header">
        <div class="item-card-name">${item.short_name || 'N/A'}</div>
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
  });
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
  
  const icon = type === 'success' ? '✅' : '❌';
  
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