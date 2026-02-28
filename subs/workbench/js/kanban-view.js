// Kanban Board View

import { getSeasons, getSeason, getSeasonItems, updateItem, importItems } from './api.js';
import { 
  getDaysUntilHalloween, 
  formatCurrency, 
  getPriorityColor, 
  getPriorityLabel,
  getStatusLabel,
  getRecordTypeLabel,
  groupBy,
  sortByPriority 
} from './utils.js';
import { navigateTo } from './router.js';
import { toast } from './toast.js';
import { modal } from './modal.js';
import { spinner } from './spinner.js';

let currentSeasonId = null;
let currentItems = [];
let currentFilters = {
  status: 'all',
  priority: 'all',
  recordType: 'all',
  sourceType: 'all'
};
let filterPanelOpen = false;

export async function renderKanban(seasonId) {
  const container = document.getElementById('app-container');
  currentSeasonId = seasonId;

  try {
    spinner.show('Loading workbench...');

    // Fetch season and items
    const [season, seasonsResponse, itemsResponse] = await Promise.all([
      getSeason(seasonId),
      getSeasons(),
      getSeasonItems(seasonId)
    ]);

    // Extract arrays from response objects
    const seasons = seasonsResponse.seasons || [];
    currentItems = itemsResponse.items || [];
    
    spinner.hide();

    // Render the kanban board
    container.innerHTML = `
      <div class="workbench-kanban">
        ${renderHeader(season, seasons)}
        ${renderFilters()}
        ${renderKanbanBoard()}
      </div>
    `;

    // Attach event listeners
    attachEventListeners();

  } catch (error) {
    spinner.hide();
    console.error('Error loading kanban:', error);
    toast.error('Failed to load workbench');
    container.innerHTML = `
      <div style="padding: 48px; text-align: center;">
        <p style="color: #ef4444; margin-bottom: 16px;">Failed to load workbench</p>
        <button onclick="location.reload()" class="btn-primary">Retry</button>
      </div>
    `;
  }
}

function renderHeader(season, seasons) {
  const daysLeft = getDaysUntilHalloween();
  
  return `
    <div class="kanban-header">
      <div class="header-top">
        <div class="season-selector">
          <label for="season-select">Season:</label>
          <select id="season-select" class="season-dropdown">
            ${seasons.map(s => `
              <option value="${s.season_id}" ${s.season_id === currentSeasonId ? 'selected' : ''}>
                ${s.season_name}
              </option>
            `).join('')}
          </select>
        </div>
      </div>
      
      <div class="header-actions">
        <button id="create-season-btn" class="btn-secondary">New Season</button>
        <button id="import-items-btn" class="btn-primary">Import Items</button>
      </div>
      
      <div class="header-stats">
        <div class="stat-card">
          <div class="stat-value">${daysLeft}</div>
          <div class="stat-label">Days Until Halloween</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${season.total_items || 0}</div>
          <div class="stat-label">Total Items</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${season.completed_items || 0}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(season.total_estimated_cost || 0)}</div>
          <div class="stat-label">Est. Cost</div>
        </div>
      </div>
    </div>
  `;
}

function renderFilters() {
  const hasActiveFilters = currentFilters.status !== 'all' ||
                          currentFilters.priority !== 'all' ||
                          currentFilters.recordType !== 'all' ||
                          currentFilters.sourceType !== 'all';

  const activeCount = [
    currentFilters.status !== 'all',
    currentFilters.priority !== 'all',
    currentFilters.recordType !== 'all',
    currentFilters.sourceType !== 'all'
  ].filter(Boolean).length;

  return `
    <div class="kanban-filters">
      <button class="filter-toggle-btn${filterPanelOpen ? ' open' : ''}" id="filter-toggle-btn">
        <span class="toggle-label">
          Filters${activeCount > 0 ? `<span class="filter-active-badge">${activeCount}</span>` : ''}
        </span>
        <span class="toggle-arrow">▼</span>
      </button>
      <div class="filter-groups-container${filterPanelOpen ? ' open' : ''}" id="filter-groups-container">
        <div class="filter-group">
          <label>Status:</label>
          <select id="filter-status" class="filter-select">
            <option value="all">All Statuses</option>
            <option value="todo" ${currentFilters.status === 'todo' ? 'selected' : ''}>To Do</option>
            <option value="in_progress" ${currentFilters.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" ${currentFilters.status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Priority:</label>
          <select id="filter-priority" class="filter-select">
            <option value="all">All Priorities</option>
            <option value="high" ${currentFilters.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${currentFilters.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${currentFilters.priority === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Type:</label>
          <select id="filter-record-type" class="filter-select">
            <option value="all">All Types</option>
            <option value="repair" ${currentFilters.recordType === 'repair' ? 'selected' : ''}>Repair</option>
            <option value="maintenance" ${currentFilters.recordType === 'maintenance' ? 'selected' : ''}>Maintenance</option>
            <option value="idea_build" ${currentFilters.recordType === 'idea_build' ? 'selected' : ''}>Build</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Source:</label>
          <select id="filter-source-type" class="filter-select">
            <option value="all">All Sources</option>
            <option value="maintenance" ${currentFilters.sourceType === 'maintenance' ? 'selected' : ''}>Maintenance Table</option>
            <option value="idea" ${currentFilters.sourceType === 'idea' ? 'selected' : ''}>Ideas Table</option>
          </select>
        </div>

        <button id="clear-filters-btn" class="clear-filters-btn" ${!hasActiveFilters ? 'disabled' : ''}>
          Clear Filters
        </button>
      </div>
    </div>
  `;
}

function renderKanbanBoard() {
  const filteredItems = filterItems(currentItems);
  const itemsByStatus = groupBy(filteredItems, 'workbench_status');
  
  return `
    <div class="kanban-board">
      ${renderColumn('todo', 'To Do', itemsByStatus.todo || [])}
      ${renderColumn('in_progress', 'In Progress', itemsByStatus.in_progress || [])}
      ${renderColumn('completed', 'Completed', itemsByStatus.completed || [])}
    </div>
  `;
}

function renderColumn(status, title, items) {
  const sortedItems = sortByPriority(items);
  
  return `
    <div class="kanban-column" data-status="${status}">
      <div class="column-header">
        <div class="column-title-wrapper">
          <button class="collapse-btn" data-status="${status}">
            <span class="collapse-icon">▼</span>
          </button>
          <h3>${title}</h3>
          <span class="item-count">${items.length}</span>
        </div>
      </div>
      <div class="column-content" data-status="${status}">
        ${sortedItems.map(item => renderCard(item)).join('')}
      </div>
    </div>
  `;
}

function renderCard(item) {
console.log('Item data:', item); 
  const priorityColor = getPriorityColor(item.priority);
  
  return `
    <div class="kanban-card" data-item-id="${item.workbench_item_id}">
      <div class="card-header">
        <span class="priority-badge" style="background: ${priorityColor};">
          ${getPriorityLabel(item.priority)}
        </span>
        <span class="record-type-badge">${getRecordTypeLabel(item.record_type)}</span>
      </div>
      
      <h4 class="card-title">${item.title}</h4>
      
<div class="card-meta">
  ${item.source_type === 'maintenance' && item.item_id ? 
    `<span class="meta-item">🔧 Item: ${item.item_id}</span>` : 
    item.source_type === 'idea' && item.source_id ? 
    `<span class="meta-item">💡 Idea: ${item.source_id}</span>` : 
    ''}
</div>
      
      <div class="card-footer">
        <select class="status-dropdown" data-item-id="${item.workbench_item_id}">
          <option value="todo" ${item.workbench_status === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in_progress" ${item.workbench_status === 'in_progress' ? 'selected' : ''}>In Progress</option>
          <option value="completed" ${item.workbench_status === 'completed' ? 'selected' : ''}>Completed</option>
        </select>
        <button class="view-details-btn" data-item-id="${item.workbench_item_id}">View</button>
      </div>
    </div>
  `;
}

function filterItems(items) {
  return items.filter(item => {
    if (currentFilters.status !== 'all' && item.workbench_status !== currentFilters.status) {
      return false;
    }
    if (currentFilters.priority !== 'all' && item.priority !== currentFilters.priority) {
      return false;
    }
    if (currentFilters.recordType !== 'all' && item.record_type !== currentFilters.recordType) {
      return false;
    }
    if (currentFilters.sourceType !== 'all' && item.source_type !== currentFilters.sourceType) {
      return false;
    }
    return true;
  });
}

function attachFilterListeners() {
  document.getElementById('filter-toggle-btn')?.addEventListener('click', () => {
    filterPanelOpen = !filterPanelOpen;
    document.getElementById('filter-toggle-btn')?.classList.toggle('open', filterPanelOpen);
    document.getElementById('filter-groups-container')?.classList.toggle('open', filterPanelOpen);
  });

  document.getElementById('clear-filters-btn')?.addEventListener('click', clearFilters);

  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    refreshKanbanBoard();
  });

  document.getElementById('filter-priority')?.addEventListener('change', (e) => {
    currentFilters.priority = e.target.value;
    refreshKanbanBoard();
  });

  document.getElementById('filter-record-type')?.addEventListener('change', (e) => {
    currentFilters.recordType = e.target.value;
    refreshKanbanBoard();
  });

  document.getElementById('filter-source-type')?.addEventListener('change', (e) => {
    currentFilters.sourceType = e.target.value;
    refreshKanbanBoard();
  });
}

function attachEventListeners() {
  // Season selector
  document.getElementById('season-select')?.addEventListener('change', (e) => {
    navigateTo(`/season/${e.target.value}`);
  });

  // Create season button
  document.getElementById('create-season-btn')?.addEventListener('click', () => {
    navigateTo('/create-season');
  });

  // Import items button
  document.getElementById('import-items-btn')?.addEventListener('click', showImportModal);

  // Filter listeners
  attachFilterListeners();

  // Collapse buttons
  document.querySelectorAll('.collapse-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const status = e.currentTarget.dataset.status;
      const column = document.querySelector(`.kanban-column[data-status="${status}"]`);
      const content = column.querySelector('.column-content');
      const icon = e.currentTarget.querySelector('.collapse-icon');
      
      if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.textContent = '▼';
      } else {
        content.classList.add('collapsed');
        icon.textContent = '▶';
      }
    });
  });

  // Status dropdowns on cards
  document.querySelectorAll('.status-dropdown').forEach(dropdown => {
    dropdown.addEventListener('change', handleStatusChange);
  });

  // View details buttons
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = e.target.dataset.itemId;
      navigateTo(`/season/${currentSeasonId}/item/${itemId}`);
    });
  });
}

function clearFilters() {
  // Reset all filters to 'all'
  currentFilters = {
    status: 'all',
    priority: 'all',
    recordType: 'all',
    sourceType: 'all'
  };
  
  // Re-render the filters section to update selects and button state
  const filtersContainer = document.querySelector('.kanban-filters');
  if (filtersContainer) {
    filtersContainer.outerHTML = renderFilters();
    attachFilterListeners();
  }
  
  // Refresh the kanban board
  refreshKanbanBoard();
  toast.success('Filters cleared');
}

async function handleStatusChange(e) {
  const itemId = e.target.dataset.itemId;
  const newStatus = e.target.value;

  try {
    spinner.show('Updating status...');
    await updateItem(currentSeasonId, itemId, { workbench_status: newStatus });
    
    // Refresh the view
    await renderKanban(currentSeasonId);
    toast.success('Status updated successfully');
  } catch (error) {
    spinner.hide();
    console.error('Error updating status:', error);
    toast.error('Failed to update status');
    // Revert the dropdown
    e.target.value = currentItems.find(i => i.workbench_item_id === itemId)?.workbench_status || 'todo';
  }
}

function showImportModal() {
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = `
    <div class="import-modal-content">
      <h3 style="margin-top: 0;">Import Items</h3>
      <p style="margin-bottom: 24px; color: #64748b;">Select which items to import into this workbench:</p>
      
      <div class="import-options">
        <label class="checkbox-label">
          <input type="checkbox" id="import-maintenance" checked>
          <span>Import Maintenance Items (status = scheduled)</span>
        </label>
        
        <label class="checkbox-label">
          <input type="checkbox" id="import-ideas" checked>
          <span>Import Ideas (status = Planning)</span>
        </label>
      </div>
    </div>
  `;

  const customModal = modal.show({
    title: 'Import Items',
    message: modalContainer.innerHTML,
    confirmText: 'Import',
    cancelText: 'Cancel',
    onConfirm: async () => {
      const importMaintenance = document.getElementById('import-maintenance')?.checked;
      const importIdeas = document.getElementById('import-ideas')?.checked;

      if (!importMaintenance && !importIdeas) {
        toast.warning('Please select at least one source to import from');
        return;
      }

      try {
        spinner.show('Importing items...');
        
        const sourceTypes = [];
        if (importMaintenance) sourceTypes.push('maintenance');
        if (importIdeas) sourceTypes.push('idea');

        await importItems(currentSeasonId, { source_types: sourceTypes });
        
        // Refresh the kanban
        await renderKanban(currentSeasonId);
        toast.success('Items imported successfully');
      } catch (error) {
        spinner.hide();
        console.error('Error importing items:', error);
        toast.error('Failed to import items');
      }
    }
  });
}

function refreshKanbanBoard() {
  const board = document.querySelector('.kanban-board');
  if (board) {
    // Get just the column HTML, not the wrapper
    const filteredItems = filterItems(currentItems);
    const itemsByStatus = groupBy(filteredItems, 'workbench_status');
    
    board.innerHTML = `
      ${renderColumn('todo', 'To Do', itemsByStatus.todo || [])}
      ${renderColumn('in_progress', 'In Progress', itemsByStatus.in_progress || [])}
      ${renderColumn('completed', 'Completed', itemsByStatus.completed || [])}
    `;
    
    // Re-attach ALL event listeners
    document.querySelectorAll('.collapse-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const status = e.currentTarget.dataset.status;
        const column = document.querySelector(`.kanban-column[data-status="${status}"]`);
        const content = column.querySelector('.column-content');
        const icon = e.currentTarget.querySelector('.collapse-icon');
        
        if (content.classList.contains('collapsed')) {
          content.classList.remove('collapsed');
          icon.textContent = '▼';
        } else {
          content.classList.add('collapsed');
          icon.textContent = '▶';
        }
      });
    });
    
    document.querySelectorAll('.status-dropdown').forEach(dropdown => {
      dropdown.addEventListener('change', handleStatusChange);
    });

    document.querySelectorAll('.view-details-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = e.target.dataset.itemId;
        navigateTo(`/season/${currentSeasonId}/item/${itemId}`);
      });
    });
  }
  
  // Also update the filters section to reflect current state
  const filtersContainer = document.querySelector('.kanban-filters');
  if (filtersContainer) {
    filtersContainer.outerHTML = renderFilters();
    attachFilterListeners();
  }
}