/**
 * PhotoGallery Component — Items Sub
 *
 * Renders a mini gallery of catalog photos for an item.
 * Supports promoting a secondary photo to primary via POST /admin/images/set_primary.
 *
 * Usage:
 *   const gallery = new PhotoGallery({ itemId, season, onAddPhotos });
 *   await gallery.render(containerElement);
 */

import { listPhotosForItem, setPrimaryPhoto } from '../api/photos.js';
import { toast } from '../shared/toast.js';

export class PhotoGallery {
  constructor({ itemId, season, onAddPhotos }) {
    this.itemId = itemId;
    this.season = season;
    this.onAddPhotos = onAddPhotos || (() => {});
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
      const result = await listPhotosForItem(this.itemId);
      const photos = result.photos || [];
      this.primaryPhoto = photos.find(p => p.is_primary) || null;
      this.secondaryPhotos = photos.filter(p => !p.is_primary);
    } catch (error) {
      console.error('PhotoGallery: error loading photos', error);
      this.primaryPhoto = null;
      this.secondaryPhotos = [];
    }
  }

  renderGallery() {
    if (!this.container) return;

    const hasPhotos = this.primaryPhoto || this.secondaryPhotos.length > 0;

    this.container.innerHTML = `
      <div class="photo-gallery">
        ${hasPhotos ? this.renderPhotos() : this.renderEmpty()}
        <div class="photo-gallery-actions">
          <button class="btn btn-secondary btn-sm" id="pg-add-photos">+ Add Photos</button>
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
    return `
      <div class="photo-gallery-primary-slot">
        <h3 class="photo-gallery-subtitle">Primary Photo</h3>
        <div class="photo-card photo-card-primary">
          <img src="${src}" alt="Primary photo" class="photo-card-img" loading="lazy">
          <span class="photo-badge-primary">Primary</span>
        </div>
      </div>
    `;
  }

  renderSecondaryGrid() {
    const cards = this.secondaryPhotos.map(p => {
      const src = p.thumb_cloudfront_url || p.cloudfront_url;
      return `
        <div class="photo-card" data-photo-id="${p.photo_id}">
          <img src="${src}" alt="Photo" class="photo-card-img" loading="lazy">
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

    this.container.querySelector('#pg-add-photos')
      ?.addEventListener('click', () => this.onAddPhotos());

    this.container.querySelectorAll('.btn-set-primary').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        await this.handleSetPrimary(e.currentTarget.dataset.photoId);
      });
    });
  }

  async handleSetPrimary(photoId) {
    const btn = this.container.querySelector(`.btn-set-primary[data-photo-id="${photoId}"]`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving...';
    }

    try {
      await setPrimaryPhoto(photoId, this.itemId);
      toast.success('Primary Updated', 'Primary photo has been updated');
      await this.loadPhotos();
      this.renderGallery();
    } catch (error) {
      console.error('PhotoGallery: error setting primary', error);
      toast.error('Update Failed', error.message || 'Could not update primary photo');
      this.renderGallery();
    }
  }

  async refresh() {
    await this.loadPhotos();
    this.renderGallery();
  }
}
