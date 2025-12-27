/**
 * EntityPickers Component
 * 
 * Reusable entity pickers for selecting items, storage, deployments
 */

import { fetchItems, searchItems } from '../utils/items-api.js';
import { fetchStorage, searchStorage } from '../utils/storage-api.js';
import { fetchDeployments, searchDeployments } from '../utils/deployments-api.js';

/**
 * Render item picker
 * @param {HTMLElement} container - Container element
 * @param {Array} selectedIds - Pre-selected item IDs
 * @param {boolean} multiSelect - Allow multiple selection
 */
export async function renderItemPicker(container, selectedIds = [], multiSelect = false) {
  container.innerHTML = `
    <div class="form-group entity-picker-group">
      <label for="item-search">
        ${multiSelect ? 'Select Items (for Gallery photos)' : 'Select Item'}
      </label>
      <input 
        type="text" 
        id="item-search" 
        class="form-input"
        placeholder="Search items by name or ID..."
      />
      <div id="item-results" class="picker-results"></div>
      <div id="selected-items" class="selected-entities"></div>
    </div>
  `;
  
  const searchInput = container.querySelector('#item-search');
  const resultsContainer = container.querySelector('#item-results');
  const selectedContainer = container.querySelector('#selected-items');
  
  let selectedItems = [...selectedIds];
  let searchTimeout;
  
  // Load all items initially
  await loadItems('', resultsContainer, selectedItems, multiSelect, (items) => {
    selectedItems = items;
    updateSelectedDisplay(selectedContainer, selectedItems, 'item', multiSelect);
  });
  
  // Search on input
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const query = searchInput.value.trim();
      await loadItems(query, resultsContainer, selectedItems, multiSelect, (items) => {
        selectedItems = items;
        updateSelectedDisplay(selectedContainer, selectedItems, 'item', multiSelect);
      });
    }, 300);
  });
  
  // Display currently selected items
  if (selectedIds.length > 0) {
    updateSelectedDisplay(selectedContainer, selectedIds, 'item', multiSelect);
  }
}

/**
 * Load and display items
 */
async function loadItems(query, container, selectedIds, multiSelect, onChange) {
  try {
    container.innerHTML = '<div class="picker-loading">🔄 Loading items...</div>';
    
    const response = query 
      ? await searchItems(query, { limit: 20 })
      : await fetchItems({ limit: 20 });
    
    const items = response.items || response || [];
    
    if (items.length === 0) {
      container.innerHTML = '<p class="picker-empty">No items found</p>';
      return;
    }
    
    container.innerHTML = items.map(item => {
      const isSelected = selectedIds.includes(item.id);
      return `
        <div class="picker-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
          <div class="picker-item-info">
            <div class="picker-item-name">${item.short_name || item.id}</div>
            <div class="picker-item-meta">${item.class || ''} ${item.class_type ? '- ' + item.class_type : ''}</div>
          </div>
          <div class="picker-item-action">
            ${isSelected ? '✓' : '+'}
          </div>
        </div>
      `;
    }).join('');
    
    // Attach click handlers
    container.querySelectorAll('.picker-item').forEach(element => {
      element.addEventListener('click', () => {
        const itemId = element.dataset.id;
        let newSelectedIds;
        
        if (multiSelect) {
          // Toggle selection
          if (selectedIds.includes(itemId)) {
            newSelectedIds = selectedIds.filter(id => id !== itemId);
            element.classList.remove('selected');
            element.querySelector('.picker-item-action').textContent = '+';
          } else {
            newSelectedIds = [...selectedIds, itemId];
            element.classList.add('selected');
            element.querySelector('.picker-item-action').textContent = '✓';
          }
        } else {
          // Single selection - clear others
          container.querySelectorAll('.picker-item').forEach(el => {
            el.classList.remove('selected');
            el.querySelector('.picker-item-action').textContent = '+';
          });
          newSelectedIds = [itemId];
          element.classList.add('selected');
          element.querySelector('.picker-item-action').textContent = '✓';
        }
        
        onChange(newSelectedIds);
      });
    });
    
  } catch (error) {
    console.error('Error loading items:', error);
    container.innerHTML = '<p class="picker-error">❌ Failed to load items</p>';
  }
}

/**
 * Render storage picker
 * @param {HTMLElement} container - Container element
 * @param {string} selectedId - Pre-selected storage ID
 */
export async function renderStoragePicker(container, selectedId = null) {
  container.innerHTML = `
    <div class="form-group entity-picker-group">
      <label for="storage-search">Select Storage Container</label>
      <input 
        type="text" 
        id="storage-search" 
        class="form-input"
        placeholder="Search storage by name or ID..."
      />
      <div id="storage-results" class="picker-results"></div>
      <div id="selected-storage" class="selected-entities"></div>
    </div>
  `;
  
  const searchInput = container.querySelector('#storage-search');
  const resultsContainer = container.querySelector('#storage-results');
  const selectedContainer = container.querySelector('#selected-storage');
  
  let selectedStorage = selectedId;
  let searchTimeout;
  
  // Load all storage initially
  await loadStorage('', resultsContainer, selectedStorage, (id) => {
    selectedStorage = id;
    updateSelectedDisplay(selectedContainer, selectedStorage ? [selectedStorage] : [], 'storage', false);
  });
  
  // Search on input
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const query = searchInput.value.trim();
      await loadStorage(query, resultsContainer, selectedStorage, (id) => {
        selectedStorage = id;
        updateSelectedDisplay(selectedContainer, selectedStorage ? [selectedStorage] : [], 'storage', false);
      });
    }, 300);
  });
  
  if (selectedId) {
    updateSelectedDisplay(selectedContainer, [selectedId], 'storage', false);
  }
}

/**
 * Load and display storage
 */
async function loadStorage(query, container, selectedId, onChange) {
  try {
    container.innerHTML = '<div class="picker-loading">🔄 Loading storage...</div>';
    
    const response = query
      ? await searchStorage(query, { limit: 20 })
      : await fetchStorage({ limit: 20 });
    
    const storage = response.storage || response || [];
    
    if (storage.length === 0) {
      container.innerHTML = '<p class="picker-empty">No storage found</p>';
      return;
    }
    
    container.innerHTML = storage.map(item => {
      const isSelected = selectedId === item.id;
      return `
        <div class="picker-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
          <div class="picker-item-info">
            <div class="picker-item-name">${item.short_name || item.id}</div>
            <div class="picker-item-meta">${item.type || ''} ${item.location ? '- ' + item.location : ''}</div>
          </div>
          <div class="picker-item-action">
            ${isSelected ? '✓' : '+'}
          </div>
        </div>
      `;
    }).join('');
    
    // Attach click handlers
    container.querySelectorAll('.picker-item').forEach(element => {
      element.addEventListener('click', () => {
        const storageId = element.dataset.id;
        
        // Clear other selections
        container.querySelectorAll('.picker-item').forEach(el => {
          el.classList.remove('selected');
          el.querySelector('.picker-item-action').textContent = '+';
        });
        
        element.classList.add('selected');
        element.querySelector('.picker-item-action').textContent = '✓';
        
        onChange(storageId);
      });
    });
    
  } catch (error) {
    console.error('Error loading storage:', error);
    container.innerHTML = '<p class="picker-error">❌ Failed to load storage</p>';
  }
}

/**
 * Render deployment picker
 * @param {HTMLElement} container - Container element
 * @param {string} selectedId - Pre-selected deployment ID
 */
export async function renderDeploymentPicker(container, selectedId = null) {
  container.innerHTML = `
    <div class="form-group entity-picker-group">
      <label for="deployment-search">Select Deployment</label>
      <input 
        type="text" 
        id="deployment-search" 
        class="form-input"
        placeholder="Search deployments..."
      />
      <div id="deployment-results" class="picker-results"></div>
      <div id="selected-deployment" class="selected-entities"></div>
    </div>
  `;
  
  const searchInput = container.querySelector('#deployment-search');
  const resultsContainer = container.querySelector('#deployment-results');
  const selectedContainer = container.querySelector('#selected-deployment');
  
  let selectedDeployment = selectedId;
  let searchTimeout;
  
  // Load all deployments initially
  await loadDeployments('', resultsContainer, selectedDeployment, (id) => {
    selectedDeployment = id;
    updateSelectedDisplay(selectedContainer, selectedDeployment ? [selectedDeployment] : [], 'deployment', false);
  });
  
  // Search on input
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      const query = searchInput.value.trim();
      await loadDeployments(query, resultsContainer, selectedDeployment, (id) => {
        selectedDeployment = id;
        updateSelectedDisplay(selectedContainer, selectedDeployment ? [selectedDeployment] : [], 'deployment', false);
      });
    }, 300);
  });
  
  if (selectedId) {
    updateSelectedDisplay(selectedContainer, [selectedId], 'deployment', false);
  }
}

/**
 * Load and display deployments
 */
async function loadDeployments(query, container, selectedId, onChange) {
  try {
    container.innerHTML = '<div class="picker-loading">🔄 Loading deployments...</div>';
    
    const response = query
      ? await searchDeployments(query, { limit: 20 })
      : await fetchDeployments({ limit: 20 });
    
    const deployments = response.deployments || response || [];
    
    if (deployments.length === 0) {
      container.innerHTML = '<p class="picker-empty">No deployments found</p>';
      return;
    }
    
    container.innerHTML = deployments.map(item => {
      const isSelected = selectedId === item.id;
      return `
        <div class="picker-item ${isSelected ? 'selected' : ''}" data-id="${item.id}">
          <div class="picker-item-info">
            <div class="picker-item-name">${item.name || item.id}</div>
            <div class="picker-item-meta">${item.season || ''} ${item.year || ''}</div>
          </div>
          <div class="picker-item-action">
            ${isSelected ? '✓' : '+'}
          </div>
        </div>
      `;
    }).join('');
    
    // Attach click handlers
    container.querySelectorAll('.picker-item').forEach(element => {
      element.addEventListener('click', () => {
        const deploymentId = element.dataset.id;
        
        // Clear other selections
        container.querySelectorAll('.picker-item').forEach(el => {
          el.classList.remove('selected');
          el.querySelector('.picker-item-action').textContent = '+';
        });
        
        element.classList.add('selected');
        element.querySelector('.picker-item-action').textContent = '✓';
        
        onChange(deploymentId);
      });
    });
    
  } catch (error) {
    console.error('Error loading deployments:', error);
    container.innerHTML = '<p class="picker-error">❌ Failed to load deployments</p>';
  }
}

/**
 * Update selected entities display
 */
function updateSelectedDisplay(container, entityIds, type, multiSelect) {
  if (!entityIds || entityIds.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  const labels = {
    item: '🎃',
    storage: '📦',
    deployment: '🚀'
  };
  
  const typeNames = {
    item: multiSelect ? 'Items' : 'Item',
    storage: 'Storage',
    deployment: 'Deployment'
  };
  
  container.innerHTML = `
    <div class="selected-list">
      <strong>Selected ${typeNames[type]}:</strong>
      <div class="selected-tags">
        ${entityIds.map(id => `
          <span class="selected-tag">
            ${labels[type]} ${id}
          </span>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Get selected item IDs
 */
export function getSelectedItems(container) {
  const items = container.querySelectorAll('#item-results .picker-item.selected');
  return Array.from(items).map(item => item.dataset.id);
}

/**
 * Get selected storage ID
 */
export function getSelectedStorage(container) {
  const storage = container.querySelector('#storage-results .picker-item.selected');
  return storage ? storage.dataset.id : null;
}

/**
 * Get selected deployment ID
 */
export function getSelectedDeployment(container) {
  const deployment = container.querySelector('#deployment-results .picker-item.selected');
  return deployment ? deployment.dataset.id : null;
}
