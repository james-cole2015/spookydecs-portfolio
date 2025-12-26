// Existing photos display and management

export class ExistingPhotos {
  render(existingPhotos) {
    const categories = [
      { key: 'before_photos', label: 'Before Photos' },
      { key: 'after_photos', label: 'After Photos' },
      { key: 'documentation', label: 'Documentation' }
    ];
    
    return categories.map(({ key, label }) => {
      const photos = existingPhotos[key] || [];
      
      if (photos.length === 0) return '';
      
      return `
        <div class="existing-photos-section">
          <h4>${label} (${photos.length})</h4>
          <div class="existing-photos-grid">
            ${photos.map(photo => `
              <div class="existing-photo-item" data-photo-id="${photo.photo_id}" data-category="${key}">
                <img src="${photo.thumb_cloudfront_url}" alt="Photo" class="existing-photo-thumb">
                <div class="existing-photo-info">
                  <div class="photo-filename">${photo.metadata?.original_filename || 'Photo'}</div>
                  <div class="photo-type">${photo.photo_type}</div>
                </div>
                <button type="button" class="btn-remove-existing-photo" 
                        data-photo-id="${photo.photo_id}" data-category="${key}">
                  × Remove
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }
  
  attachEventListeners(container, onRemove) {
    const removeButtons = container.querySelectorAll('.btn-remove-existing-photo');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const photoId = e.target.dataset.photoId;
        const category = e.target.dataset.category;
        if (onRemove) {
          onRemove(photoId, category);
        }
      });
    });
  }
  
  rerender(container, existingPhotos, onRemove) {
    const formSection = container.querySelector('.form-section:has(#photo-upload-container)');
    if (!formSection) return;
    
    const existingSections = formSection.querySelectorAll('.existing-photos-section');
    existingSections.forEach(section => section.remove());
    
    const uploadContainer = formSection.querySelector('#photo-upload-container');
    if (uploadContainer) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.render(existingPhotos);
      
      while (tempDiv.firstChild) {
        uploadContainer.parentNode.insertBefore(tempDiv.firstChild, uploadContainer);
      }
    }
    
    this.attachEventListeners(container, onRemove);
  }
}