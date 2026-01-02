// Workbench Item Detail View

import { getItem, updateItem, syncItemBack, deleteItem } from './api.js';
import { 
  formatDate, 
  formatCurrency, 
  getPriorityColor, 
  getPriorityLabel,
  getStatusLabel,
  getRecordTypeLabel,
  getSourceTypeLabel 
} from './utils.js';
import { navigateTo, goBack } from './router.js';
import { toast } from './toast.js';
import { modal } from './modal.js';
import { spinner } from './spinner.js';

let currentSeasonId = null;
let currentItemId = null;
let currentItem = null;

export async function renderDetail(seasonId, itemId) {
  const container = document.getElementById('app-container');
  currentSeasonId = seasonId;
  currentItemId = itemId;

  try {
    spinner.show('Loading item...');
    currentItem = await getItem(seasonId, itemId);
    spinner.hide();

    container.innerHTML = `
      <div class="detail-view">
        ${renderHeader()}
        ${renderMainInfo()}
        ${renderCostsSection()}
        ${renderMaterialsSection()}
        ${renderPhotosSection()}
        ${renderWorkNotes()}
        ${renderActions()}
      </div>
    `;

    attachEventListeners();

  } catch (error) {
    spinner.hide();
    console.error('Error loading item:', error);
    toast.error('Failed to load item details');
    container.innerHTML = `
      <div style="padding: 48px; text-align: center;">
        <p style="color: #ef4444; margin-bottom: 16px;">Failed to load item</p>
        <button onclick="history.back()" class="btn-primary">Go Back</button>
      </div>
    `;
  }
}

function renderHeader() {
  const priorityColor = getPriorityColor(currentItem.priority);
  
  return `
    <div class="detail-header">
      <button id="back-btn" class="back-btn">← Back to Workbench</button>
      
      <div class="detail-title-section">
        <h1>${currentItem.title}</h1>
        <div class="detail-badges">
          <span class="badge priority-badge" style="background: ${priorityColor};">
            ${getPriorityLabel(currentItem.priority)}
          </span>
          <span class="badge type-badge">${getRecordTypeLabel(currentItem.record_type)}</span>
          <span class="badge source-badge">From: ${getSourceTypeLabel(currentItem.source_type)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderMainInfo() {
  return `
    <div class="detail-section">
      <h2>Details</h2>
      <div class="detail-grid">
        <div class="detail-field">
          <label>Status</label>
          <select id="status-select" class="detail-input">
            <option value="todo" ${currentItem.workbench_status === 'todo' ? 'selected' : ''}>To Do</option>
            <option value="in_progress" ${currentItem.workbench_status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" ${currentItem.workbench_status === 'completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
        
        <div class="detail-field">
          <label>Priority</label>
          <select id="priority-select" class="detail-input">
            <option value="high" ${currentItem.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${currentItem.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${currentItem.priority === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
        
        <div class="detail-field full-width">
          <label>Description</label>
          <textarea id="description-input" class="detail-textarea" rows="4">${currentItem.description || ''}</textarea>
        </div>
        
        <div class="detail-field">
          <label>Estimated Completion</label>
          <input type="date" id="est-completion-input" class="detail-input" 
                 value="${currentItem.estimated_completion_date?.split('T')[0] || ''}">
        </div>
        
        <div class="detail-field">
          <label>Actual Completion</label>
          <div class="readonly-field">${formatDate(currentItem.actual_completion_date)}</div>
        </div>
      </div>
      
      <button id="save-changes-btn" class="btn-primary" style="margin-top: 16px;">Save Changes</button>
    </div>
  `;
}

function renderCostsSection() {
  const costs = currentItem.costs || {};
  
  return `
    <div class="detail-section">
      <h2>Costs</h2>
      <div class="cost-grid">
        <div class="cost-item">
          <label>Estimated Cost</label>
          <input type="number" id="estimated-cost-input" class="detail-input" 
                 value="${costs.estimated_cost || 0}" step="0.01" min="0">
        </div>
        <div class="cost-item">
          <label>Actual Cost</label>
          <div class="readonly-field">${formatCurrency(costs.actual_cost)}</div>
        </div>
        <div class="cost-item">
          <label>Cost Records</label>
          <div class="readonly-field">${costs.cost_record_ids?.length || 0} linked</div>
        </div>
      </div>
    </div>
  `;
}

function renderMaterialsSection() {
  const materials = currentItem.materials || [];
  
  return `
    <div class="detail-section">
      <h2>Materials</h2>
      ${materials.length === 0 ? '<p class="empty-state">No materials listed</p>' : ''}
      <div class="materials-list">
        ${materials.map((m, idx) => `
          <div class="material-item">
            <div class="material-info">
              <strong>${m.name}</strong>
              <span>${m.quantity} ${m.unit} @ ${formatCurrency(m.cost || 0)}</span>
              ${m.vendor ? `<span class="material-vendor">Vendor: ${m.vendor}</span>` : ''}
              ${m.notes ? `<p class="material-notes">${m.notes}</p>` : ''}
            </div>
            <div class="material-status">
              ${m.in_inventory ? 
                '<span class="inventory-badge in-stock">In Stock</span>' : 
                '<span class="inventory-badge need-to-buy">Need to Buy</span>'
              }
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderPhotosSection() {
  const photos = currentItem.photos || {};
  
  return `
    <div class="detail-section">
      <h2>Photos</h2>
      <div class="photos-grid">
        ${renderPhotoCategory('Reference', photos.reference || [])}
        ${renderPhotoCategory('Before', photos.before || [])}
        ${renderPhotoCategory('During', photos.during || [])}
        ${renderPhotoCategory('After', photos.after || [])}
        ${renderPhotoCategory('Documentation', photos.documentation || [])}
      </div>
    </div>
  `;
}

function renderPhotoCategory(label, photoIds) {
  if (photoIds.length === 0) return '';
  
  return `
    <div class="photo-category">
      <h4>${label}</h4>
      <div class="photo-thumbnails">
        ${photoIds.map(id => `
          <div class="photo-thumb" data-photo-id="${id}">
            <div class="photo-placeholder">📷</div>
            <span class="photo-id">${id}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderWorkNotes() {
  return `
    <div class="detail-section">
      <h2>Work Notes</h2>
      <textarea id="work-notes-input" class="detail-textarea" rows="6" 
                placeholder="Add notes about the work performed...">${currentItem.work_notes || ''}</textarea>
    </div>
  `;
}

function renderActions() {
  const isCompleted = currentItem.workbench_status === 'completed';
  const canSyncBack = isCompleted && !currentItem.synced_back;
  
  return `
    <div class="detail-actions">
      ${canSyncBack ? `
        <button id="sync-back-btn" class="btn-primary">
          Sync Back to ${getSourceTypeLabel(currentItem.source_type)} Table
        </button>
      ` : ''}
      ${currentItem.synced_back ? `
        <div class="synced-indicator">
          ✓ Synced back on ${formatDate(currentItem.synced_back_at)}
        </div>
      ` : ''}
      <button id="delete-item-btn" class="btn-danger">Delete Item</button>
    </div>
  `;
}

function attachEventListeners() {
  document.getElementById('back-btn')?.addEventListener('click', () => {
    navigateTo(`/season/${currentSeasonId}`);
  });

  document.getElementById('save-changes-btn')?.addEventListener('click', saveChanges);
  document.getElementById('sync-back-btn')?.addEventListener('click', handleSyncBack);
  document.getElementById('delete-item-btn')?.addEventListener('click', handleDelete);
}

async function saveChanges() {
  try {
    spinner.show('Saving changes...');

    const updates = {
      workbench_status: document.getElementById('status-select').value,
      priority: document.getElementById('priority-select').value,
      description: document.getElementById('description-input').value,
      estimated_completion_date: document.getElementById('est-completion-input').value || null,
      work_notes: document.getElementById('work-notes-input').value,
      costs: {
        ...currentItem.costs,
        estimated_cost: parseFloat(document.getElementById('estimated-cost-input').value) || 0
      }
    };

    await updateItem(currentSeasonId, currentItemId, updates);
    
    // Refresh the view
    await renderDetail(currentSeasonId, currentItemId);
    toast.success('Changes saved successfully');
  } catch (error) {
    spinner.hide();
    console.error('Error saving changes:', error);
    toast.error('Failed to save changes');
  }
}

async function handleSyncBack() {
  const confirmed = await modal.confirm({
    title: 'Sync Back to Source',
    message: `This will update the original ${getSourceTypeLabel(currentItem.source_type)} record with the completed work. Continue?`,
    confirmText: 'Sync',
    type: 'warning'
  });

  if (!confirmed) return;

  try {
    spinner.show('Syncing back...');
    await syncItemBack(currentSeasonId, currentItemId);
    await renderDetail(currentSeasonId, currentItemId);
    toast.success('Successfully synced back to source table');
  } catch (error) {
    spinner.hide();
    console.error('Error syncing back:', error);
    toast.error('Failed to sync back');
  }
}

async function handleDelete() {
  const confirmed = await modal.confirm({
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item from the workbench? This cannot be undone.',
    confirmText: 'Delete',
    type: 'danger'
  });

  if (!confirmed) return;

  try {
    spinner.show('Deleting item...');
    await deleteItem(currentSeasonId, currentItemId);
    toast.success('Item deleted successfully');
    navigateTo(`/season/${currentSeasonId}`);
  } catch (error) {
    spinner.hide();
    console.error('Error deleting item:', error);
    toast.error('Failed to delete item');
  }
}
