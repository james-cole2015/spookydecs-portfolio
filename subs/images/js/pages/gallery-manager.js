// Gallery Manager Page
import { fetchImages, fetchImage, updateImage, patchImage, deleteImage } from '../utils/images-api.js';
import { IMAGES_CONFIG } from '../utils/images-config.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../shared/toast.js';
import { GalleryPhotoCard } from '../components/GalleryPhotoCard.js';
import { Breadcrumb } from '../components/Breadcrumb.js';

let currentSection = 'showcase';
let currentFilters = {
  season: '',
  year: '',
  tags: []
};

export async function renderGalleryManager() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="gallery-manager">
      <div class="page-header">
        <h1>Gallery Management</h1>
        <div class="header-actions">
          <button class="btn btn-primary" id="upload-photo-btn">
            Upload Photo
          </button>
          <button class="btn btn-secondary" id="back-btn">
            ← Back to Admin
          </button>
        </div>
      </div>

      <div class="gallery-tabs">
        <button class="tab-btn active" data-section="showcase">
          🎨 Showcase
        </button>
        <button class="tab-btn" data-section="progress">
          🔨 Progress
        </button>
        <button class="tab-btn" data-section="community">
          👥 Community
        </button>
      </div>

      <div class="gallery-filters">
        <div class="filter-group">
          <label>Season</label>
          <select class="form-control" data-filter="season">
            <option value="">All Seasons</option>
            ${IMAGES_CONFIG.SEASONS.map(s => `
              <option value="${s.value}">${s.label}</option>
            `).join('')}
          </select>
        </div>

        <div class="filter-group">
          <label>Year</label>
          <select class="form-control" data-filter="year">
            <option value="">All Years</option>
            ${getYearOptions()}
          </select>
        </div>

        <div class="filter-group filter-group--tags">
          <label>Tags</label>
          <input type="text" class="form-control" id="tag-filter-input" placeholder="Type tag + Enter" autocomplete="off" />
        </div>

        <button class="btn btn-secondary" data-action="clear-filters">
          Clear Filters
        </button>
      </div>
      <div class="tag-filter-chips" id="tag-filter-chips"></div>

      <div class="gallery-stats">
        <div class="stat-card">
          <span class="stat-value" id="total-photos">-</span>
          <span class="stat-label">Total Photos</span>
        </div>
        <div class="stat-card">
          <span class="stat-value" id="featured-photos">-</span>
          <span class="stat-label">Featured</span>
        </div>
        <div class="stat-card">
          <span class="stat-value" id="public-photos">-</span>
          <span class="stat-label">Public</span>
        </div>
      </div>

      <div class="gallery-grid" id="gallery-grid">
        <div class="loading">Loading photos...</div>
      </div>
    </div>
  `;

  app.prepend(Breadcrumb([
    { label: 'Images', path: '/images' },
    { label: 'Gallery Manager' }
  ]));

  attachGalleryHandlers();
  await loadGalleryPhotos();
}

function getYearOptions(selectedYear) {
  const currentYear = new Date().getFullYear();
  const selected = Number(selectedYear) || currentYear;
  const years = [];
  for (let year = currentYear; year >= 2020; year--) {
    years.push(`<option value="${year}" ${year === selected ? 'selected' : ''}>${year}</option>`);
  }
  return years.join('');
}

function renderTagFilterChips() {
  const container = document.getElementById('tag-filter-chips');
  if (!container) return;

  container.innerHTML = currentFilters.tags.map(tag => `
    <span class="tag-filter-chip" data-tag="${tag}">
      ${tag}
      <button type="button" class="tag-filter-chip-remove" data-remove-tag="${tag}" aria-label="Remove ${tag}">×</button>
    </span>
  `).join('');

  container.querySelectorAll('.tag-filter-chip-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      currentFilters.tags = currentFilters.tags.filter(t => t !== btn.dataset.removeTag);
      renderTagFilterChips();
      await loadGalleryPhotos();
    });
  });
}

function attachGalleryHandlers() {
  // Upload button
  document.getElementById('upload-photo-btn').addEventListener('click', handleUploadPhoto);

  // Back button
  const backBtn = document.getElementById('back-btn');
  backBtn.addEventListener('click', () => {
    navigate('/images/list');
  });

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const section = e.target.dataset.section;

      // Update active tab
      tabBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      currentSection = section;
      await loadGalleryPhotos();
    });
  });

  // Filter changes
  const filterSelects = document.querySelectorAll('[data-filter]');
  filterSelects.forEach(select => {
    select.addEventListener('change', async (e) => {
      const filterName = e.target.dataset.filter;
      currentFilters[filterName] = e.target.value;
      await loadGalleryPhotos();
    });
  });

  // Tag filter input
  const tagFilterInput = document.getElementById('tag-filter-input');
  tagFilterInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = tagFilterInput.value.trim().replace(/,$/, '').trim().toLowerCase();
      if (value && !currentFilters.tags.includes(value)) {
        currentFilters.tags.push(value);
        renderTagFilterChips();
        await loadGalleryPhotos();
      }
      tagFilterInput.value = '';
    }
  });

  // Clear filters
  const clearBtn = document.querySelector('[data-action="clear-filters"]');
  clearBtn.addEventListener('click', async () => {
    currentFilters = { season: '', year: '', tags: [] };
    document.querySelector('[data-filter="season"]').value = '';
    document.querySelector('[data-filter="year"]').value = '';
    renderTagFilterChips();
    await loadGalleryPhotos();
  });
}

async function handleUploadPhoto() {
  try {
    const { season, year } = await promptUploadMetadata();
    if (!season || !year) return;

    await loadPhotoUploadComponents();

    const sectionConfig = IMAGES_CONFIG.CATEGORIES[`gallery_${currentSection}`];
    const uploadModal = document.createElement('photo-upload-modal');
    uploadModal.setAttribute('context', 'gallery');
    uploadModal.setAttribute('photo-type', sectionConfig.photoType);
    uploadModal.setAttribute('category', `gallery_${currentSection}`);
    uploadModal.setAttribute('season', season);
    uploadModal.setAttribute('year', String(year));

    uploadModal.addEventListener('upload-complete', async (e) => {
      const { photo_ids } = e.detail;
      if (photo_ids && photo_ids.length > 0) {
        showToast(`${photo_ids.length} photo(s) uploaded`, 'success');
        await promptPostUploadMetadata(photo_ids);
        await loadGalleryPhotos();
      }
    });

    document.body.appendChild(uploadModal);
  } catch (error) {
    console.error('Failed to load photo upload:', error);
    showToast('Could not load photo upload component', 'error');
  }
}

function promptUploadMetadata() {
  return new Promise((resolve) => {
    const defaultYear = currentFilters.year || new Date().getFullYear();
    const defaultSeason = currentFilters.season || '';

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:400px">
        <div class="modal-header">
          <h2>Upload Photo</h2>
          <button class="modal-close" id="upload-meta-cancel">&times;</button>
        </div>
        <div class="modal-body">
          <div class="filter-group" style="max-width:none;margin-bottom:1rem">
            <label>Season</label>
            <select class="form-control" id="upload-meta-season">
              <option value="" disabled ${!defaultSeason ? 'selected' : ''}>Select season</option>
              ${IMAGES_CONFIG.SEASONS.map(s =>
                `<option value="${s.value}" ${s.value === defaultSeason ? 'selected' : ''}>${s.label}</option>`
              ).join('')}
            </select>
          </div>
          <div class="filter-group" style="max-width:none">
            <label>Year</label>
            <select class="form-control" id="upload-meta-year">
              ${getYearOptions(defaultYear)}
            </select>
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:0.75rem">
          <button class="btn btn-secondary" id="upload-meta-cancel-btn">Cancel</button>
          <button class="btn btn-primary" id="upload-meta-continue">Continue to Upload</button>
        </div>
      </div>
    `;

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('#upload-meta-cancel').addEventListener('click', () => close({}));
    overlay.querySelector('#upload-meta-cancel-btn').addEventListener('click', () => close({}));
    overlay.querySelector('#upload-meta-continue').addEventListener('click', () => {
      const season = overlay.querySelector('#upload-meta-season').value;
      const year = overlay.querySelector('#upload-meta-year').value;
      if (!season) {
        overlay.querySelector('#upload-meta-season').focus();
        return;
      }
      close({ season, year });
    });

    document.body.appendChild(overlay);
  });
}

async function promptPostUploadMetadata(photo_ids) {
  const photos = await Promise.all(photo_ids.map(id => fetchImage(id).catch(() => null)));
  const validPhotos = photos.filter(Boolean);
  if (validPhotos.length === 0) return;

  const LOCATION_OPTIONS = ['Front Yard', 'Side Yard', 'Back Yard'];

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="max-width:560px">
        <div class="modal-header">
          <h2>Set Photo Details</h2>
          <button class="modal-close" id="post-upload-skip">&times;</button>
        </div>
        <div class="modal-body" style="max-height:420px;overflow-y:auto">
          <p style="margin:0 0 1rem;color:var(--text-muted,#888);font-size:0.875rem">
            Optionally set a display name and location for each uploaded photo.
          </p>
          <div class="post-upload-rows">
            ${validPhotos.map(photo => `
              <div class="post-upload-row" data-photo-id="${photo.photo_id}" style="display:flex;gap:0.75rem;align-items:center;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border-color,#333)">
                <img src="${photo.thumb_cloudfront_url || photo.cloudfront_url}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:4px;flex-shrink:0" />
                <div style="flex:1;display:flex;flex-direction:column;gap:0.5rem">
                  <input
                    type="text"
                    class="form-control post-upload-name"
                    placeholder="Display name (e.g. Front Yard 2025)"
                    value="${photo.gallery_data?.display_name || ''}"
                    style="width:100%"
                  />
                  <select class="form-control post-upload-location" style="width:100%">
                    <option value="">— Select location —</option>
                    ${LOCATION_OPTIONS.map(loc => `
                      <option value="${loc}" ${photo.gallery_data?.location === loc ? 'selected' : ''}>${loc}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:0.75rem">
          <button class="btn btn-secondary" id="post-upload-skip-btn">Skip</button>
          <button class="btn btn-primary" id="post-upload-save-btn">Save</button>
        </div>
      </div>
    `;

    const close = () => { overlay.remove(); resolve(); };

    overlay.querySelector('#post-upload-skip').addEventListener('click', close);
    overlay.querySelector('#post-upload-skip-btn').addEventListener('click', close);

    overlay.querySelector('#post-upload-save-btn').addEventListener('click', async () => {
      const rows = overlay.querySelectorAll('.post-upload-row');
      const updates = [];

      rows.forEach(row => {
        const photoId = row.dataset.photoId;
        const photo = validPhotos.find(p => p.photo_id === photoId);
        const displayName = row.querySelector('.post-upload-name').value.trim();
        const location = row.querySelector('.post-upload-location').value;

        if (displayName || location) {
          updates.push(updateImage(photoId, {
            gallery_data: {
              ...(photo.gallery_data || {}),
              display_name: displayName,
              location,
            }
          }));
        }
      });

      if (updates.length > 0) {
        await Promise.all(updates);
      }

      close();
    });

    document.body.appendChild(overlay);
  });
}

async function loadPhotoUploadComponents() {
  if (!customElements.get('photo-upload-service')) {
    await loadScript('https://assets.spookydecs.com/components/photo-upload-service.js');
  }
  if (!customElements.get('photo-upload-modal')) {
    await loadScript('https://assets.spookydecs.com/components/photo-upload-modal.js');
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function getPhotoTypeFromSection(section) {
  return IMAGES_CONFIG.CATEGORIES[`gallery_${section}`]?.photoType;
}

async function loadGalleryPhotos() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = '<div class="loading">Loading photos...</div>';

  try {
    const photoType = getPhotoTypeFromSection(currentSection);

    const filters = {
      photo_type: photoType
    };

    if (currentFilters.season) {
      filters.season = currentFilters.season;
    }

    if (currentFilters.year) {
      filters.year = parseInt(currentFilters.year);
    }

    if (currentFilters.tags.length) {
      filters.tags = currentFilters.tags.join(',');
    }

    const photos = await fetchImages(filters);

    // Sort by featured, then sort_order, then created_at
    const sortedPhotos = photos.sort((a, b) => {
      const aGallery = a.gallery_data || {};
      const bGallery = b.gallery_data || {};

      // Featured first
      if (aGallery.is_featured && !bGallery.is_featured) return -1;
      if (!aGallery.is_featured && bGallery.is_featured) return 1;

      // Then by sort_order
      const aSortOrder = aGallery.sort_order || 999;
      const bSortOrder = bGallery.sort_order || 999;
      if (aSortOrder !== bSortOrder) return aSortOrder - bSortOrder;

      // Then by created_at (newest first)
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Update stats
    updateStats(sortedPhotos);

    // Render photos
    if (sortedPhotos.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p>No photos found</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    sortedPhotos.forEach(photo => {
      const card = GalleryPhotoCard(
        photo,
        handlePhotoUpdate,
        handlePhotoDelete
      );
      grid.appendChild(card);
    });

  } catch (error) {
    console.error('Error loading gallery photos:', error);
    grid.innerHTML = `
      <div class="error-state">
        <p>Failed to load photos</p>
        <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

function updateStats(photos) {
  const totalPhotos = photos.length;
  const featuredPhotos = photos.filter(p => p.gallery_data?.is_featured).length;
  const publicPhotos = photos.filter(p => p.is_public).length;

  document.getElementById('total-photos').textContent = totalPhotos;
  document.getElementById('featured-photos').textContent = featuredPhotos;
  document.getElementById('public-photos').textContent = publicPhotos;
}

async function handlePhotoUpdate(photoId, updates) {
  try {
    await patchImage(photoId, updates);
    await loadGalleryPhotos();
  } catch (error) {
    console.error('Error updating photo:', error);
    showToast('Failed to update photo', 'error');
  }
}

async function handlePhotoDelete(photoId) {
  try {
    await deleteImage(photoId);
    await loadGalleryPhotos();
  } catch (error) {
    console.error('Error deleting photo:', error);
    showToast('Failed to delete photo', 'error');
  }
}
