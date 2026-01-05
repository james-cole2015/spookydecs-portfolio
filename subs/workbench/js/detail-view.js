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

// Modal state
let materialsModalState = {
  isOpen: false,
  isEditMode: false,
  editIndex: null
};

// Shopping list state
let shoppingListState = {
  isCollapsed: false
};

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
      ${renderFloatingSaveButton()}
      ${renderMaterialModal()}
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
        <div class="title-with-delete">
          <h1>${currentItem.title}</h1>
          <button id="delete-item-btn" class="delete-btn-header" title="Delete record">×</button>
        </div>
        <div class="item-id-display">ID: ${currentItem.item_id || currentItem.source_id || 'N/A'}</div>
        <div class="detail-badges">
          <span class="badge priority-badge" style="background: ${priorityColor};">
            ${getPriorityLabel(currentItem.priority)}
          </span>
          <span class="badge type-badge">${getRecordTypeLabel(currentItem.record_type)}</span>
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
    </div>
  `;
}

function renderCostsSection() {
  const costs = currentItem.costs || {};
  
  return `
    <div class="detail-section">
      <div class="section-header-with-action">
        <h2>Costs</h2>
        <button class="add-btn" data-section="costs" title="Add cost">+</button>
      </div>
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
  const shoppingList = currentItem.shopping_list || {};
  const shoppingItems = Object.entries(shoppingList);
  const collapseIcon = shoppingListState.isCollapsed ? '▶' : '▼';
  
  return `
    <div class="detail-section">
      <div class="section-header-with-action">
        <h2>Materials</h2>
        <button class="add-btn" id="add-material-btn" title="Add material">+</button>
      </div>
      
      ${materials.length === 0 ? '<p class="empty-state">No materials added</p>' : ''}
      <div class="materials-list">
        ${materials.map((m, idx) => `
          <div class="material-item">
            <div class="material-info">
              <strong>${m.name}</strong>
              <span>${m.quantity} ${m.unit}${m.cost ? ` @ ${formatCurrency(m.cost)}` : ''}</span>
              ${m.vendor ? `<span class="material-vendor">Vendor: ${m.vendor}</span>` : ''}
              ${m.brand ? `<span class="material-brand">Brand: ${m.brand}</span>` : ''}
              ${m.notes ? `<p class="material-notes">${m.notes}</p>` : ''}
            </div>
            <div class="material-actions">
              <button class="edit-material-btn" data-index="${idx}" title="Edit material">Edit</button>
              <button class="remove-material-btn" data-index="${idx}" title="Remove material">×</button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <!-- Shopping List Subsection -->
      <div class="shopping-list-subsection">
        <div class="shopping-header" id="shopping-header">
          <h3>Shopping List (${shoppingItems.length} ${shoppingItems.length === 1 ? 'item' : 'items'})</h3>
          <button class="collapse-btn" id="collapse-shopping-btn">${collapseIcon}</button>
        </div>
        
        <div class="shopping-content" style="display: ${shoppingListState.isCollapsed ? 'none' : 'block'}">
          ${shoppingItems.length > 0 ? `
            <ul class="shopping-list">
              ${shoppingItems.map(([name, notes]) => `
                <li class="shopping-item">
                  <span class="shopping-item-text">
                    <strong>${name}</strong>${notes ? ` - ${notes}` : ''}
                  </span>
                  <div class="shopping-item-actions">
                    <button class="convert-shopping-btn" data-name="${escapeHtml(name)}" data-notes="${escapeHtml(notes)}" title="Convert to material">Convert</button>
                    <button class="remove-shopping-btn" data-name="${escapeHtml(name)}" title="Remove">×</button>
                  </div>
                </li>
              `).join('')}
            </ul>
          ` : '<p class="empty-state-small">No items in shopping list</p>'}
          
          <div class="shopping-add-inline">
            <input type="text" id="shopping-item-name" class="shopping-input" placeholder="Item name" />
            <input type="text" id="shopping-item-notes" class="shopping-input" placeholder="Notes (optional)" />
            <button id="add-shopping-btn" class="btn-secondary">Add</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helper function to escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function renderPhotosSection() {
  const photos = currentItem.photos || {};
  
  return `
    <div class="detail-section">
      <div class="section-header-with-action">
        <h2>Photos</h2>
        <button class="add-btn" data-section="photos" title="Add photo">+</button>
      </div>
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
  const notes = Array.isArray(currentItem.work_notes) ? currentItem.work_notes : [];
  
  // Sort notes by date (oldest first)
  const sortedNotes = [...notes].sort((a, b) => 
    new Date(a.created_at) - new Date(b.created_at)
  );
  
  return `
    <div class="detail-section">
      <h2>Work Notes</h2>
      ${sortedNotes.length > 0 ? `
        <ul class="notes-list">
          ${sortedNotes.map(note => {
            const date = new Date(note.created_at);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
            return `
              <li class="note-item">
                <span class="note-date">${formattedDate}:</span>
                <span class="note-text">${note.text}</span>
              </li>
            `;
          }).join('')}
        </ul>
      ` : '<p class="empty-state">No notes yet</p>'}
      
      <div class="note-input-container">
        <input 
          type="text" 
          id="new-note-input" 
          class="note-input-inline" 
          placeholder="Add a new note..."
        />
        <button id="add-note-btn" class="btn-secondary">Add Note</button>
      </div>
    </div>
  `;
}

function renderFloatingSaveButton() {
  return `
    <button id="floating-save-btn" class="floating-save-btn">
      <span class="save-icon">💾</span>
      <span>Save Changes</span>
    </button>
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
    </div>
  `;
}

function renderMaterialModal() {
  if (!materialsModalState.isOpen) return '';
  
  const material = materialsModalState.isEditMode 
    ? currentItem.materials[materialsModalState.editIndex] 
    : {};
  
  const title = materialsModalState.isEditMode ? 'Edit Material' : 'Add Material';
  
  return `
    <div class="modal-backdrop" id="material-modal-backdrop">
      <div class="modal-container">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="modal-close" id="close-material-modal">×</button>
        </div>
        
        <div class="modal-body">
          <form id="material-form">
            <div class="form-field">
              <label>Name <span class="required">*</span></label>
              <input type="text" id="material-name" class="form-input" value="${material.name || ''}" required />
            </div>
            
            <div class="form-row">
              <div class="form-field">
                <label>Quantity <span class="required">*</span></label>
                <input type="number" id="material-quantity" class="form-input" value="${material.quantity || ''}" step="0.01" min="0" required />
              </div>
              <div class="form-field">
                <label>Unit <span class="required">*</span></label>
                <select id="material-unit" class="form-input" required>
                  <option value="">Select...</option>
                  <option value="each" ${material.unit === 'each' ? 'selected' : ''}>Each</option>
                  <option value="ft" ${material.unit === 'ft' ? 'selected' : ''}>Feet</option>
                  <option value="yd" ${material.unit === 'yd' ? 'selected' : ''}>Yards</option>
                  <option value="lb" ${material.unit === 'lb' ? 'selected' : ''}>Pounds</option>
                  <option value="gal" ${material.unit === 'gal' ? 'selected' : ''}>Gallons</option>
                  <option value="box" ${material.unit === 'box' ? 'selected' : ''}>Box</option>
                  <option value="sheet" ${material.unit === 'sheet' ? 'selected' : ''}>Sheet</option>
                  <option value="roll" ${material.unit === 'roll' ? 'selected' : ''}>Roll</option>
                  <option value="bag" ${material.unit === 'bag' ? 'selected' : ''}>Bag</option>
                  <option value="other" ${material.unit === 'other' ? 'selected' : ''}>Other</option>
                </select>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-field">
                <label>Cost ($)</label>
                <input type="number" id="material-cost" class="form-input" value="${material.cost || ''}" step="0.01" min="0" />
              </div>
              <div class="form-field">
                <label>Brand</label>
                <input type="text" id="material-brand" class="form-input" value="${material.brand || ''}" />
              </div>
            </div>
            
            <div class="form-field">
              <label>Vendor</label>
              <input type="text" id="material-vendor" class="form-input" value="${material.vendor || ''}" />
            </div>
            
            <div class="form-field">
              <label>Notes</label>
              <textarea id="material-notes" class="form-textarea" rows="3">${material.notes || ''}</textarea>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <button class="btn-secondary" id="cancel-material-modal">Cancel</button>
          <button class="btn-primary" id="save-material-btn">Save Material</button>
        </div>
      </div>
    </div>
  `;
}

function attachEventListeners() {
  document.getElementById('back-btn')?.addEventListener('click', () => {
    navigateTo(`/season/${currentSeasonId}`);
  });

  document.getElementById('floating-save-btn')?.addEventListener('click', saveChanges);
  document.getElementById('add-note-btn')?.addEventListener('click', addNote);
  document.getElementById('sync-back-btn')?.addEventListener('click', handleSyncBack);
  document.getElementById('delete-item-btn')?.addEventListener('click', handleDelete);
  
  // Material modal handlers
  document.getElementById('add-material-btn')?.addEventListener('click', openAddMaterialModal);
  document.getElementById('close-material-modal')?.addEventListener('click', closeMaterialModal);
  document.getElementById('cancel-material-modal')?.addEventListener('click', closeMaterialModal);
  document.getElementById('save-material-btn')?.addEventListener('click', saveMaterial);
  document.getElementById('material-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'material-modal-backdrop') closeMaterialModal();
  });
  
  // Material edit/remove handlers
  document.querySelectorAll('.edit-material-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      openEditMaterialModal(index);
    });
  });
  
  document.querySelectorAll('.remove-material-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeMaterial(index);
    });
  });
  
  // Shopping list handlers
  document.getElementById('collapse-shopping-btn')?.addEventListener('click', toggleShoppingList);
  document.getElementById('add-shopping-btn')?.addEventListener('click', addShoppingListItem);
  
  // Shopping list remove handlers
  document.querySelectorAll('.remove-shopping-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.target.dataset.name;
      removeShoppingListItem(name);
    });
  });
  
  // Shopping list convert handlers
  document.querySelectorAll('.convert-shopping-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = e.target.dataset.name;
      const notes = e.target.dataset.notes;
      convertShoppingItemToMaterial(name, notes);
    });
  });
  
  // Shopping list Enter key support
  document.getElementById('shopping-item-name')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addShoppingListItem();
  });
  document.getElementById('shopping-item-notes')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addShoppingListItem();
  });
  
  // Add button placeholders for costs and photos
  document.querySelectorAll('.add-btn').forEach(btn => {
    const section = btn.dataset.section;
    if (section) {
      btn.addEventListener('click', (e) => {
        toast.info(`Add ${section} feature coming soon`);
      });
    }
  });
  
  // Allow Enter key to add note
  document.getElementById('new-note-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addNote();
    }
  });
}

async function saveChanges() {
  try {
    spinner.show('Saving changes...');

    const updates = {
      workbench_status: document.getElementById('status-select').value,
      priority: document.getElementById('priority-select').value,
      description: document.getElementById('description-input').value,
      estimated_completion_date: document.getElementById('est-completion-input').value || null,
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

async function addNote() {
  const noteInput = document.getElementById('new-note-input');
  const noteText = noteInput?.value?.trim();
  
  if (!noteText) {
    toast.error('Please enter a note');
    return;
  }
  
  try {
    spinner.show('Adding note...');
    
    // Send note as string - Lambda will handle converting to array format
    await updateItem(currentSeasonId, currentItemId, {
      work_notes: noteText
    });
    
    // Clear input and refresh view
    noteInput.value = '';
    await renderDetail(currentSeasonId, currentItemId);
    toast.success('Note added successfully');
  } catch (error) {
    spinner.hide();
    console.error('Error adding note:', error);
    toast.error('Failed to add note');
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

// ==================== MATERIAL MODAL FUNCTIONS ====================

function openAddMaterialModal() {
  materialsModalState = {
    isOpen: true,
    isEditMode: false,
    editIndex: null
  };
  renderDetail(currentSeasonId, currentItemId);
}

function openEditMaterialModal(index) {
  materialsModalState = {
    isOpen: true,
    isEditMode: true,
    editIndex: index
  };
  renderDetail(currentSeasonId, currentItemId);
}

function closeMaterialModal() {
  materialsModalState = {
    isOpen: false,
    isEditMode: false,
    editIndex: null
  };
  renderDetail(currentSeasonId, currentItemId);
}

async function saveMaterial() {
  try {
    // Get form values
    const name = document.getElementById('material-name')?.value?.trim();
    const quantity = document.getElementById('material-quantity')?.value?.trim();
    const unit = document.getElementById('material-unit')?.value;
    const cost = document.getElementById('material-cost')?.value?.trim();
    const brand = document.getElementById('material-brand')?.value?.trim();
    const vendor = document.getElementById('material-vendor')?.value?.trim();
    const notes = document.getElementById('material-notes')?.value?.trim();
    
    // Validate required fields
    if (!name || !quantity || !unit) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Build material object
    const material = {
      name,
      quantity,
      unit,
      cost: cost ? parseFloat(cost) : null,
      brand: brand || null,
      vendor: vendor || null,
      notes: notes || null,
      in_inventory: true
    };
    
    spinner.show('Saving material...');
    
    let updatedMaterials;
    if (materialsModalState.isEditMode) {
      // Edit existing material
      updatedMaterials = [...currentItem.materials];
      updatedMaterials[materialsModalState.editIndex] = material;
    } else {
      // Add new material
      updatedMaterials = [...currentItem.materials, material];
    }
    
    await updateItem(currentSeasonId, currentItemId, {
      materials: updatedMaterials
    });
    
    // Close modal and refresh
    closeMaterialModal();
    toast.success('Material saved successfully');
    
  } catch (error) {
    spinner.hide();
    console.error('Error saving material:', error);
    toast.error('Failed to save material');
  }
}

async function removeMaterial(index) {
  try {
    spinner.show('Removing material...');
    
    const updatedMaterials = currentItem.materials.filter((_, i) => i !== index);
    
    await updateItem(currentSeasonId, currentItemId, {
      materials: updatedMaterials
    });
    
    await renderDetail(currentSeasonId, currentItemId);
    toast.success('Material removed successfully');
    
  } catch (error) {
    spinner.hide();
    console.error('Error removing material:', error);
    toast.error('Failed to remove material');
  }
}

// ==================== SHOPPING LIST FUNCTIONS ====================

function toggleShoppingList() {
  shoppingListState.isCollapsed = !shoppingListState.isCollapsed;
  renderDetail(currentSeasonId, currentItemId);
}

async function addShoppingListItem() {
  const nameInput = document.getElementById('shopping-item-name');
  const notesInput = document.getElementById('shopping-item-notes');
  
  const name = nameInput?.value?.trim();
  const notes = notesInput?.value?.trim() || '';
  
  if (!name) {
    toast.error('Please enter an item name');
    return;
  }
  
  try {
    spinner.show('Adding item...');
    
    const updatedShoppingList = {
      ...currentItem.shopping_list,
      [name]: notes
    };
    
    await updateItem(currentSeasonId, currentItemId, {
      shopping_list: updatedShoppingList
    });
    
    await renderDetail(currentSeasonId, currentItemId);
    toast.success('Item added to shopping list');
    
  } catch (error) {
    spinner.hide();
    console.error('Error adding shopping item:', error);
    toast.error('Failed to add item');
  }
}

async function removeShoppingListItem(itemName) {
  try {
    spinner.show('Removing item...');
    
    const updatedShoppingList = {...currentItem.shopping_list};
    delete updatedShoppingList[itemName];
    
    await updateItem(currentSeasonId, currentItemId, {
      shopping_list: updatedShoppingList
    });
    
    await renderDetail(currentSeasonId, currentItemId);
    toast.success('Item removed from shopping list');
    
  } catch (error) {
    spinner.hide();
    console.error('Error removing shopping item:', error);
    toast.error('Failed to remove item');
  }
}

async function convertShoppingItemToMaterial(itemName, itemNotes) {
  // Remove from shopping list
  const updatedShoppingList = {...currentItem.shopping_list};
  delete updatedShoppingList[itemName];
  
  // Update shopping list first
  try {
    await updateItem(currentSeasonId, currentItemId, {
      shopping_list: updatedShoppingList
    });
    
    // Refresh to get updated item
    currentItem = await getItem(currentSeasonId, currentItemId);
    
    // Open modal with pre-filled name
    materialsModalState = {
      isOpen: true,
      isEditMode: false,
      editIndex: null
    };
    
    await renderDetail(currentSeasonId, currentItemId);
    
    // Pre-fill the name field
    setTimeout(() => {
      const nameField = document.getElementById('material-name');
      if (nameField) {
        nameField.value = itemName;
        // Also pre-fill notes if they exist
        if (itemNotes) {
          const notesField = document.getElementById('material-notes');
          if (notesField) notesField.value = itemNotes;
        }
      }
    }, 100);
    
    toast.info('Item removed from shopping list. Fill in material details.');
    
  } catch (error) {
    console.error('Error converting shopping item:', error);
    toast.error('Failed to convert item');
  }
}