// delete-handler.js

let selectedItemsForDeletion = new Set();

/**
 * Opens the delete modal and populates it with all items
 */
function openDeleteModal() {
  const modal = document.getElementById('deleteModal');
  const modalContent = modal.querySelector('.panel');
  
  // Clear previous selections
  selectedItemsForDeletion.clear();
  
  // Build the modal content
  modalContent.innerHTML = `
    <div class="modal-header">
      <h2>Delete Items</h2>
      <button onclick="closeModal('deleteModal')" style="background:transparent;border:none;font-size:20px;cursor:pointer;">&times;</button>
    </div>
    
    <div style="margin-bottom: 16px;">
      <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
        Select items to delete. This action cannot be undone.
      </p>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button class="btn-secondary" onclick="selectAllItems()" style="font-size: 13px;">Select All</button>
        <button class="btn-secondary" onclick="deselectAllItems()" style="font-size: 13px;">Deselect All</button>
        <span id="selectedCount" style="margin-left: auto; font-size: 13px; color: #6b7280;">0 selected</span>
      </div>
    </div>
    
    <div style="max-height: 400px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: white;">
      <table style="width: 100%;">
        <thead style="position: sticky; top: 0; background: #fafafa; z-index: 1;">
          <tr>
            <th style="width: 40px; padding: 12px 8px;">
              <input type="checkbox" id="selectAllCheckbox" onchange="toggleSelectAll(this)" 
                style="cursor: pointer; width: 16px; height: 16px;">
            </th>
            <th style="padding: 12px 8px; text-align: left; font-size: 13px;">Item Name</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 13px;">ID</th>
            <th style="padding: 12px 8px; text-align: left; font-size: 13px;">Season</th>
          </tr>
        </thead>
        <tbody id="deleteTableBody">
          <tr>
            <td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af;">
              Loading items...
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeModal('deleteModal')">Cancel</button>
      <button class="btn-danger" id="confirmDeleteBtn" onclick="confirmDelete()" disabled>
        Delete Selected (<span id="deleteCount">0</span>)
      </button>
    </div>
  `;
  
  modal.style.display = 'flex';
  
  // Load items into the table
  populateDeleteTable();
}

/**
 * Populates the delete modal table with items
 */
async function populateDeleteTable() {
  const tbody = document.getElementById('deleteTableBody');
  
  try {
    const items = await apiService.getItems();
    
    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="padding: 20px; text-align: center; color: #9ca3af;">
            No items available
          </td>
        </tr>
      `;
      return;
    }
    
    // Sort items by name for easier scanning
    items.sort((a, b) => (a.short_name || '').localeCompare(b.short_name || ''));
    
    tbody.innerHTML = items.map(item => `
      <tr style="border-bottom: 1px solid #f3f4f6;" data-item-id="${item.item_id}">
        <td style="padding: 10px 8px;">
          <input type="checkbox" 
            class="delete-item-checkbox" 
            value="${item.item_id}"
            onchange="toggleItemSelection('${item.item_id}')"
            style="cursor: pointer; width: 16px; height: 16px;">
        </td>
        <td style="padding: 10px 8px; font-size: 14px; color: #1f2937; font-weight: 500;">
          ${item.short_name || 'Unnamed Item'}
        </td>
        <td style="padding: 10px 8px; font-size: 13px; color: #6b7280; font-family: monospace;">
          ${item.item_id}
        </td>
        <td style="padding: 10px 8px;">
          <span class="badge ${(item.season || '').toLowerCase()}" style="font-size: 11px;">
            ${item.season || 'N/A'}
          </span>
        </td>
      </tr>
    `).join('');
    
  } catch (error) {
    console.error('Error loading items for deletion:', error);
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="padding: 20px; text-align: center; color: #ef4444;">
          Error loading items. Please try again.
        </td>
      </tr>
    `;
  }
}

/**
 * Toggles selection of a single item
 */
function toggleItemSelection(itemId) {
  if (selectedItemsForDeletion.has(itemId)) {
    selectedItemsForDeletion.delete(itemId);
  } else {
    selectedItemsForDeletion.add(itemId);
  }
  updateDeleteUI();
}

/**
 * Toggles all items selection
 */
function toggleSelectAll(checkbox) {
  const checkboxes = document.querySelectorAll('.delete-item-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = checkbox.checked;
    const itemId = cb.value;
    if (checkbox.checked) {
      selectedItemsForDeletion.add(itemId);
    } else {
      selectedItemsForDeletion.delete(itemId);
    }
  });
  updateDeleteUI();
}

/**
 * Select all items
 */
function selectAllItems() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = true;
    toggleSelectAll(selectAllCheckbox);
  }
}

/**
 * Deselect all items
 */
function deselectAllItems() {
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = false;
    toggleSelectAll(selectAllCheckbox);
  }
}

/**
 * Updates the delete UI (button state, counters)
 */
function updateDeleteUI() {
  const count = selectedItemsForDeletion.size;
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const deleteCountSpan = document.getElementById('deleteCount');
  const selectedCountSpan = document.getElementById('selectedCount');
  
  if (deleteCountSpan) deleteCountSpan.textContent = count;
  if (selectedCountSpan) selectedCountSpan.textContent = `${count} selected`;
  
  if (confirmBtn) {
    confirmBtn.disabled = count === 0;
  }
  
  // Update "select all" checkbox state
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  const checkboxes = document.querySelectorAll('.delete-item-checkbox');
  if (selectAllCheckbox && checkboxes.length > 0) {
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);
    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = someChecked && !allChecked;
  }
}

/**
 * Confirms and executes the deletion
 */
async function confirmDelete() {
  const count = selectedItemsForDeletion.size;
  
  if (count === 0) {
    showToast('No items selected', 'Please select at least one item to delete', 'error');
    return;
  }
  
  // Final confirmation
  const confirmMessage = count === 1 
    ? 'Are you sure you want to delete this item? This cannot be undone.'
    : `Are you sure you want to delete ${count} items? This cannot be undone.`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  // Disable button and show loading state
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const originalText = confirmBtn.innerHTML;
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = 'Deleting...';
  
  try {
    let successCount = 0;
    let failCount = 0;
    const itemIds = Array.from(selectedItemsForDeletion);
    
    // Delete items one by one
    for (const itemId of itemIds) {
      try {
        await deleteItem(itemId);
        successCount++;
      } catch (error) {
        console.error(`Failed to delete item ${itemId}:`, error);
        failCount++;
      }
    }
    
    // Close modal
    closeModal('deleteModal');
    
    // Show result
    if (failCount === 0) {
      showToast(
        'Items Deleted', 
        `Successfully deleted ${successCount} item${successCount !== 1 ? 's' : ''}`, 
        'success'
      );
    } else {
      showToast(
        'Partial Success', 
        `Deleted ${successCount} item${successCount !== 1 ? 's' : ''}, ${failCount} failed`, 
        'error'
      );
    }
    
    // Refresh the main table and stats
    await loadItems();
    
  } catch (error) {
    console.error('Error during deletion:', error);
    showToast('Delete Failed', 'An error occurred during deletion', 'error');
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = originalText;
  }
}

/**
 * Shows a toast notification
 */
function showToast(title, message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✓' : '✕';
  
  toast.innerHTML = `
    <div class="toast-icon">${icon}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}