// Image Card Component
import { navigate } from '../utils/router.js';

export function ImageCard(photo) {
  const card = document.createElement('div');
  card.className = 'image-card';
  
  // Determine category badge
  const category = photo.category || photo.photo_type || 'unknown';
  const categoryLabel = category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  // Check if orphaned - FIXED: Added storage_id check
  const isOrphaned = !photo.item_ids?.length && !photo.idea_id && !photo.deployment_id && !photo.storage_id;
  
  card.innerHTML = `
    <div class="image-card-preview">
      <img 
        src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" 
        alt="${photo.caption || 'Image'}"
        loading="lazy"
      />
      ${isOrphaned ? '<span class="orphan-badge">Orphaned</span>' : ''}
      <span class="category-badge">${categoryLabel}</span>
    </div>
    <div class="image-card-body">
      <div class="image-card-id">${photo.photo_id}</div>
      <div class="image-card-meta">
        <span class="season-indicator season-${photo.season}">${photo.season}</span>
        ${photo.is_public ? '<span class="public-indicator">Public</span>' : ''}
      </div>
    </div>
    <div class="image-card-footer">
      <button class="btn btn-sm btn-secondary" data-action="view">View</button>
      <button class="btn btn-sm btn-primary" data-action="edit">Edit</button>
    </div>
  `;
  
  // Add event listeners
  const viewBtn = card.querySelector('[data-action="view"]');
  const editBtn = card.querySelector('[data-action="edit"]');
  
  viewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(`/images/${photo.photo_id}`);
  });
  
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(`/images/${photo.photo_id}/edit`);
  });
  
  // Make entire card clickable
  card.addEventListener('click', () => {
    navigate(`/images/${photo.photo_id}`);
  });
  
  return card;
}