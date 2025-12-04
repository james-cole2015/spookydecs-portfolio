// View Modal - Tab-based item detail viewing

function viewItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) {
    console.error('Item not found:', id);
    return;
  }
  
  window.currentViewItem = item;
  
  // Set modal title and ID
  document.getElementById('viewModalTitle').textContent = 'Item Details';
  document.getElementById('viewItemId').textContent = item.id || 'N/A';
  
  // Populate all tabs
  populateDetailsTab(item);
  populateVendorTab(item);
  populateDeploymentsTab(item);
  populateStorageTab(item);
  populatePhotosTab(item);
  populateMiscTab(item);
  
  // Switch to Details tab
  switchViewTab('details');
  
  // Show modal
  document.getElementById('viewModal').style.display = 'flex';
}

function populateDetailsTab(item) {
  const container = document.getElementById('viewDetailsContent');
  const icon = CLASS_TYPE_ICONS[item.class_type] || '📦';
  
  container.innerHTML = `
    <div class="field-row">
      <div class="field-label">Name:</div>
      <div class="field-value">${item.short_name || '-'}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Season:</div>
      <div class="field-value">${item.season || '-'}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Class:</div>
      <div class="field-value">${item.class || '-'}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Class Type:</div>
      <div class="field-value"><span class="type-icon">${icon}</span> ${item.class_type || '-'}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Status:</div>
      <div class="field-value">${item.status || '-'}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Needs Repair:</div>
      <div class="field-value ${item.repair_status?.needs_repair ? 'needs-repair-yes' : ''}">
        ${item.repair_status?.needs_repair ? 'YES' : 'NO'}
      </div>
    </div>
    <div class="field-row">
      <div class="field-label">Item Notes:</div>
      <div class="field-value">${item.general_notes || '-'}</div>
    </div>
  `;
}

function populateVendorTab(item) {
  const container = document.getElementById('viewVendorContent');
  const vm = item.vendor_metadata || {};
  
  container.innerHTML = `
    <div class="field-row">
      <div class="field-label">Cost:</div>
      <div class="field-value">${vm.cost || '-'}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Value:</div>
      <div class="field-value">${vm.value || '-'}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Manufacturer:</div>
      <div class="field-value">${vm.manufacturer || '-'}</div>
    </div>
    <div class="field-row">
      <div class="field-label">Store:</div>
      <div class="field-value">${vm.vendor_store || '-'}</div>
    </div>
  `;
}

function populateDeploymentsTab(item) {
  const container = document.getElementById('viewDeploymentsContent');
  const lastDeployment = item.deployment_data?.last_deployment_id;
  const previousDeployments = item.deployment_data?.previous_deployments || [];
  
  let html = `
    <div class="field-row">
      <div class="field-label">Last Deployment:</div>
      <div class="field-value">${lastDeployment ? lastDeployment.slice(-4) : '-'}</div>
    </div>
  `;
  
  if (previousDeployments.length > 0) {
    html += `
      <div style="margin-top: 20px;">
        <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px;">Previous Deployments</h3>
        <div style="display: flex; flex-direction: column; gap: 8px;">
    `;
    
    previousDeployments.forEach(dep => {
      html += `<div style="padding: 8px 12px; background: #f9fafb; border-radius: 6px; font-size: 13px;">${dep}</div>`;
    });
    
    html += '</div></div>';
  } else {
    html += `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div>No previous deployments recorded</div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function populateStorageTab(item) {
  const container = document.getElementById('viewStorageContent');
  
  container.innerHTML = `
    <div class="field-row">
      <div class="field-label">Storage Location:</div>
      <div class="field-value">${item.packing_data?.tote_location || '-'}</div>
    </div>
  `;
}

function populatePhotosTab(item) {
  const container = document.getElementById('viewPhotosContent');
  
  // Placeholder for future photo support
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📷</div>
      <div>Photo support coming soon</div>
    </div>
  `;
}

function populateMiscTab(item) {
  const container = document.getElementById('viewMiscContent');
  const classType = item.class_type;
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  
  if (attributesToShow.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <div>No additional attributes for this class type</div>
      </div>
    `;
    return;
  }
  
  let html = '';
  
  attributesToShow.forEach(attr => {
    const label = ATTRIBUTE_LABELS[attr] || formatFieldName(attr);
    const value = item[attr] || '-';
    
    html += `
      <div class="field-row">
        <div class="field-label">${label}:</div>
        <div class="field-value">${value}</div>
      </div>
    `;
  });
  
  // Add repair info if applicable
  const hasRepairTracking = HAS_REPAIR_TRACKING.includes(classType);
  if (hasRepairTracking && item.repair_status) {
    html += `
      <div style="margin-top: 24px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 12px;">Repair Information</h3>
        <div class="field-row">
          <div class="field-label">Last Repair Date:</div>
          <div class="field-value">${item.repair_status.last_repair_date || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Repair Notes:</div>
          <div class="field-value">${item.repair_status.repair_notes || '-'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Repair Criticality:</div>
          <div class="field-value">${item.repair_status.last_criticality || '-'}</div>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function switchViewTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('#viewModal .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update tab content
  document.querySelectorAll('#viewModal .tab-content').forEach(content => {
    content.classList.toggle('active', content.dataset.tab === tabName);
  });
}

function editItemFromView() {
  const item = window.currentViewItem;
  if (!item) return;
  
  closeModal('viewModal');
  editItem(item.id);
}