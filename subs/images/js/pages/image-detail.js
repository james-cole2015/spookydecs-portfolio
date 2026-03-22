// Image Detail Page
import { fetchImage } from '../utils/images-api.js';
import { ImageDetail } from '../components/ImageDetail.js';
import { Breadcrumb } from '../components/Breadcrumb.js';
import { showToast } from '../shared/toast.js';

export async function renderImageDetail(params) {
  const app = document.getElementById('app');
  const photoId = params.data.photoId;

  // Check if we're in edit mode by looking at the route or URL
  const isEditMode = params.url && params.url.includes('/edit');

  app.innerHTML = '<div class="loading">Loading image...</div>';

  const from = params.params?.from || new URLSearchParams(window.location.search).get('from');
  const PARENT_CRUMBS = {
    gallery: { label: 'Gallery Manager', path: '/images/gallery' },
    entity:  { label: 'Entities',        path: '/images/entities' },
  };
  const parent = PARENT_CRUMBS[from] ?? { label: 'Image Admin', path: '/images/list' };

  try {
    const [photo, config] = await Promise.all([fetchImage(photoId), window.SpookyConfig.get()]);
    const financeUrl = config.finance_url || '';
    const maintUrl = config.MAINT_URL || '';
    const ideasUrl = config.IDEAS_ADMIN_URL || '';

    app.innerHTML = '';
    const crumbs = [
      { label: 'Images', path: '/images' },
      parent,
      ...(isEditMode
        ? [{ label: photo.photo_id, path: `/images/${photo.photo_id}${from ? `?from=${from}` : ''}` }, { label: 'Edit' }]
        : [{ label: photo.photo_id }])
    ];
    app.appendChild(Breadcrumb(crumbs));
    app.appendChild(ImageDetail(photo, isEditMode, financeUrl, maintUrl, ideasUrl, from));

  } catch (error) {
    app.innerHTML = `
      <div class="error-state">
        <h2>Image Not Found</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="window.location.href='${parent.path}'">
          Back to Images
        </button>
      </div>
    `;
  }
}
