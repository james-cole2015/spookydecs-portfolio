// View Modal - Handles item detail viewing

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
  editItem(idText);
}