// Gallery Photo Card Component
import { navigate } from '../utils/router.js';

export function GalleryPhotoCard(photo, onUpdate, onDelete) {
  const card = document.createElement('div');
  card.className = 'gallery-photo-card';
  
  const galleryData = photo.gallery_data || {};
  const displayName = galleryData.display_name || 'Untitled';
  const location = galleryData.location || '';
  const isFeatured = galleryData.is_featured || false;
  const sortOrder = galleryData.sort_order || 0;
  
  card.innerHTML = `
    <div class="photo-card-image">
      <img src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" alt="${displayName}" loading="lazy" />
      ${isFeatured ? '<div class="featured-badge">Featured</div>' : ''}
    </div>
    
    <div class="photo-card-body">
      <h3 class="photo-title">${displayName}</h3>
      ${location ? `<p class="photo-location">📍 ${location}</p>` : ''}
      
      <div class="photo-meta">
        <span class="meta-item">🎃 ${photo.season}</span>
        <span class="meta-item">📅 ${photo.year}</span>
        ${photo.is_public ? '<span class="meta-item public-badge">Public</span>' : '<span class="meta-item private-badge">Private</span>'}
      </div>
      
      ${photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
      
      ${photo.tags && photo.tags.length > 0 ? `
        <div class="photo-tags">
          ${photo.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
        </div>
      ` : ''}
      
      <div class="photo-card-actions">
        <button class="btn btn-sm btn-secondary" data-action="edit">
          ✏️ Edit
        </button>
        <button class="btn btn-sm ${isFeatured ? 'btn-primary' : 'btn-secondary'}" data-action="toggle-featured">
          ${isFeatured ? '⭐ Unfeature' : '⭐ Feature'}
        </button>
        <button class="btn btn-sm btn-danger" data-action="delete">
          🗑️ Delete
        </button>
      </div>
      
      <div class="photo-sort-order">
        Sort Order: 
        <input 
          type="number" 
          class="sort-order-input" 
          value="${sortOrder}" 
          min="0" 
          max="999"
          data-action="update-sort"
        />
      </div>
    </div>
  `;
  
  // Attach event listeners
  const editBtn = card.querySelector('[data-action="edit"]');
  const featuredBtn = card.querySelector('[data-action="toggle-featured"]');
  const deleteBtn = card.querySelector('[data-action="delete"]');
  const sortInput = card.querySelector('[data-action="update-sort"]');
  
  editBtn.addEventListener('click', () => {
    navigate(`/images/${photo.photo_id}/edit`);
  });
  
  featuredBtn.addEventListener('click', async () => {
    const newFeaturedStatus = !isFeatured;
    await onUpdate(photo.photo_id, {
      gallery_data: {
        ...galleryData,
        is_featured: newFeaturedStatus
      }
    });
  });
  
  deleteBtn.addEventListener('click', async () => {
    if (confirm(`Delete "${displayName}"? This cannot be undone.`)) {
      await onDelete(photo.photo_id);
    }
  });
  
  // Debounce sort order updates
  let sortTimeout;
  sortInput.addEventListener('input', (e) => {
    clearTimeout(sortTimeout);
    sortTimeout = setTimeout(async () => {
      const newSortOrder = parseInt(e.target.value) || 0;
      await onUpdate(photo.photo_id, {
        gallery_data: {
          ...galleryData,
          sort_order: newSortOrder
        }
      });
    }, 500);
  });
  
  return card;
}