// UI Management
let allImages = [];
let filteredImages = [];
let sortField = null;
let sortDirection = 'asc';

// Update statistics cards
function updateStats() {
  const total = allImages.length;
  const halloween = allImages.filter(img => img.season === 'halloween').length;
  const christmas = allImages.filter(img => img.season === 'christmas').length;
  const myDisplay = allImages.filter(img => img.category === 'myDisplay').length;
  const community = allImages.filter(img => img.category === 'community').length;
  const buildProgress = allImages.filter(img => img.category === 'buildProgress').length;
  
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statHalloween').textContent = halloween;
  document.getElementById('statChristmas').textContent = christmas;
  document.getElementById('statMyDisplay').textContent = myDisplay;
  document.getElementById('statCommunity').textContent = community;
  document.getElementById('statBuildProgress').textContent = buildProgress;
}

// Apply filters
function applyFilters() {
  const seasonFilter = document.getElementById('filterSeason').value;
  const categoryFilter = document.getElementById('filterCategory').value;
  const visibleFilter = document.getElementById('filterVisible').value;
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();
  
  filteredImages = allImages.filter(img => {
    if (seasonFilter !== 'all' && img.season !== seasonFilter) return false;
    if (categoryFilter !== 'all' && img.category !== categoryFilter) return false;
    if (visibleFilter !== 'all') {
      const isVisible = visibleFilter === 'true';
      if (img.isVisible !== isVisible) return false;
    }
    if (searchQuery && !img.title.toLowerCase().includes(searchQuery)) return false;
    return true;
  });
  
  console.log(`🔍 Filtered to ${filteredImages.length} images`);
  renderTable();
}

// Sort table
function sortTable(field) {
  if (sortField === field) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDirection = 'asc';
  }
  
  filteredImages.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];
    
    if (typeof valA === 'string') {
      valA = valA.toLowerCase();
      valB = valB.toLowerCase();
    }
    
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  renderTable();
}

// Render table
function renderTable() {
  const tbody = document.getElementById('galleryTableBody');
  
  if (filteredImages.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <p>No images found</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = filteredImages.map(img => `
    <tr>
      <td>
        <img src="${img.thumbnailUrl}" alt="${img.title}" class="thumbnail" 
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2260%22 height=%2260%22%3E%3Crect fill=%22%23ddd%22 width=%2260%22 height=%2260%22/%3E%3C/svg%3E'">
      </td>
      <td>${img.year}</td>
      <td><strong>${img.title}</strong></td>
      <td>${img.category}</td>
      <td>
        <span class="badge ${img.isVisible ? 'badge-visible' : 'badge-hidden'}">
          ${img.isVisible ? 'Visible' : 'Hidden'}
        </span>
      </td>
      <td>
        <span class="badge badge-${img.season}">
          ${img.season}
        </span>
      </td>
      <td>
        <div class="tags">
          ${(img.tags || []).length > 0 
            ? img.tags.map(tag => `<span class="tag">${tag}</span>`).join('') 
            : '<span class="tag">—</span>'}
        </div>
      </td>
      <td>
        <div class="actions">
          <button class="btn-edit" onclick="showEditModal('${img.imageId}')">Edit</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Toast notification system
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  }[type] || 'ℹ';
  
  toast.innerHTML = `
    <span style="font-size: 20px;">${icon}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showBulkUploadToast() {
  showToast('Bulk upload feature is not available yet', 'info');
}