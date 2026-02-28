/**
 * Storage Pack Page
 * Entry point for the per-tote pack flow (/storage/:id/pack)
 */

import { storageAPI } from '../utils/storage-api.js';
import { formatStorageUnit } from '../utils/storage-config.js';
import { TotePackFlow } from '../components/TotePackFlow.js';
import { showSuccess, showError, showInfo } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { renderBreadcrumb } from '../shared/breadcrumb.js';
import { showLoading, hideLoading } from '../app.js';

let packFlow = null;

/**
 * Render the tote pack page
 */
export async function renderTotePackPage(id) {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="storage-pack-page">
      <div id="breadcrumb"></div>
      <div id="pack-flow-container"></div>
    </div>
  `;

  try {
    showLoading();
    const raw = await storageAPI.getById(id);
    hideLoading();

    if (!raw) {
      showError('Storage unit not found');
      navigate('/storage');
      return;
    }

    const tote = formatStorageUnit(raw);

    // Guard: must be a Tote
    if (tote.class_type !== 'Tote') {
      showInfo('Pack flow is only available for Tote-type storage units');
      navigate(`/storage/${id}`);
      return;
    }

    // Guard: already packed
    if (tote.packed) {
      showInfo('This tote is already marked as packed');
      navigate(`/storage/${id}`);
      return;
    }

    renderBreadcrumb(document.getElementById('breadcrumb'), [
      { label: 'Storage', route: '/' },
      { label: 'Totes', route: '/storage' },
      { label: tote.short_name || tote.id, route: `/storage/${id}` },
      { label: 'Pack' }
    ]);

    packFlow = new TotePackFlow({
      toteData: tote,
      onComplete: (data) => handleComplete(id, data),
      onCancel: () => navigate(`/storage/${id}`)
    });

    packFlow.render(document.getElementById('pack-flow-container'));

  } catch (error) {
    hideLoading();
    console.error('Error loading tote for packing:', error);
    showError('Failed to load tote data');
    setTimeout(() => navigate('/storage'), 1500);
  }
}

/**
 * Handle pack flow completion — mark tote as packed
 */
async function handleComplete(id, { confirmedItemIds, photoUploaded }) {
  try {
    showLoading();
    await storageAPI.update(id, { packed: true });
    hideLoading();

    const itemCount = confirmedItemIds.length;
    const itemLabel = itemCount === 1 ? 'item' : 'items';
    const photoNote = photoUploaded ? ' Photo added.' : '';
    showSuccess(`Tote packed! ${itemCount} ${itemLabel} confirmed.${photoNote}`);

    navigate(`/storage/${id}`);
  } catch (error) {
    hideLoading();
    console.error('Error marking tote as packed:', error);
    showError(error.message || 'Failed to mark tote as packed');
  }
}
