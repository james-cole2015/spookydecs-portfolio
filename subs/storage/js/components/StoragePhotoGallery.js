/**
 * StoragePhotoGallery Component — Storage Sub
 *
 * Renders a mini gallery of storage photos with primary/secondary management.
 * Supports promoting a secondary photo to primary via POST /admin/images/set_primary.
 * Upload button creates a photo-upload-modal inline (CDN component pre-loaded in index.html).
 *
 * Usage:
 *   const gallery = new StoragePhotoGallery({ storageId, season });
 *   await gallery.render(containerElement);
 */

import { photosAPI } from '../utils/storage-api.js';
import { showSuccess, showError } from '../shared/toast.js';

export class StoragePhotoGallery {
  constructor({ storageId, season }) {
    this.storageId = storageId;
    this.season = season || 'shared';
    this.container = null;
    this.primaryPhoto = null;
    this.secondaryPhotos = [];
  }

  async render(containerElement) {
    this.container = containerElement;
    this.container.innerHTML = '<p class="photo-gallery-loading">Loading photos...</p>';
    await this.loadPhotos();
    this.renderGallery();
  }

  async loadPhotos() {
    try {
      const result = await photosAPI.listPhotos(this.storageId);
      const photos = result.photos || [];
      this.primaryPhoto = photos.find(p => p.is_primary) || null;
      this.secondaryPhotos = photos.filter(p => !p.is_primary);
    } catch (error) {
      console.error('StoragePhotoGallery: error loading photos', error);
      this.primaryPhoto = null;
      this.secondaryPhotos = [];
    }
  }

  renderGallery() {
    if (!this.container) return;

    const totalPhotos = (this.primaryPhoto ? 1 : 0) + this.secondaryPhotos.length;
    const hasPhotos = totalPhotos > 0;
    const atLimit = totalPhotos >= 2;

    this.container.innerHTML = `
      <div class="photo-gallery">
        ${hasPhotos ? this.renderPhotos() : this.renderEmpty()}
        <div class="photo-gallery-actions">
          ${atLimit
            ? '<span class="photo-limit-notice">Photo limit reached (2 max)</span>'
            : '<button class="btn btn-secondary btn-sm" id="spg-add-photos">+ Add Photos</button>'
          }
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderEmpty() {
    return '<p class="photo-gallery-empty">No photos yet. Add one using the button below.</p>';
  }

  renderPhotos() {
    return `
      ${this.primaryPhoto ? this.renderPrimarySlot() : ''}
      ${this.secondaryPhotos.length > 0 ? this.renderSecondaryGrid() : ''}
    `;
  }

  renderPrimarySlot() {
    const p = this.primaryPhoto;
    const src = p.thumb_cloudfront_url || p.cloudfront_url;
    const fullSrc = p.cloudfront_url || src;
    return `
      <div class="photo-gallery-primary-slot">
        <h3 class="photo-gallery-subtitle">Primary Photo</h3>
        <div class="photo-card photo-card-primary">
          <img src="${src}" alt="Primary photo" class="photo-card-img photo-card-clickable" loading="lazy" data-full-src="${fullSrc}">
          <span class="photo-badge-primary">Primary</span>
        </div>
      </div>
    `;
  }

  renderSecondaryGrid() {
    const cards = this.secondaryPhotos.map(p => {
      const src = p.thumb_cloudfront_url || p.cloudfront_url;
      const fullSrc = p.cloudfront_url || src;
      return `
        <div class="photo-card" data-photo-id="${p.photo_id}">
          <img src="${src}" alt="Photo" class="photo-card-img photo-card-clickable" loading="lazy" data-full-src="${fullSrc}">
          <button class="btn-set-primary" data-photo-id="${p.photo_id}">Set as Primary</button>
        </div>
      `;
    }).join('');

    return `
      <div class="photo-gallery-secondary-slot">
        <h3 class="photo-gallery-subtitle">Additional Photos</h3>
        <div class="photo-gallery-grid">${cards}</div>
      </div>
    `;
  }

  attachEventListeners() {
    if (!this.container) return;

    this.container.querySelector('#spg-add-photos')
      ?.addEventListener('click', () => this.openUploadModal());

    this.container.querySelectorAll('.btn-set-primary').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        await this.handleSetPrimary(e.currentTarget.dataset.photoId);
      });
    });

    this.container.querySelectorAll('.photo-card-clickable').forEach(img => {
      img.addEventListener('click', () => this.openLightbox(img.dataset.fullSrc));
    });
  }

  openLightbox(src) {
    const overlay = document.createElement('div');
    overlay.className = 'spg-lightbox-overlay';
    overlay.innerHTML = `
      <div class="spg-lightbox-backdrop"></div>
      <img class="spg-lightbox-img" src="${src}" alt="Full size photo">
      <button class="spg-lightbox-close" aria-label="Close">&times;</button>
    `;

    const close = () => overlay.remove();
    overlay.querySelector('.spg-lightbox-backdrop').addEventListener('click', close);
    overlay.querySelector('.spg-lightbox-close').addEventListener('click', close);
    document.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    });

    document.body.appendChild(overlay);
  }

  openUploadModal() {
    const totalPhotos = (this.primaryPhoto ? 1 : 0) + this.secondaryPhotos.length;
    const remainingSlots = Math.max(0, 2 - totalPhotos);
    if (remainingSlots === 0) return;

    const modal = document.createElement('photo-upload-modal');
    modal.setAttribute('context', 'storage');
    modal.setAttribute('photo-type', 'storage');
    modal.setAttribute('season', this.season);
    modal.setAttribute('storage-id', this.storageId);
    modal.setAttribute('max-photos', String(remainingSlots));

    modal.addEventListener('upload-complete', async () => {
      await this.refresh();
    });

    document.body.appendChild(modal);
  }

  async handleSetPrimary(photoId) {
    const btn = this.container.querySelector(`.btn-set-primary[data-photo-id="${photoId}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    try {
      await photosAPI.setPrimary(photoId, this.storageId);
      showSuccess('Primary photo updated');
      await this.loadPhotos();
      this.renderGallery();
    } catch (error) {
      console.error('StoragePhotoGallery: error setting primary', error);
      showError(error.message || 'Could not update primary photo');
      this.renderGallery();
    }
  }

  async refresh() {
    await this.loadPhotos();
    this.renderGallery();
  }
}
