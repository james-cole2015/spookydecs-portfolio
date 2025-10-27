// Global variables
let config = {};
let allItems = [];

// Icon mapping for class types
const CLASS_TYPE_ICONS = {
  'Cord': '🔌',
  'Inflatable': '🎈',
  'Plug': '⚡',
  'Static Prop': '🎃',
  'Animatronic': '🤖',
  'Light': '💡',
  'String Light': '💡',
  'Spot Light': '💡',
  'Adapter': '🔧'
};

// Define which attributes to show for each class_type
const CLASS_TYPE_ATTRIBUTES = {
  'Static Prop': ['stakes', 'tethers', 'height_length', 'date_acquired'],
  'Inflatable': ['stakes', 'tethers', 'height_length', 'date_acquired', 'adapter'],
  'Animatronic': ['stakes', 'tethers', 'height_length', 'date_acquired', 'adapter'],
  'String Light': ['color', 'length', 'bulb_type', 'notes'],
  'Spot Light': ['color', 'bulb_type', 'notes'],
  'Plug': ['length', 'male_ends', 'female_ends'],
  'Cord': ['length', 'male_ends', 'female_ends'],
  'Adapter': []
};

// Define which class_types have repair tracking
const HAS_REPAIR_TRACKING = ['Static Prop', 'Inflatable', 'Animatronic', 'String Light', 'Spot Light'];

// Attribute display names
const ATTRIBUTE_LABELS = {
  'stakes': '# of Stakes',
  'tethers': '# of Tethers',
  'height_length': 'Item Height / Length',
  'date_acquired': 'Date Acquired',
  'adapter': 'Adapter',
  'color': 'Color',
  'length': 'Length',
  'bulb_type': 'Bulb Type',
  'notes': 'Notes',
  'male_ends': 'Male Ends',
  'female_ends': 'Female Ends'
};

// Load configuration
async function loadConfig() {
  try {
    const response = await fetch('config.json');
    config = await response.json();
    
    // Set admin link
    if (config.ADMIN_URL) {
      document.getElementById('adminLink').href = config.ADMIN_URL;
    }
    
    // Load items after config is loaded
    await loadItems();
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

// Load items from API
async function loadItems() {
  try {
    const apiUrl = config.API_ENDPOINT || '';
    if (!apiUrl) {
      console.error('API_ENDPOINT not found in config');
      return;
    }
    
    const response = await fetch(`${apiUrl}/items`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    allItems = data.items || [];
    
    // Filter out Storage and Deployment items
    allItems = allItems.filter(item => 
      item.class !== 'Storage' && item.class !== 'Deployment'
    );
    
    updateStats();
    renderItems();
  } catch (error) {
    console.error('Failed to load items:', error);
  }
}

// Update statistics cards
function updateStats() {
  // Season stats
  const halloween = allItems.filter(i => i.season === 'Halloween').length;
  const christmas = allItems.filter(i => i.season === 'Christmas').length;
  const shared = allItems.filter(i => i.season === 'Shared').length;
  
  const halloweenEl = document.getElementById('stat-halloween');
  const christmasEl = document.getElementById('stat-christmas');
  const sharedEl = document.getElementById('stat-shared');
  
  if (halloweenEl) halloweenEl.textContent = halloween;
  if (christmasEl) christmasEl.textContent = christmas;
  if (sharedEl) sharedEl.textContent = shared;
  
  // Class stats
  const accessoryEl = document.getElementById('stat-accessory');
  const decorationEl = document.getElementById('stat-decoration');
  const lightClassEl = document.getElementById('stat-light-class');
  
  if (accessoryEl) accessoryEl.textContent = allItems.filter(i => i.class === 'Accessory').length;
  if (decorationEl) decorationEl.textContent = allItems.filter(i => i.class === 'Decoration').length;
  if (lightClassEl) lightClassEl.textContent = allItems.filter(i => i.class === 'Light').length;
}

// Render items in table and cards
function renderItems() {
  const tableBody = document.getElementById('tableBody');
  const itemCards = document.getElementById('itemCards');
  
  tableBody.innerHTML = '';
  itemCards.innerHTML = '';
  
  allItems.forEach(item => {
    // Render table row
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="badge ${item.status === 'Active' ? 'active' : 'inactive'}">${item.status || 'Unknown'}</span></td>
      <td>${item.short_name || 'N/A'}</td>
      <td><span class="badge ${(item.season || '').toLowerCase()}">${item.season || 'N/A'}</span></td>
      <td>${item.class_type || 'N/A'}</td>
      <td><span class="badge ${item.repair_status?.needs_repair ? 'needs-repair' : 'ok'}">${item.repair_status?.needs_repair ? 'Needs Repair' : 'OK'}</span></td>
      <td>${item.packing_data?.tote_location || 'N/A'}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-small btn-primary" onclick="viewItem('${item.id}')">View</button>
          <button class="btn-small btn-secondary" onclick="editItem('${item.id}')">Edit</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
    
    // Render mobile card
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <div class="item-card-header">
        <div class="item-card-name">${item.short_name || 'N/A'}</div>
        <span class="badge ${item.status === 'Active' ? 'active' : 'inactive'}">${item.status || 'Unknown'}</span>
      </div>
      <div class="item-card-row">
        <span class="item-card-label">Season:</span>
        <span class="badge ${(item.season || '').toLowerCase()}">${item.season || 'N/A'}</span>
      </div>
      <div class="item-card-row">
        <span class="item-card-label">Class Type:</span>
        <span>${item.class_type || 'N/A'}</span>
      </div>
      <div class="item-card-row">
        <span class="item-card-label">Repair Status:</span>
        <span class="badge ${item.repair_status?.needs_repair ? 'needs-repair' : 'ok'}">${item.repair_status?.needs_repair ? 'Needs Repair' : 'OK'}</span>
      </div>
      <div class="item-card-row">
        <span class="item-card-label">Location:</span>
        <span>${item.packing_data?.tote_location || 'N/A'}</span>
      </div>
      <div class="action-buttons" style="margin-top: 8px;">
        <button class="btn-small btn-primary" onclick="viewItem('${item.id}')">View</button>
        <button class="btn-small btn-secondary" onclick="editItem('${item.id}')">Edit</button>
      </div>
    `;
    itemCards.appendChild(card);
  });
}

// View item details
function viewItem(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) {
    console.error('Item not found:', id);
    return;
  }
  
  // Populate ID (without "ID:" prefix)
  document.getElementById('viewItemId').textContent = item.id || 'N/A';
  
  // Populate basic fields
  document.getElementById('view-short-name').textContent = item.short_name || 'N/A';
  document.getElementById('view-season').textContent = item.season || 'N/A';
  document.getElementById('view-class').textContent = item.class || 'N/A';
  
  // Class type with icon
  const classTypeEl = document.getElementById('view-class-type');
  const icon = CLASS_TYPE_ICONS[item.class_type] || '📦';
  classTypeEl.innerHTML = `<span class="type-icon">${icon}</span> ${item.class_type || 'N/A'}`;
  
  document.getElementById('view-status').textContent = item.status || 'N/A';
  document.getElementById('view-general-notes').textContent = item.general_notes || 'N/A';
  
  // Needs Repair
  const needsRepairEl = document.getElementById('view-needs-repair');
  if (item.repair_status?.needs_repair === true) {
    needsRepairEl.textContent = 'YES';
    needsRepairEl.className = 'view-field-value needs-repair-yes';
  } else {
    needsRepairEl.textContent = 'NO';
    needsRepairEl.className = 'view-field-value';
  }
  
  // Storage Location
  document.getElementById('view-tote-location').textContent = 
    item.packing_data?.tote_location || 'N/A';
  
  // Last Deployment - extract last 4 characters
  const lastDeployment = item.deployment_data?.last_deployment_id;
  if (lastDeployment) {
    const last4 = lastDeployment.slice(-4);
    document.getElementById('view-last-deployment').textContent = last4;
  } else {
    document.getElementById('view-last-deployment').textContent = 'N/A';
  }
  
  // Populate expanded content with all other fields
  populateExpandedContent(item);
  
  // Reset expanded state
  document.getElementById('expandedContent').classList.remove('show');
  document.getElementById('viewPanel').classList.remove('expanded');
  document.getElementById('btnMoreInfo').textContent = 'More Information';
  
  document.getElementById('viewModal').style.display = 'flex';
}

// Populate expanded content in view modal
function populateExpandedContent(item) {
  const expandedLeft = document.getElementById('expandedLeft');
  const expandedRight = document.getElementById('expandedRight');
  expandedLeft.innerHTML = '';
  expandedRight.innerHTML = '';
  
  const classType = item.class_type;
  const hasRepairTracking = HAS_REPAIR_TRACKING.includes(classType);
  
  // LEFT SIDE - Previous Deployments
  const deploySection = document.createElement('div');
  deploySection.className = 'expanded-section';
  
  const deployTitle = document.createElement('h4');
  deployTitle.textContent = 'Previous Deployments';
  deploySection.appendChild(deployTitle);
  
  if (item.deployment_data?.previous_deployments && 
      Array.isArray(item.deployment_data.previous_deployments) && 
      item.deployment_data.previous_deployments.length > 0) {
    item.deployment_data.previous_deployments.forEach(dep => {
      const listItem = document.createElement('div');
      listItem.className = 'list-item';
      listItem.style.paddingLeft = '12px';
      listItem.textContent = dep;
      deploySection.appendChild(listItem);
    });
  } else {
    const noData = document.createElement('div');
    noData.className = 'list-item';
    noData.style.paddingLeft = '12px';
    noData.textContent = 'No previous deployments';
    deploySection.appendChild(noData);
  }
  
  expandedLeft.appendChild(deploySection);
  
  // LEFT SIDE - Repair Information (only for items with repair tracking)
  if (hasRepairTracking) {
    const repairSection = document.createElement('div');
    repairSection.className = 'expanded-section';
    
    const repairTitle = document.createElement('h4');
    repairTitle.textContent = 'Repair Information';
    repairSection.appendChild(repairTitle);
    
    // Last Repair Date
    const repairDateField = document.createElement('div');
    repairDateField.className = 'expanded-field';
    const repairDateLabel = document.createElement('div');
    repairDateLabel.className = 'expanded-field-label';
    repairDateLabel.textContent = 'Last Repair Date:';
    const repairDateValue = document.createElement('div');
    repairDateValue.className = 'expanded-field-value';
    repairDateValue.textContent = item.repair_status?.last_repair_date || 'N/A';
    repairDateField.appendChild(repairDateLabel);
    repairDateField.appendChild(repairDateValue);
    repairSection.appendChild(repairDateField);
    
    // Repair Notes
    const repairNotesField = document.createElement('div');
    repairNotesField.className = 'expanded-field';
    const repairNotesLabel = document.createElement('div');
    repairNotesLabel.className = 'expanded-field-label';
    repairNotesLabel.textContent = 'Repair Notes:';
    const repairNotesValue = document.createElement('div');
    repairNotesValue.className = 'expanded-field-value';
    repairNotesValue.textContent = item.repair_status?.repair_notes || 'N/A';
    repairNotesField.appendChild(repairNotesLabel);
    repairNotesField.appendChild(repairNotesValue);
    repairSection.appendChild(repairNotesField);
    
    // Repair Criticality
    const repairCritField = document.createElement('div');
    repairCritField.className = 'expanded-field';
    const repairCritLabel = document.createElement('div');
    repairCritLabel.className = 'expanded-field-label';
    repairCritLabel.textContent = 'Repair Criticality:';
    const repairCritValue = document.createElement('div');
    repairCritValue.className = 'expanded-field-value';
    repairCritValue.textContent = item.repair_status?.last_criticality || 'N/A';
    repairCritField.appendChild(repairCritLabel);
    repairCritField.appendChild(repairCritValue);
    repairSection.appendChild(repairCritField);
    
    expandedLeft.appendChild(repairSection);
  }
  
  // RIGHT SIDE - Item Information (dynamic based on class_type)
  const attributesToShow = CLASS_TYPE_ATTRIBUTES[classType] || [];
  
  if (attributesToShow.length > 0) {
    const itemSection = document.createElement('div');
    itemSection.className = 'expanded-section';
    
    const itemTitle = document.createElement('h4');
    itemTitle.textContent = 'Item Information';
    itemSection.appendChild(itemTitle);
    
    attributesToShow.forEach(attr => {
      const field = document.createElement('div');
      field.className = 'expanded-field';
      
      const label = document.createElement('div');
      label.className = 'expanded-field-label';
      label.textContent = (ATTRIBUTE_LABELS[attr] || formatFieldName(attr)) + ':';
      
      const value = document.createElement('div');
      value.className = 'expanded-field-value';
      value.textContent = item[attr] || 'N/A';
      
      field.appendChild(label);
      field.appendChild(value);
      itemSection.appendChild(field);
    });
    
    expandedRight.appendChild(itemSection);
  }
  
  // RIGHT SIDE - Vendor Information
  const vendorSection = document.createElement('div');
  vendorSection.className = 'expanded-section';
  
  const vendorTitle = document.createElement('h4');
  vendorTitle.textContent = 'Vendor Information';
  vendorSection.appendChild(vendorTitle);
  
  // Cost
  const costField = document.createElement('div');
  costField.className = 'expanded-field';
  const costLabel = document.createElement('div');
  costLabel.className = 'expanded-field-label';
  costLabel.textContent = 'Cost:';
  const costValue = document.createElement('div');
  costValue.className = 'expanded-field-value';
  costValue.textContent = item.vendor_metadata?.cost || 'N/A';
  costField.appendChild(costLabel);
  costField.appendChild(costValue);
  vendorSection.appendChild(costField);
  
  // Value
  const valueField = document.createElement('div');
  valueField.className = 'expanded-field';
  const valueLabel = document.createElement('div');
  valueLabel.className = 'expanded-field-label';
  valueLabel.textContent = 'Value:';
  const valueValue = document.createElement('div');
  valueValue.className = 'expanded-field-value';
  valueValue.textContent = item.vendor_metadata?.value || 'N/A';
  valueField.appendChild(valueLabel);
  valueField.appendChild(valueValue);
  vendorSection.appendChild(valueField);
  
  // Manufacturer
  const mfgField = document.createElement('div');
  mfgField.className = 'expanded-field';
  const mfgLabel = document.createElement('div');
  mfgLabel.className = 'expanded-field-label';
  mfgLabel.textContent = 'Manufacturer:';
  const mfgValue = document.createElement('div');
  mfgValue.className = 'expanded-field-value';
  mfgValue.textContent = item.vendor_metadata?.manufacturer || 'N/A';
  mfgField.appendChild(mfgLabel);
  mfgField.appendChild(mfgValue);
  vendorSection.appendChild(mfgField);
  
  // Store
  const storeField = document.createElement('div');
  storeField.className = 'expanded-field';
  const storeLabel = document.createElement('div');
  storeLabel.className = 'expanded-field-label';
  storeLabel.textContent = 'Store:';
  const storeValue = document.createElement('div');
  storeValue.className = 'expanded-field-value';
  storeValue.textContent = item.vendor_metadata?.vendor_store || 'N/A';
  storeField.appendChild(storeLabel);
  storeField.appendChild(storeValue);
  vendorSection.appendChild(storeField);
  
  expandedRight.appendChild(vendorSection);
}

// Helper function to format field names
function formatFieldName(key) {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Toggle expanded information in view modal
function toggleMoreInfo() {
  const expandedContent = document.getElementById('expandedContent');
  const viewPanel = document.getElementById('viewPanel');
  const btn = document.getElementById('btnMoreInfo');
  
  if (expandedContent.classList.contains('show')) {
    expandedContent.classList.remove('show');
    viewPanel.classList.remove('expanded');
    btn.textContent = 'More Information';
  } else {
    expandedContent.classList.add('show');
    viewPanel.classList.add('expanded');
    btn.textContent = 'Less Information';
  }
}

// Edit item from view modal
function editItemFromView() {
  closeModal('viewModal');
  // Get the current item ID from the view modal
  const idText = document.getElementById('viewItemId').textContent;
  const id = idText.replace('ID: ', '');
  editItem(id);
}

// Edit item
function editItem(id) {
  document.getElementById('editModal').style.display = 'flex';
}

// Close modal
function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// Event Listeners
document.getElementById('btnCreateItem').addEventListener('click', () => {
  document.getElementById('createModal').style.display = 'flex';
});

document.getElementById('btnDeleteItem').addEventListener('click', () => {
  document.getElementById('deleteModal').style.display = 'flex';
});

document.getElementById('btnLogout').addEventListener('click', () => {
  alert('Logout clicked');
});

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
  console.log('Search:', e.target.value);
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal')) {
    e.target.style.display = 'none';
  }
});

// Initialize application
loadConfig();