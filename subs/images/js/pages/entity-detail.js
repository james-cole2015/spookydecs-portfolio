// Entity Detail Page — all photos for a single item or storage entity
import { fetchImages, setPrimaryPhoto } from '../utils/images-api.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { LightboxGallery } from '../components/LightboxGallery.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../shared/toast.js';

const PHOTO_TYPE_LABELS = {
  catalog:    'Catalog',
  deployment: 'Deployment',
  repair:     'Maintenance',
  build:      'Build',
  storage:    'Storage',
  inspection: 'Inspection',
  inspiration:'Inspiration',
};

export async function renderEntityDetail(params) {
  const entityId = params.data.id;
  const urlParams = new URLSearchParams(window.location.search);
  let entityType = urlParams.get('type') || 'item'; // default to item

  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="entity-detail-page">
      <div class="loading">Loading entity...</div>
    </div>
  `;

  app.prepend(Breadcrumb([
    { label: 'Images', path: '/images' },
    { label: 'Entities', path: '/images/entities' },
    { label: entityId }
  ]));

  let photos = await loadPhotos(entityId, entityType);

  // If no results with default type, try the other type
  if (photos.length === 0 && entityType === 'item') {
    photos = await loadPhotos(entityId, 'storage');
    if (photos.length > 0) entityType = 'storage';
  }

  if (photos.length === 0) {
    document.querySelector('.entity-detail-page').innerHTML = `
      <div class="empty-state">
        <p>No photos found for <strong>${entityId}</strong>.</p>
        <button class="btn btn-secondary" id="back-btn">Back to Entities</button>
      </div>
    `;
    document.getElementById('back-btn').addEventListener('click', () => navigate('/images/entities'));
    return;
  }

  renderDetailPage(app, entityId, entityType, photos);
}

async function loadPhotos(entityId, type) {
  try {
    const filter = type === 'storage' ? { storage_id: entityId } : { item_id: entityId };
    return await fetchImages(filter);
  } catch {
    return [];
  }
}

function renderDetailPage(app, entityId, entityType, photos) {
  // Derive metadata from photo records
  const primaryPhoto = photos.find(p => p.is_primary) || photos[0];
  const seasons = [...new Set(photos.map(p => p.season?.toLowerCase()).filter(Boolean))];
  const publicCount = photos.filter(p => p.is_public).length;
  const itemClass = photos.find(p => p.item_class)?.item_class;

  // Derive unique photo types present
  const photoTypes = [...new Set(photos.map(p => p.photo_type).filter(Boolean))];

  const seasonBadges = seasons
    .map(s => `<span class="season-badge season-${s}">${s}</span>`)
    .join('');

  const classBadge = itemClass ? `<span class="entity-class-badge">${itemClass}</span>` : '';

  const statsItems = [
    `${photos.length} photo${photos.length === 1 ? '' : 's'}`,
    publicCount > 0 ? `${publicCount} public` : null,
    seasons.length > 0 ? seasons.join(' / ') : null
  ].filter(Boolean);

  const page = app.querySelector('.entity-detail-page');

  page.innerHTML = `
    <div class="entity-detail-header">
      <div class="entity-detail-title">
        <h1>${entityId}</h1>
        <div class="entity-detail-badges">
          <span class="entity-type-label">${entityType === 'storage' ? 'Storage' : 'Item'}</span>
          ${classBadge}
          ${seasonBadges}
        </div>
      </div>
      <div class="entity-stats-row">${statsItems.join(' · ')}</div>
    </div>

    <div class="entity-detail-hero" id="entity-hero"></div>

    <div class="entity-type-tabs" id="entity-tabs"></div>

    <div class="entity-photos-grid" id="entity-photos-grid"></div>
  `;

  renderHero(document.getElementById('entity-hero'), photos, primaryPhoto);
  renderTabs(document.getElementById('entity-tabs'), photos, photoTypes, entityId, entityType);
  renderPhotosGrid(document.getElementById('entity-photos-grid'), photos, null, entityId, entityType);
}

function renderHero(container, photos, primaryPhoto) {
  const secondaries = photos.filter(p => p !== primaryPhoto).slice(0, 4);

  const primarySrc = primaryPhoto.cloudfront_url;
  const primaryThumb = primaryPhoto.thumb_cloudfront_url || primarySrc;

  const secondaryThumbs = secondaries.map((p, i) => {
    const src = p.thumb_cloudfront_url || p.cloudfront_url;
    return `<div class="entity-hero-thumb" data-index="${photos.indexOf(p)}">
      <img src="${src}" alt="${p.photo_id}" loading="lazy" />
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="entity-hero-primary" data-index="0">
      <img src="${primarySrc}" alt="${primaryPhoto.photo_id}" loading="lazy" />
    </div>
    ${secondaries.length > 0 ? `<div class="entity-hero-secondaries">${secondaryThumbs}</div>` : ''}
  `;

  // Lightbox on hero click
  container.querySelector('.entity-hero-primary').addEventListener('click', () => {
    LightboxGallery(photos, photos.indexOf(primaryPhoto));
  });
  container.querySelectorAll('.entity-hero-thumb').forEach(el => {
    el.addEventListener('click', () => {
      LightboxGallery(photos, parseInt(el.dataset.index, 10));
    });
  });
}

function renderTabs(container, photos, photoTypes, entityId, entityType) {
  const countAll = photos.length;

  const tabs = [{ type: null, label: 'All', count: countAll }];
  photoTypes.forEach(pt => {
    const count = photos.filter(p => p.photo_type === pt).length;
    tabs.push({ type: pt, label: PHOTO_TYPE_LABELS[pt] || pt, count });
  });

  container.innerHTML = tabs.map(tab => `
    <button
      class="entity-type-tab ${tab.type === null ? 'active' : ''}"
      data-type="${tab.type ?? ''}"
    >${tab.label} (${tab.count})</button>
  `).join('');

  container.querySelectorAll('.entity-type-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.entity-type-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filterType = btn.dataset.type || null;
      const filtered = filterType ? photos.filter(p => p.photo_type === filterType) : photos;
      renderPhotosGrid(document.getElementById('entity-photos-grid'), filtered, filterType, entityId, entityType);
    });
  });
}

function renderPhotosGrid(container, photos, activeType, entityId, entityType) {
  container.innerHTML = '';

  if (photos.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No photos for this filter.</p></div>';
    return;
  }

  photos.forEach((photo, index) => {
    container.appendChild(createPhotoCard(photo, index, photos, entityId, entityType));
  });
}

function createPhotoCard(photo, index, allPhotos, entityId, entityType) {
  const card = document.createElement('div');
  card.className = 'entity-photo-card';

  const thumb = photo.thumb_cloudfront_url || photo.cloudfront_url;
  const typeLabel = PHOTO_TYPE_LABELS[photo.photo_type] || photo.photo_type || '';
  const uploadDate = photo.upload_date ? photo.upload_date.slice(0, 10) : '';

  card.innerHTML = `
    <div class="entity-photo-preview">
      <img src="${thumb}" alt="${photo.photo_id}" loading="lazy" />
      ${photo.is_primary ? '<span class="primary-badge">Primary</span>' : ''}
    </div>
    <div class="entity-photo-body">
      <div class="entity-photo-id">${photo.photo_id}</div>
      <div class="entity-photo-meta">
        ${typeLabel ? `<span class="category-badge">${typeLabel}</span>` : ''}
        <span class="season-badge season-${(photo.season || 'shared').toLowerCase()}">${photo.season || ''}</span>
        ${photo.is_public ? '<span class="public-indicator">Public</span>' : ''}
      </div>
      ${uploadDate ? `<div class="entity-photo-date">${uploadDate}</div>` : ''}
    </div>
    <div class="entity-photo-footer">
      <button class="btn btn-sm btn-secondary" data-action="view-record">View Record</button>
      ${!photo.is_primary ? '<button class="btn btn-sm set-primary-btn" data-action="set-primary">Set Primary</button>' : ''}
    </div>
  `;

  // View Record — navigate to image detail page
  card.querySelector('[data-action="view-record"]').addEventListener('click', (e) => {
    e.stopPropagation();
    navigate(`/images/${photo.photo_id}`);
  });

  // Set Primary
  const setPrimaryBtn = card.querySelector('[data-action="set-primary"]');
  if (setPrimaryBtn) {
    setPrimaryBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      setPrimaryBtn.disabled = true;
      setPrimaryBtn.textContent = 'Saving...';
      try {
        const payload = {
          photo_id: photo.photo_id,
          context: entityType,
          ...(entityType === 'storage' ? { storage_id: entityId } : { item_id: entityId })
        };
        await setPrimaryPhoto(payload);
        // Re-render with fresh data
        const app = document.getElementById('app');
        const breadcrumb = app.querySelector('.breadcrumb');
        app.innerHTML = '<div class="entity-detail-page"><div class="loading">Refreshing...</div></div>';
        if (breadcrumb) app.prepend(breadcrumb);
        const refreshed = await loadPhotos(entityId, entityType);
        renderDetailPage(app, entityId, entityType, refreshed);
      } catch {
        setPrimaryBtn.disabled = false;
        setPrimaryBtn.textContent = 'Set Primary';
      }
    });
  }

  // Click card → lightbox
  card.querySelector('.entity-photo-preview').addEventListener('click', () => {
    LightboxGallery(allPhotos, index);
  });

  return card;
}
