/**
 * PhotoCard Component
 * 
 * Cleaner photo card design for public gallery
 * - Larger images, less clutter
 * - Hover overlay with display name + location
 * - Small corner badge for featured photos
 * - No visible tags/captions (shown in lightbox only)
 */

export class PhotoCard {
  /**
   * Create photo card HTML
   */
  static create(photo, onClick) {
    const card = document.createElement('div');
    card.className = 'photo-grid-item';
    
    card.innerHTML = `
      <div class="photo-card" data-photo-id="${photo.photo_id}">
        <div class="photo-card-image-container">
          <img 
            src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" 
            alt="${photo.display_name || 'Display photo'}"
            class="photo-card-image"
            loading="lazy"
          />
          
          ${photo.is_featured ? `
            <div class="photo-card-featured-badge" title="Featured Display">⭐</div>
          ` : ''}
          
          <div class="photo-card-overlay">
            ${photo.display_name ? `
              <div class="photo-card-name">${photo.display_name}</div>
            ` : ''}
            ${photo.location ? `
              <div class="photo-card-location">${photo.location}</div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Click handler
    const cardEl = card.querySelector('.photo-card');
    cardEl.addEventListener('click', () => {
      if (onClick) {
        onClick(photo);
      }
    });

    return card;
  }

  /**
   * Create skeleton loader
   */
  static createSkeleton() {
    const skeleton = document.createElement('div');
    skeleton.className = 'photo-card-skeleton';
    
    // Random height for masonry effect
    const heights = ['250px', '300px', '350px', '280px', '320px'];
    const randomHeight = heights[Math.floor(Math.random() * heights.length)];
    
    skeleton.innerHTML = `
      <div class="photo-card-skeleton-image" style="height: ${randomHeight};"></div>
    `;

    return skeleton;
  }

  /**
   * Create multiple skeleton loaders
   */
  static createSkeletons(count = 8) {
    const skeletons = [];
    for (let i = 0; i < count; i++) {
      skeletons.push(this.createSkeleton());
    }
    return skeletons;
  }
}
