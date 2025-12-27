/**
 * ImagesTable Component
 * 
 * TanStack table with expandable rows for image display
 */

import { formatDate, getPhotoTypeLabel, getSeasonLabel, getSeasonColor } from '../utils/images-config.js';
import { navigate } from '../utils/router.js';
import { showConfirmModal } from '../shared/modal.js';
import { showSuccess, showError } from '../shared/toast.js';
import { deletePhoto } from '../utils/images-api.js';

let expandedRows = new Set();

/**
 * Render the images table
 * @param {HTMLElement} container - Container element
 * @param {Array} photos - Array of photo objects
 * @param {Function} onDelete - Callback when photo is deleted
 */
export function renderImagesTable(container, photos, onDelete) {
  if (!photos || photos.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📷</div>
        <h3>No photos found</h3>
        <p>Try adjusting your filters or upload some photos</p>
      </div>
    `;
    return;
  }
  
  const tableHTML = `
    <div class="table-container">
      <table class="images-table">
        <thead>
          <tr>
            <th style="width: 80px;"></th>
            <th style="width: 200px;">Photo ID</th>
            <th style="width: auto;">Caption</th>
            <th style="width: 120px;">Type</th>
            <th style="width: 120px;">Season</th>
            <th style="width: 150px;">Upload Date</th>
            <th style="width: 50px;"></th>
          </tr>
        </thead>
        <tbody>
          ${photos.map(photo => renderTableRow(photo)).join('')}
        </tbody>
      </table>
    </div>
  `;
  
  container.innerHTML = tableHTML;
  
  // Attach event listeners
  attachTableListeners(container, photos, onDelete);
}

/**
 * Render a single table row
 * @param {Object} photo - Photo object
 * @returns {string} HTML for table row
 */
function renderTableRow(photo) {
  const isExpanded = expandedRows.has(photo.photo_id);
  const seasonColor = getSeasonColor(photo.season);
  
  return `
    <tr class="table-row ${isExpanded ? 'expanded' : ''}" data-photo-id="${photo.photo_id}">
      <td>
        <div class="thumbnail-cell">
          <img 
            src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" 
            alt="${photo.caption || photo.photo_id}"
            class="thumbnail-img"
            loading="lazy"
          />
        </div>
      </td>
      <td>
        <span class="photo-id">${photo.photo_id}</span>
      </td>
      <td>
        <span class="caption">${photo.caption || '<em>No caption</em>'}</span>
      </td>
      <td>
        <span class="badge badge-type">${getPhotoTypeLabel(photo.photo_type)}</span>
      </td>
      <td>
        <span class="badge badge-season" style="background-color: ${seasonColor};">
          ${getSeasonLabel(photo.season)}
        </span>
      </td>
      <td>
        <span class="date">${formatDate(photo.upload_date)}</span>
      </td>
      <td>
        <button class="expand-btn" data-photo-id="${photo.photo_id}" aria-label="Expand row">
          ${isExpanded ? '▼' : '▶'}
        </button>
      </td>
    </tr>
    ${isExpanded ? renderExpandedRow(photo) : ''}
  `;
}

/**
 * Render expanded row content
 * @param {Object} photo - Photo object
 * @returns {string} HTML for expanded row
 */
function renderExpandedRow(photo) {
  return `
    <tr class="expanded-row" data-photo-id="${photo.photo_id}">
      <td colspan="7">
        <div class="expanded-content">
          <div class="action-buttons">
            <button class="btn-action view-btn" data-photo-id="${photo.photo_id}">
              👁️ View
            </button>
            <button class="btn-action edit-btn" data-photo-id="${photo.photo_id}">
              ✏️ Edit
            </button>
            <button class="btn-action delete-btn" data-photo-id="${photo.photo_id}">
              🗑️ Delete
            </button>
          </div>
          
          ${photo.tags && photo.tags.length > 0 ? `
            <div class="photo-tags">
              <strong>Tags:</strong> ${photo.tags.join(', ')}
            </div>
          ` : ''}
          
          ${photo.item_ids && photo.item_ids.length > 0 ? `
            <div class="photo-items">
              <strong>Items:</strong> ${photo.item_ids.length} linked
            </div>
          ` : ''}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Attach event listeners to table elements
 * @param {HTMLElement} container - Container element
 * @param {Array} photos - Array of photo objects
 * @param {Function} onDelete - Callback when photo is deleted
 */
function attachTableListeners(container, photos, onDelete) {
  // Expand/collapse buttons
  const expandButtons = container.querySelectorAll('.expand-btn');
  expandButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      const photoId = button.dataset.photoId;
      toggleRow(container, photoId, photos, onDelete);
    });
  });
  
  // View buttons
  const viewButtons = container.querySelectorAll('.view-btn');
  viewButtons.forEach(button => {
    button.addEventListener('click', () => {
      const photoId = button.dataset.photoId;
      navigate(`/images/${photoId}`);
    });
  });
  
  // Edit buttons
  const editButtons = container.querySelectorAll('.edit-btn');
  editButtons.forEach(button => {
    button.addEventListener('click', () => {
      const photoId = button.dataset.photoId;
      navigate(`/images/${photoId}/edit`);
    });
  });
  
  // Delete buttons
  const deleteButtons = container.querySelectorAll('.delete-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const photoId = button.dataset.photoId;
      await handleDelete(photoId, onDelete);
    });
  });
  
  // Row click to view
  const rows = container.querySelectorAll('.table-row');
  rows.forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't navigate if clicking expand button or action buttons
      if (e.target.closest('.expand-btn') || e.target.closest('.btn-action')) {
        return;
      }
      const photoId = row.dataset.photoId;
      navigate(`/images/${photoId}`);
    });
  });
}

/**
 * Toggle row expansion
 * @param {HTMLElement} container - Container element
 * @param {string} photoId - Photo ID
 * @param {Array} photos - Array of photo objects
 * @param {Function} onDelete - Callback when photo is deleted
 */
function toggleRow(container, photoId, photos, onDelete) {
  if (expandedRows.has(photoId)) {
    expandedRows.delete(photoId);
  } else {
    expandedRows.add(photoId);
  }
  
  // Re-render table
  renderImagesTable(container, photos, onDelete);
}

/**
 * Handle photo deletion
 * @param {string} photoId - Photo ID
 * @param {Function} onDelete - Callback when photo is deleted
 */
async function handleDelete(photoId, onDelete) {
  const confirmed = await showConfirmModal({
    title: 'Delete Photo',
    message: 'Are you sure you want to delete this photo? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    confirmClass: 'btn-danger'
  });
  
  if (!confirmed) {
    return;
  }
  
  try {
    await deletePhoto(photoId);
    showSuccess('Photo deleted successfully');
    
    // Remove from expanded rows
    expandedRows.delete(photoId);
    
    // Trigger callback
    if (onDelete) {
      onDelete(photoId);
    }
  } catch (error) {
    console.error('Error deleting photo:', error);
    showError(`Failed to delete photo: ${error.message}`);
  }
}

/**
 * Clear expanded rows state
 */
export function clearExpandedRows() {
  expandedRows.clear();
}

/**
 * Get expanded rows
 * @returns {Set} Set of expanded photo IDs
 */
export function getExpandedRows() {
  return expandedRows;
}
