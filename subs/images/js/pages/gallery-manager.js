// Gallery Manager Page
import { fetchImages, patchImage, deleteImage } from '../utils/images-api.js';
import { IMAGES_CONFIG } from '../utils/images-config.js';
import { navigate } from '../utils/router.js';
import { showToast } from '../shared/toast.js';
import { GalleryPhotoCard } from '../components/GalleryPhotoCard.js';
import { Breadcrumb } from '../components/Breadcrumb.js';

let currentSection = 'showcase';
let currentFilters = {
  season: '',
  year: ''
};

export async function renderGalleryManager() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="gallery-manager">
      <div class="page-header">
        <h1>Gallery Management</h1>
        <div class="header-actions">
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

        <button class="btn btn-secondary" data-action="clear-filters">
          Clear Filters
        </button>
      </div>

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

function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= 2020; year--) {
    years.push(`<option value="${year}">${year}</option>`);
  }
  return years.join('');
}

function attachGalleryHandlers() {
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

  // Clear filters
  const clearBtn = document.querySelector('[data-action="clear-filters"]');
  clearBtn.addEventListener('click', async () => {
    currentFilters = { season: '', year: '' };
    document.querySelector('[data-filter="season"]').value = '';
    document.querySelector('[data-filter="year"]').value = '';
    await loadGalleryPhotos();
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
