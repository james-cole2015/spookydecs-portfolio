/**
 * Packing Wizard Page
 * General packing workflow at /storage/pack
 * Handles Single and Store flows. Tote flow navigates to /storage/pack/:id.
 */

import { storageAPI, itemsAPI } from '../utils/storage-api.js';
import { formatStorageUnit } from '../utils/storage-config.js';
import { PackingWizard } from '../components/PackingWizard.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { renderBreadcrumb } from '../shared/breadcrumb.js';

let packingWizard = null;

/**
 * Render packing wizard page
 */
export async function renderPackingWizard() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="storage-pack-page">
      <div id="breadcrumb"></div>
      <div id="wizard-container"></div>
    </div>
  `;

  renderBreadcrumb(document.getElementById('breadcrumb'), [
    { label: 'Storage', route: '/' },
    { label: 'Packing Wizard' }
  ]);

  await loadData();
}

/**
 * Load storage units and items, then initialize wizard
 */
async function loadData() {
  try {
    const wizardContainer = document.getElementById('wizard-container');
    wizardContainer.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    `;

    const [allStorage, allItems] = await Promise.all([
      storageAPI.getAll({}),
      itemsAPI.getAll({})
    ]);

    const storageUnits = allStorage.map(unit => formatStorageUnit(unit));

    // Filter out meta-items (Deployments, Storage units, Receptacles)
    const actualItems = allItems.filter(item =>
      item.class !== 'Deployment' && item.class !== 'Storage'
    );

    packingWizard = new PackingWizard({
      storageUnits,
      availableItems: actualItems,
      onComplete: handleComplete,
      onCancel: () => navigate('/storage')
    });

    packingWizard.render(wizardContainer);

  } catch (error) {
    console.error('Error loading packing wizard data:', error);
    showError('Failed to load data for packing');
    setTimeout(() => navigate('/storage'), 2000);
  }
}

/**
 * Handle packing completion (Single and Store modes only — Tote navigates away)
 */
async function handleComplete(data) {
  try {
    switch (data.mode) {
      case 'single':
        await handleSinglePacking(data);
        break;
      case 'store':
        await handleStorePacking(data);
        break;
    }
  } catch (error) {
    console.error('Error completing packing:', error);
    showError(error.message || 'Failed to complete packing');
  }
}

async function handleSinglePacking(data) {
  await storageAPI.packSingleItems(data.itemIds, data.location);
  const itemCount = data.itemIds.length;
  showSuccess(`Successfully packed ${itemCount} item${itemCount !== 1 ? 's' : ''} in ${data.location}!`);
  navigate('/storage');
}

async function handleStorePacking(data) {
  await itemsAPI.bulkStore(data.itemIds, data.location);
  const itemCount = data.itemIds.length;
  showSuccess(`Successfully stored ${itemCount} item${itemCount !== 1 ? 's' : ''} in ${data.location}!`);
  navigate('/storage');
}
