// Rendering functions for audit records

export function renderRecords(records, activeTab) {
  renderDesktopTable(records, activeTab);
  renderMobileCards(records);
  
  // Store records globally for modal access
  window.auditRecords = records;
}

function renderDesktopTable(records, activeTab) {
  const tbody = document.getElementById('table-body');
  
  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">No audit records found</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = records.map(record => `
    <tr onclick="window.openRecordDetail('${record.auditId}')">
      <td>${escapeHtml(record.timestampFormatted)}</td>
      <td>
        <span style="margin-right: 0.5rem;">${getEntityTypeIcon(record.entityType)}</span>
        ${escapeHtml(record.entityType)}
      </td>
      <td style="font-weight: 500;">${escapeHtml(record.displayName)}</td>
      <td>
        <span class="badge ${getOperationBadgeClass(record.operation)}">
          ${record.operation}
        </span>
      </td>
      ${activeTab === 'inventory' ? `<td>${escapeHtml(record.class || '-')}</td>` : ''}
      <td style="color: #6b7280;">
        ${escapeHtml((record.changedFieldsDisplay || []).join(', '))}
        ${record.additionalChangesCount > 0 ? `<span style="color: #9ca3af;"> and ${record.additionalChangesCount} more</span>` : ''}
      </td>
    </tr>
  `).join('');
}

function renderMobileCards(records) {
  const mobileCards = document.getElementById('mobile-cards');
  
  if (records.length === 0) {
    mobileCards.innerHTML = '<div class="audit-card" style="text-align: center; color: #6b7280;">No audit records found</div>';
    return;
  }

  mobileCards.innerHTML = records.map(record => `
    <div class="audit-card" onclick="window.openRecordDetail('${record.auditId}')">
      <div class="card-header">
        <div class="card-entity">
          <span class="card-entity-icon">${getEntityTypeIcon(record.entityType)}</span>
          <div>
            <div class="card-entity-name">${escapeHtml(record.displayName)}</div>
            <div class="card-entity-type">${escapeHtml(record.entityType)}</div>
          </div>
        </div>
        <span class="badge ${getOperationBadgeClass(record.operation)}">
          ${record.operation}
        </span>
      </div>
      <div class="card-time">🕐 ${escapeHtml(record.timestampFormatted)}</div>
      <div class="card-changes">
        Changed: ${escapeHtml((record.changedFieldsDisplay || []).join(', '))}
        ${record.additionalChangesCount > 0 ? `, and ${record.additionalChangesCount} more` : ''}
      </div>
    </div>
  `).join('');
}

export function renderError() {
  document.getElementById('table-body').innerHTML = `
    <tr>
      <td colspan="6" class="text-center" style="color: #ef4444;">Error loading audit records</td>
    </tr>
  `;
  document.getElementById('mobile-cards').innerHTML = `
    <div class="audit-card" style="text-align: center; color: #ef4444;">Error loading audit records</div>
  `;
}

function getEntityTypeIcon(entityType) {
  const icons = {
    inventory: '📦',
    gallery: '🖼️',
    ideas: '💡'
  };
  return icons[entityType] || '📄';
}

function getOperationBadgeClass(operation) {
  const classes = {
    CREATE: 'badge-create',
    UPDATE: 'badge-update',
    DELETE: 'badge-delete'
  };
  return classes[operation] || '';
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}