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

  try {
    const [photo, config] = await Promise.all([fetchImage(photoId), window.SpookyConfig.get()]);
    const financeUrl = config.finance_url || '';
    const maintUrl = config.MAINT_URL || '';
    const ideasUrl = config.IDEAS_ADMIN_URL || '';

    app.innerHTML = '';
    const crumbs = [
      { label: 'Images', path: '/images' },
      { label: 'Image Admin', path: '/images/list' },
      ...(isEditMode
        ? [{ label: photo.photo_id, path: `/images/${photo.photo_id}` }, { label: 'Edit' }]
        : [{ label: photo.photo_id }])
    ];
    app.appendChild(Breadcrumb(crumbs));
    app.appendChild(ImageDetail(photo, isEditMode, financeUrl, maintUrl, ideasUrl));

  } catch (error) {
    app.innerHTML = `
      <div class="error-state">
        <h2>Image Not Found</h2>
        <p>${error.message}</p>
        <button class="btn btn-primary" onclick="window.location.href='/images/list'">
          Back to Images
        </button>
      </div>
    `;
  }
}
