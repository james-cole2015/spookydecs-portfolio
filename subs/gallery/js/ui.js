/**
 * UI Management
 * Handles rendering of photo grid, stats, and UI updates
 */

import { getState, subscribe } from './state.js';
import { filterPhotosBySearch, calculateRecentUploads } from './photos.js';
import { getItemNames } from './helpers.js';

/**
 * Initialize UI components
 */
export function initUI() {
  console.log('[UI] Initializing UI...');
  
  // Subscribe to state changes
  subscribe((state, previousState) => {
    // Re-render photo grid when photos change
    if (state.photos !== previousState.photos) {
      renderPhotoGrid();
    }
    
    // Update stats when they change
    if (state.stats !== previousState.stats) {
      updateStatsCards();
    }
    
    // Re-render when search changes
    if (state.filters.search !== previousState.filters.search) {
      renderPhotoGrid();
    }
  });
  
  // Initial render
  renderPhotoGrid();
  updateStatsCards();
  
  console.log('[UI] UI initialized');
}

/**
 * Render photo grid
 */
export function renderPhotoGrid() {
  const state = getState();
  const photoGrid = document.getElementById('photo-grid');
  
  console.log('[UI] renderPhotoGrid called');
  console.log('[UI] - loading:', state.loading);
  console.log('[UI] - error:', state.error);
  console.log('[UI] - photos count:', state.photos?.length);
  
  if (!photoGrid) {
    console.warn('[UI] Photo grid element not found');
    return;
  }
  
  // Handle loading state
  if (state.loading) {
    console.log('[UI] Rendering loading state');
    photoGrid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading photos...</p>
      </div>
    `;
    return;
  }
  
  // Handle error state
  if (state.error) {
    console.log('[UI] Rendering error state:', state.error);
    photoGrid.innerHTML = `
      <div class="error-state">
        <p>Error loading photos: ${state.error}</p>
        <button class="btn-retry" onclick="window.location.reload()">Retry</button>
      </div>
    `;
    return;
  }
  
  // Get photos and apply client-side search filter
  let photos = state.photos || [];
  
  if (state.filters.search) {
    photos = filterPhotosBySearch(photos, state.filters.search);
  }
  
  console.log('[UI] Filtered photos count:', photos.length);
  
  // Handle empty state
  if (photos.length === 0) {
    console.log('[UI] Rendering empty state');
    photoGrid.innerHTML = `
      <div class="empty-state">
        <p>No photos found</p>
        <p class="empty-state-hint">Try adjusting your filters or search</p>
      </div>
    `;
    return;
  }
  
  // Render photo cards
  console.log('[UI] Rendering', photos.length, 'photo cards');
  photoGrid.innerHTML = photos.map(photo => createPhotoCard(photo)).join('');
  
  // Attach event listeners to action buttons
  attachPhotoCardListeners();
  
  console.log('[UI] Photo grid rendered successfully');
}

/**
 * Create HTML for a single photo card
 * @param {Object} photo - Photo object
 * @returns {string} HTML string
 */
function createPhotoCard(photo) {
  const state = getState();
  
  // Get item names if item_ids exist
  const itemNames = photo.item_ids && photo.item_ids.length > 0
    ? getItemNames(photo.item_ids, state.items)
    : [];
  
  // Format display name
  const displayName = itemNames.length > 0
    ? itemNames.join(', ')
    : `Photo ${photo.photo_id.substring(0, 8)}`;
  
  return `
    <article class="photo-card" data-photo-id="${photo.photo_id}">
      <div class="photo-image-container">
        <img 
          src="${photo.cloudfront_url}" 
          alt="${displayName}" 
          class="photo-image"
          loading="lazy"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22300%22%3E%3Crect fill=%22%23ddd%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 fill=%22%23999%22%3EImage not available%3C/text%3E%3C/svg%3E'"
        >
        ${photo.season ? `<span class="photo-badge badge-${photo.season}">${photo.season}</span>` : ''}
      </div>
      <div class="photo-caption">
        <p class="photo-title">${displayName}</p>
        ${photo.year ? `<p class="photo-meta">Year: ${photo.year}</p>` : ''}
        ${photo.tags && photo.tags.length > 0 ? `
          <div class="photo-tags">
            ${photo.tags.slice(0, 3).map(tag => `<span class="tag">${tag}</span>`).join('')}
            ${photo.tags.length > 3 ? `<span class="tag">+${photo.tags.length - 3}</span>` : ''}
          </div>
        ` : ''}
      </div>
      <div class="photo-actions">
        <button class="action-button action-view" data-action="view">View</button>
        <button class="action-button action-edit" data-action="edit">Edit</button>
      </div>
    </article>
  `;
}

/**
 * Attach event listeners to photo card buttons
 */
function attachPhotoCardListeners() {
  const photoCards = document.querySelectorAll('.photo-card');
  
  photoCards.forEach(card => {
    const photoId = card.dataset.photoId;
    
    // View button
    const viewBtn = card.querySelector('[data-action="view"]');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => handleViewPhoto(photoId));
    }
    
    // Edit button
    const editBtn = card.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', () => handleEditPhoto(photoId));
    }
  });
}

/**
 * Handle view photo action
 * @param {string} photoId - Photo ID
 */
function handleViewPhoto(photoId) {
  console.log('[UI] View photo:', photoId);
  showToast('View modal not implemented yet', 'info');
  // TODO: Implement view modal
}

/**
 * Handle edit photo action
 * @param {string} photoId - Photo ID
 */
function handleEditPhoto(photoId) {
  console.log('[UI] Edit photo:', photoId);
  showToast('Edit modal not implemented yet', 'info');
  // TODO: Implement edit modal
}

/**
 * Update stats cards
 */
export function updateStatsCards() {
  const state = getState();
  const stats = state.stats;
  const photos = state.photos || [];
  
  // Calculate recent uploads (last 30 days)
  const recentCount = calculateRecentUploads(photos);
  
  // Update card values
  const statCards = document.querySelectorAll('.stat-card');
  
  if (statCards.length >= 4) {
    // Card 1: Total Images
    statCards[0].querySelector('.stat-value').textContent = stats.total || 0;
    
    // Card 2: Christmas
    statCards[1].querySelector('.stat-value').textContent = stats.christmas || 0;
    
    // Card 3: Halloween
    statCards[2].querySelector('.stat-value').textContent = stats.halloween || 0;
    
    // Card 4: Recent Uploads
    statCards[3].querySelector('.stat-value').textContent = recentCount;
  }
}

/**
 * Toast notification system
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'warning', 'info'
 */
export function showToast(message, type = 'info') {
  // Check if toast container exists, create if not
  let container = document.getElementById('toast-container');
  
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = {
    success: '✓',
    error: '✗',
    warning: '⚠',
    info: 'ℹ'
  }[type] || 'ℹ';
  
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 10);
  
  // Auto dismiss after 5 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}