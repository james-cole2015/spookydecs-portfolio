// Record detail view - event handlers and actions

import { deleteRecord, fetchMultiplePhotos, updateRecord } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { isMobile } from '../utils/responsive.js';
import { PhotoSwipeGallery } from './PhotoSwipeGallery.js';
import { RecordDetailTabs } from './RecordDetailTabs.js';

export class RecordDetailActions {
  constructor(view) {
    this.view = view;
  }
  
  /**
   * Attach all event listeners to the container
   */
  attachEventListeners(container) {
    this.attachTabListeners(container);
    this.attachDeleteListener(container);

    // Collapsible section listeners (mobile)
    if (isMobile() && this.view.activeTab === 'details') {
      this.attachCollapsibleListeners(container);
    }

    // Initialize photos if starting on photos tab
    if (this.view.activeTab === 'photos') {
      const contentDiv = container.querySelector('.detail-content');
      if (contentDiv) {
        this.loadPhotosForTab(contentDiv);
        this.attachAddPhotosListener(container);
      }
    }
  }
  
  /**
   * Attach tab switching listeners
   */
  attachTabListeners(container) {
    const tabBtns = container.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        // Clean up old gallery if switching away from photos tab
        if (this.view.activeTab === 'photos' && this.view.photoGallery) {
          this.view.photoGallery.destroy();
          this.view.photoGallery = null;
        }
        
        this.view.activeTab = btn.getAttribute('data-tab');
        const contentDiv = container.querySelector('.detail-content');
        
        if (contentDiv) {
          contentDiv.innerHTML = this.view.renderTabContent();

          // Re-attach collapsible listeners if on details tab
          if (this.view.activeTab === 'details' && isMobile()) {
            this.attachCollapsibleListeners(contentDiv);
          }

          // Load photos and upload listener if on photos tab
          if (this.view.activeTab === 'photos') {
            await this.loadPhotosForTab(contentDiv);
            this.attachAddPhotosListener(container);
          }
        }
        
        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }
  
  /**
   * Attach delete button listener
   */
  attachDeleteListener(container) {
    const deleteBtn = container.querySelector('[data-action="delete"]');
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.handleDelete();
      });
    }
  }
  
  /**
   * Attach collapsible section listeners (mobile)
   */
  attachCollapsibleListeners(container) {
    const headers = container.querySelectorAll('.detail-section-header');
    
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const sectionId = header.getAttribute('data-section');
        const content = header.nextElementSibling;
        const toggle = header.querySelector('.detail-section-toggle');
        
        // Toggle state
        this.view.expandedSections[sectionId] = !this.view.expandedSections[sectionId];
        
        // Toggle classes
        content.classList.toggle('open');
        toggle.classList.toggle('open');
      });
    });
  }
  
  /**
   * Handle record deletion
   */
  async handleDelete() {
    const confirmed = confirm(
      `Are you sure you want to delete this ${this.view.record.record_type} record?\n\n` +
      `Title: ${this.view.record.title}\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await deleteRecord(this.view.recordId);
      appState.removeRecord(this.view.recordId);
      
      if (window.toast) {
        window.toast.success('Success', 'Record deleted successfully');
      }
      
      // Navigate back to main view
      navigateTo('/');
      
    } catch (error) {
      console.error('Failed to delete record:', error);
      
      if (window.toast) {
        window.toast.error('Error', 'Failed to delete record: ' + error.message);
      } else {
        alert('Failed to delete record: ' + error.message);
      }
    }
  }
  
  /**
   * Load and display photos for the photos tab
   */
  async loadPhotosForTab(container) {
    if (!this.view.record.attachments) return;
    
    const attachments = this.view.record.attachments;
    const categories = [
      { key: 'before_photos', label: 'Before Photos' },
      { key: 'after_photos', label: 'After Photos' },
      { key: 'documentation', label: 'Documentation' }
    ];
    
    // Collect all photo IDs for PhotoSwipeGallery
    let allPhotos = [];
    
    for (const { key, label } of categories) {
      const photoRefs = attachments[key] || [];
      if (photoRefs.length === 0) continue;
      
      const loadingDiv = container.querySelector(`.photo-category-loading[data-category="${key}"]`);
      const gridDiv = container.querySelector(`.photo-category-grid[data-category="${key}"]`);
      
      if (!gridDiv) continue;
      
      try {
        // Fetch photo objects
        const photoIds = photoRefs.map(ref => ref.photo_id);
        const photos = await fetchMultiplePhotos(photoIds);
        
        // Render photos in grid
        gridDiv.innerHTML = photos.map((photo, index) => 
          this.renderPhotoGridItem(photo, allPhotos.length + index)
        ).join('');
        
        // Add to all photos array for gallery
        allPhotos.push(...photos);
        
        // Hide loading, show grid
        if (loadingDiv) loadingDiv.style.display = 'none';
        gridDiv.style.display = 'grid';
        
      } catch (error) {
        console.error(`Failed to load ${label}:`, error);
        if (loadingDiv) {
          loadingDiv.textContent = `Failed to load ${label.toLowerCase()}`;
        }
      }
    }
    
    // Initialize PhotoSwipeGallery if photos loaded
    if (allPhotos.length > 0) {
      this.initializePhotoGallery(container, allPhotos);
    }
  }
  
  /**
   * Render a photo grid item
   */
  renderPhotoGridItem(photo, index) {
    return `
      <div class="photo-grid-item" data-photo-index="${index}">
        <img 
          src="${photo.thumb_cloudfront_url}" 
          alt="${photo.metadata?.original_filename || 'Photo'}"
          class="photo-grid-thumb"
          data-full-url="${photo.cloudfront_url}"
        >
        <div class="photo-grid-info">
          <div class="photo-filename">${photo.metadata?.original_filename || 'Photo'}</div>
          <div class="photo-meta">
            <span class="photo-type-badge">${photo.photo_type}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Attach the "Add Photos" button listener inside the photos tab
   */
  attachAddPhotosListener(container) {
    const contentDiv = container.querySelector('.detail-content');
    if (!contentDiv) return;

    const addBtn = contentDiv.querySelector('[data-action="add-photos"]');
    if (!addBtn) return;

    addBtn.addEventListener('click', () => {
      this.handleAddPhotos(container);
    });
  }

  /**
   * Open the CDN photo-upload-modal, then patch the record's attachments on success
   */
  async handleAddPhotos(container) {
    const contentDiv = container.querySelector('.detail-content');
    const category = contentDiv?.querySelector('#photo-category-select')?.value || 'documentation';

    const record = this.view.record;

    const modal = document.createElement('photo-upload-modal');
    modal.setAttribute('context', 'maintenance');
    modal.setAttribute('photo-type', record.record_type || 'maintenance');
    modal.setAttribute('season', this.view.item?.season || 'shared');
    modal.setAttribute('record-id', record.record_id);
    modal.setAttribute('item-id', record.item_id);
    modal.setAttribute('max-photos', '5');

    const modalContainer = document.getElementById('modal-container') || document.body;
    modalContainer.appendChild(modal);

    modal.addEventListener('upload-complete', async (e) => {
      modal.remove();

      const { photo_ids } = e.detail;
      if (!photo_ids || photo_ids.length === 0) return;

      try {
        const currentAttachments = record.attachments || {};
        const updatedAttachments = {
          ...currentAttachments,
          [category]: [
            ...(currentAttachments[category] || []),
            ...photo_ids.map(photo_id => ({ photo_id, photo_type: category }))
          ]
        };

        const updatedRecord = await updateRecord(record.record_id, { attachments: updatedAttachments });
        this.view.record = updatedRecord;
        this.view.tabs = new RecordDetailTabs(updatedRecord, this.view.itemId, this.view.expandedSections);

        if (contentDiv) {
          contentDiv.innerHTML = this.view.renderTabContent();
          await this.loadPhotosForTab(contentDiv);
          this.attachAddPhotosListener(container);
        }

        if (window.toast) {
          window.toast.success('Success', 'Photos added successfully');
        }
      } catch (error) {
        console.error('Failed to update record with photos:', error);
        if (window.toast) {
          window.toast.error('Error', 'Failed to save photos: ' + error.message);
        }
      }
    });

    modal.addEventListener('upload-cancel', () => {
      modal.remove();
    });
  }

  /**
   * Initialize PhotoSwipeGallery with loaded photos
   */
  initializePhotoGallery(container, photos) {
    // Convert to PhotoSwipeGallery format
    const galleryPhotos = photos.map(photo => ({
      url: photo.cloudfront_url,
      w: 0,  // Will be detected dynamically
      h: 0,  // Will be detected dynamically
      title: photo.metadata?.original_filename || 'Photo',
      type: photo.photo_type,
      color: '#6B7280'  // Default gray color
    }));
    
    this.view.photoGallery = new PhotoSwipeGallery(galleryPhotos);
    
    // Let PhotoSwipeGallery handle its own event listeners
    if (this.view.photoGallery && typeof this.view.photoGallery.attachEventListeners === 'function') {
      this.view.photoGallery.attachEventListeners(container);
    }
  }
}
