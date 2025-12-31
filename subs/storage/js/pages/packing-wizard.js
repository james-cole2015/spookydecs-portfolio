/**
 * Packing Wizard Page
 * Unified packing workflow for totes, single-packed items, and storage
 */

import { storageAPI, itemsAPI } from '../utils/storage-api.js';
import { formatStorageUnit } from '../utils/storage-config.js';
import { PackingWizard } from '../components/PackingWizard.js';
import { showSuccess, showError } from '../shared/toast.js';
import { navigate } from '../utils/router.js';

let packingWizard = null;

/**
 * Show loading indicator
 */
function showLoading() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    `;
  }
}

/**
 * Render packing wizard page
 */
export async function renderPackingWizard() {
  const app = document.getElementById('app');
  
  // Create page structure
  app.innerHTML = `
    <div class="storage-pack-page">
      <div id="wizard-container"></div>
    </div>
  `;
  
  // Load data
  await loadData();
}

/**
 * Load storage units and items
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
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode'); // 'tote', 'single', 'store', or null
    const itemsParam = urlParams.get('items'); // Comma-separated item IDs
    const preselectedItems = itemsParam ? itemsParam.split(',') : [];
    
    console.log('🔍 Packing Wizard - Mode:', mode);
    console.log('🔍 Packing Wizard - Preselected Items:', preselectedItems);
    
    // Fetch storage units (for tote mode)
    const allStorage = await storageAPI.getAll({});
    const formatted = allStorage.map(unit => formatStorageUnit(unit));
    const storageUnits = formatted.filter(unit => unit.class_type === 'Tote');
    
    // Fetch all items
    const allItems = await itemsAPI.getAll({});
    const actualItems = allItems.filter(item => item.class !== 'Deployment' && item.class !== 'Storage' && item.class !== 'Receptacle');

    
console.log('🔍 All items loaded:', allItems.length);
console.log('🔍 Actual items after filter:', actualItems.length);

const unpackedItems = actualItems.filter(i => i.packing_data?.packing_status === false);
console.log('🔍 Total unpacked items found:', unpackedItems.length);
console.log('🔍 First unpacked item:', unpackedItems[0]);
console.log('🔍 First unpacked item full packing_data:', unpackedItems[0]?.packing_data);

// Now test the FULL tote filter on the first unpacked item
if (unpackedItems[0]) {
  const testItem = unpackedItems[0];
  console.log('🔍 Testing first unpacked item against tote filter:');
  console.log('  - packable:', testItem.packing_data?.packable, '!== false?', testItem.packing_data?.packable !== false);
  console.log('  - packing_status:', testItem.packing_data?.packing_status, '=== false?', testItem.packing_data?.packing_status === false);
  console.log('  - single_packed:', testItem.packing_data?.single_packed, '!== true?', testItem.packing_data?.single_packed !== true);
  console.log('  - class_type:', testItem.class_type, '!== Receptacle?', testItem.class_type !== 'Receptacle');
  console.log('  - deployed:', testItem.deployment_data?.deployed, '=== false?', testItem.deployment_data?.deployed === false);
  
  const passesFilter = 
    (testItem.packing_data?.packable !== false) &&
    (testItem.packing_data?.packing_status === false) &&
    (testItem.packing_data?.single_packed !== true) &&
    (testItem.class_type !== 'Receptacle') &&
    (testItem.deployment_data?.deployed === false);
  
  console.log('  - PASSES FILTER?', passesFilter);
}

    
    // Initialize wizard
    packingWizard = new PackingWizard({
      mode: mode,
      preselectedItems: preselectedItems,
      storageUnits: storageUnits,
      availableItems: actualItems,
      onComplete: handleComplete,
      onCancel: handleCancel
    });
    
    packingWizard.render(document.getElementById('wizard-container'));
    
  } catch (error) {
    console.error('Error loading data:', error);
    showError('Failed to load data for packing');
    
    // Redirect back to list
    setTimeout(() => {
      navigate('/storage');
    }, 2000);
  }
}

/**
 * Handle packing completion
 */
async function handleComplete(data) {
  console.log('🔍 Packing complete with data:', data);
  
  try {
    switch (data.mode) {
      case 'tote':
        await handleTotePacking(data);
        break;
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

/**
 * Handle tote packing
 */
async function handleTotePacking(data) {
  await storageAPI.addItems(data.storageId, data.itemIds, data.markAsPacked);
  
  const itemCount = data.itemIds.length;
  const message = data.markAsPacked 
    ? `Successfully packed ${itemCount} item${itemCount > 1 ? 's' : ''} and marked tote as packed!`
    : `Successfully packed ${itemCount} item${itemCount > 1 ? 's' : ''}!`;
  
  showSuccess(message);
  navigate('/storage');
}

/**
 * Handle single-packed item packing
 */
async function handleSinglePacking(data) {
  await storageAPI.packSingleItems(data.itemIds, data.location);
  
  const itemCount = data.itemIds.length;
  const message = `Successfully created ${itemCount} self-contained storage unit${itemCount > 1 ? 's' : ''} in ${data.location}!`;
  
  showSuccess(message);
  navigate('/storage');
}

/**
 * Handle item storage
 */
async function handleStorePacking(data) {
  await itemsAPI.bulkStore(data.itemIds, data.location);
  
  const itemCount = data.itemIds.length;
  const message = `Successfully stored ${itemCount} item${itemCount > 1 ? 's' : ''} in ${data.location}!`;
  
  showSuccess(message);
  navigate('/storage');
}

/**
 * Handle cancel
 */
function handleCancel() {
  navigate('/storage');
}
