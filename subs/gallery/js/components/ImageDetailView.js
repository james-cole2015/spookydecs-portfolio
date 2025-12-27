/**
 * ImageDetailView Component
 * 
 * Displays detailed information about a single photo
 */

import { formatDate, formatFileSize, getPhotoTypeLabel, getSeasonLabel, getSeasonColor } from '../utils/images-config.js';
import { navigate } from '../utils/router.js';

/**
 * Render the image detail view
 * @param {HTMLElement} container - Container element
 * @param {Object} photo - Photo object
 * @param {Object} relatedEntities - Related entities (items, storage, deployment)
 * @param {Function} onDelete - Delete callback
 * @param {Function} onEdit - Edit callback
 */
export function renderImageDetailView(container, photo, relatedEntities = {}, onDelete, onEdit) {
  const seasonColor = getSeasonColor(photo.season);
  
  container.innerHTML = `
    <div class="image-detail-view">
      <!-- Back Button -->
      <div class="detail-header">
        <button class="back-btn" id="back-btn">
          ← Back to Images
        </button>
      </div>
      
      <!-- Main Content -->
      <div class="detail-content">
        <!-- Left Column - Image Preview -->
        <div class="detail-left">
          <div class="image-preview">
            <img 
              src="${photo.cloudfront_url}" 
              alt="${photo.caption || photo.photo_id}"
              class="preview-image"
            />
          </div>
          
          ${photo.thumb_cloudfront_url ? `
            <div class="thumbnail-preview">
              <img 
                src="${photo.thumb_cloudfront_url}" 
                alt="Thumbnail"
                class="preview-thumbnail"
              />
              <span class="thumbnail-label">Thumbnail</span>
            </div>
          ` : ''}
        </div>
        
        <!-- Right Column - Metadata -->
        <div class="detail-right">
          <h2 class="detail-title">${photo.caption || 'Untitled Photo'}</h2>
          
          <div class="detail-metadata">
            <!-- Photo ID -->
            <div class="metadata-row">
              <span class="metadata-label">Photo ID:</span>
              <span class="metadata-value photo-id">${photo.photo_id}</span>
            </div>
            
            <!-- Photo Type -->
            <div class="metadata-row">
              <span class="metadata-label">Type:</span>
              <span class="badge badge-type">${getPhotoTypeLabel(photo.photo_type)}</span>
            </div>
            
            <!-- Season -->
            <div class="metadata-row">
              <span class="metadata-label">Season:</span>
              <span class="badge badge-season" style="background-color: ${seasonColor};">
                ${getSeasonLabel(photo.season)}
              </span>
            </div>
            
            <!-- Year -->
            <div class="metadata-row">
              <span class="metadata-label">Year:</span>
              <span class="metadata-value">${photo.year || 'N/A'}</span>
            </div>
            
            <!-- Upload Date -->
            <div class="metadata-row">
              <span class="metadata-label">Upload Date:</span>
              <span class="metadata-value">${formatDate(photo.upload_date)}</span>
            </div>
            
            <!-- File Size -->
            ${photo.metadata?.file_size ? `
              <div class="metadata-row">
                <span class="metadata-label">File Size:</span>
                <span class="metadata-value">${formatFileSize(photo.metadata.file_size)}</span>
              </div>
            ` : ''}
            
            <!-- Content Type -->
            ${photo.metadata?.content_type ? `
              <div class="metadata-row">
                <span class="metadata-label">Format:</span>
                <span class="metadata-value">${photo.metadata.content_type}</span>
              </div>
            ` : ''}
            
            <!-- Original Filename -->
            ${photo.metadata?.original_filename ? `
              <div class="metadata-row">
                <span class="metadata-label">Original File:</span>
                <span class="metadata-value">${photo.metadata.original_filename}</span>
              </div>
            ` : ''}
            
            <!-- Visibility -->
            <div class="metadata-row">
              <span class="metadata-label">Visibility:</span>
              <span class="metadata-value">
                ${photo.is_public ? '🌐 Public' : '🔒 Private'}
                ${photo.is_visible ? '' : ' (Hidden)'}
              </span>
            </div>
          </div>
          
          <!-- Tags -->
          ${photo.tags && photo.tags.length > 0 ? `
            <div class="detail-section">
              <h3 class="section-title">Tags</h3>
              <div class="tags-container">
                ${photo.tags.map(tag => `
                  <span class="tag">${tag}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
          
          <!-- Related Entities -->
          <div id="related-entities-container"></div>
          
          <!-- Action Buttons -->
          <div class="detail-actions">
            <button class="btn-primary" id="edit-btn">
              ✏️ Edit Photo
            </button>
            <button class="btn-secondary" id="view-gallery-btn">
              🖼️ View in Gallery
            </button>
            <button class="btn-danger" id="delete-btn">
              🗑️ Delete Photo
            </button>
          </div>
          
          <!-- URLs (for debugging/reference) -->
          <details class="detail-urls">
            <summary>URLs & Keys</summary>
            <div class="url-list">
              <div class="url-item">
                <strong>CloudFront URL:</strong>
                <a href="${photo.cloudfront_url}" target="_blank" class="url-link">
                  ${photo.cloudfront_url}
                </a>
              </div>
              <div class="url-item">
                <strong>S3 Key:</strong>
                <code>${photo.s3_key}</code>
              </div>
              ${photo.thumb_cloudfront_url ? `
                <div class="url-item">
                  <strong>Thumbnail URL:</strong>
                  <a href="${photo.thumb_cloudfront_url}" target="_blank" class="url-link">
                    ${photo.thumb_cloudfront_url}
                  </a>
                </div>
              ` : ''}
            </div>
          </details>
        </div>
      </div>
    </div>
  `;
  
  // Attach event listeners
  attachDetailListeners(container, photo, onDelete, onEdit);
}

/**
 * Attach event listeners to detail view elements
 * @param {HTMLElement} container - Container element
 * @param {Object} photo - Photo object
 * @param {Function} onDelete - Delete callback
 * @param {Function} onEdit - Edit callback
 */
function attachDetailListeners(container, photo, onDelete, onEdit) {
  // Back button
  const backBtn = container.querySelector('#back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      navigate('/images');
    });
  }
  
  // Edit button
  const editBtn = container.querySelector('#edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (onEdit) {
        onEdit(photo.photo_id);
      } else {
        navigate(`/images/${photo.photo_id}/edit`);
      }
    });
  }
  
  // View in gallery button
  const viewGalleryBtn = container.querySelector('#view-gallery-btn');
  if (viewGalleryBtn) {
    viewGalleryBtn.addEventListener('click', () => {
      navigate(`/images/gallery/${photo.photo_type}/${photo.season}`);
    });
  }
  
  // Delete button
  const deleteBtn = container.querySelector('#delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (onDelete) {
        onDelete(photo.photo_id);
      }
    });
  }
}
