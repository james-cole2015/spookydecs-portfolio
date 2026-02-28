/**
 * Storage Pack Page
 * Entry point for the per-tote pack flow (/storage/pack/:id)
 */

import { storageAPI, itemsAPI } from '../utils/storage-api.js';
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
    const [raw, allItemsData] = await Promise.all([
      storageAPI.getById(id),
      itemsAPI.getAll({})
    ]);
    hideLoading();

    if (!raw) {
      showError('Storage unit not found');
      navigate('/storage/pack');
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

    // Filter items eligible for tote packing
    const availableItems = allItemsData.filter(item => {
      if (item.class === 'Deployment' || item.class === 'Storage') return false;
      const isPackable = item.packing_data?.packable !== false;
      const isUnpacked = item.packing_data?.packing_status === false;
      const isNotSinglePacked = item.packing_data?.single_packed !== true;
      const isNotReceptacle = item.class_type !== 'Receptacle';
      return isPackable && isUnpacked && isNotSinglePacked && isNotReceptacle;
    });

    renderBreadcrumb(document.getElementById('breadcrumb'), [
      { label: 'Storage', route: '/' },
      { label: 'Totes', route: '/storage' },
      { label: 'Pack', route: '/storage/pack' },
      { label: tote.short_name || tote.id }
    ]);

    packFlow = new TotePackFlow({
      toteData: tote,
      availableItems,
      onComplete: (data) => handleComplete(id, data),
      onCancel: () => navigate('/storage/pack')
    });

    packFlow.render(document.getElementById('pack-flow-container'));

  } catch (error) {
    hideLoading();
    console.error('Error loading tote for packing:', error);
    showError('Failed to load tote data');
    setTimeout(() => navigate('/storage/pack'), 1500);
  }
}

/**
 * Handle pack flow completion — add items and optionally mark tote as packed
 */
async function handleComplete(id, { newItemIds, photoUploaded, markPacked }) {
  try {
    showLoading();

    if (newItemIds.length > 0) {
      await storageAPI.addItems(id, newItemIds, markPacked);
    } else if (markPacked) {
      await storageAPI.update(id, { packed: true });
    }

    hideLoading();

    const itemCount = newItemIds.length;
    const itemLabel = itemCount === 1 ? 'item' : 'items';
    const itemNote = itemCount > 0 ? ` ${itemCount} ${itemLabel} added.` : '';
    const photoNote = photoUploaded ? ' Photo added.' : '';
    const statusNote = markPacked ? ' Tote marked as packed.' : '';
    showSuccess(`Done!${itemNote}${photoNote}${statusNote}`);

    navigate(`/storage/${id}`);
  } catch (error) {
    hideLoading();
    console.error('Error completing tote pack flow:', error);
    showError(error.message || 'Failed to save tote changes');
  }
}
