// Modal functionality for audit record details

let selectedRecord = null;

export function openRecordDetail(auditId) {
  const record = window.auditRecords?.find(r => r.auditId === auditId);
  if (!record) {
    console.error('Record not found:', auditId);
    return;
  }

  selectedRecord = record;
  
  document.getElementById('modal-title').textContent = record.displayName;
  document.getElementById('modal-subtitle').textContent = `${record.timestampFormatted} | ${record.operation}`;
  document.getElementById('changed-fields-title').textContent = `Changed Fields (${record.changedFields?.length || 0}):`;
  
  const fieldsList = document.getElementById('changed-fields-list');
  fieldsList.innerHTML = (record.changedFieldsDisplay || []).map(field => 
    `<div class="text-sm text-gray-700">• ${escapeHtml(field)}</div>`
  ).join('');
  
  if (record.additionalChangesCount > 0) {
    fieldsList.innerHTML += `<div class="text-sm text-gray-500">• and ${record.additionalChangesCount} more fields</div>`;
  }

  document.getElementById('detail-modal').classList.add('open');
  
  console.log('Opened detail modal for:', record.displayName, '(', auditId, ')');
}

export function closeModal() {
  document.getElementById('detail-modal').classList.remove('open');
  document.getElementById('expanded-details').classList.add('hidden');
  document.getElementById('toggle-details').textContent = '▼ Show Full Details';
  selectedRecord = null;
  
  console.log('Closed detail modal');
}

export function toggleDetails() {
  const expanded = document.getElementById('expanded-details');
  const toggleBtn = document.getElementById('toggle-details');
  
  if (expanded.classList.contains('hidden')) {
    buildExpandedView();
    expanded.classList.remove('hidden');
    toggleBtn.textContent = '▲ Hide Details';
    console.log('Expanded details view');
  } else {
    expanded.classList.add('hidden');
    toggleBtn.textContent = '▼ Show Full Details';
    console.log('Collapsed details view');
  }
}

function buildExpandedView() {
  const expanded = document.getElementById('expanded-details');
  
  const isDeployment = selectedRecord.newValue?.class === 'Deployment' || 
                       selectedRecord.oldValue?.class === 'Deployment';
  
  let smartChangesHtml = '';
  if (isDeployment) {
    smartChangesHtml = buildDeploymentChanges();
  }
  
  const changedFields = (selectedRecord.changedFields || []).map(field => {
    const oldVal = selectedRecord.oldValue?.[field];
    const newVal = selectedRecord.newValue?.[field];
    
    return `
      <div class="border-l-4 border-blue-500 pl-4">
        <div class="font-medium text-sm text-gray-700 mb-1">${escapeHtml(field)}</div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-xs text-gray-500 mb-1">Before:</div>
            <div class="bg-red-50 p-2 rounded break-words">
              ${formatValue(oldVal)}
            </div>
          </div>
          <div>
            <div class="text-xs text-gray-500 mb-1">After:</div>
            <div class="bg-green-50 p-2 rounded break-words">
              ${formatValue(newVal)}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  expanded.innerHTML = `
    ${smartChangesHtml}
    ${changedFields}
    <details class="mt-6">
      <summary class="cursor-pointer font-medium text-gray-900 mb-2">Full Record Before</summary>
      <pre class="bg-gray-50 p-4 rounded text-xs overflow-x-auto">${JSON.stringify(selectedRecord.oldValue, null, 2)}</pre>
    </details>
    <details>
      <summary class="cursor-pointer font-medium text-gray-900 mb-2">Full Record After</summary>
      <pre class="bg-gray-50 p-4 rounded text-xs overflow-x-auto">${JSON.stringify(selectedRecord.newValue, null, 2)}</pre>
    </details>
  `;
}

function buildDeploymentChanges() {
  const changes = [];
  const oldVal = selectedRecord.oldValue || {};
  const newVal = selectedRecord.newValue || {};
  
  // 1. Top-level status changes
  if (oldVal.status !== newVal.status) {
    changes.push(`Status changed from <strong>${escapeHtml(oldVal.status || 'none')}</strong> to <strong>${escapeHtml(newVal.status)}</strong>`);
  }
  
  if (oldVal.setup_started_at !== newVal.setup_started_at && newVal.setup_started_at) {
    changes.push(`Setup started at ${new Date(newVal.setup_started_at).toLocaleString()}`);
  }
  
  if (oldVal.setup_completed_at !== newVal.setup_completed_at && newVal.setup_completed_at) {
    changes.push(`Setup completed at ${new Date(newVal.setup_completed_at).toLocaleString()}`);
  }
  
  if (oldVal.teardown_started_at !== newVal.teardown_started_at && newVal.teardown_started_at) {
    changes.push(`Teardown started at ${new Date(newVal.teardown_started_at).toLocaleString()}`);
  }
  
  if (oldVal.teardown_completed_at !== newVal.teardown_completed_at && newVal.teardown_completed_at) {
    changes.push(`Teardown completed at ${new Date(newVal.teardown_completed_at).toLocaleString()}`);
  }
  
  // 2. Work sessions added/completed
  const oldLocations = oldVal.locations || [];
  const newLocations = newVal.locations || [];
  
  newLocations.forEach((newLoc, idx) => {
    const oldLoc = oldLocations[idx] || {};
    const locationName = newLoc.name;
    
    const oldSessions = oldLoc.work_sessions || [];
    const newSessions = newLoc.work_sessions || [];
    
    if (newSessions.length > oldSessions.length) {
      const addedCount = newSessions.length - oldSessions.length;
      changes.push(`Added ${addedCount} work session${addedCount > 1 ? 's' : ''} to <strong>${escapeHtml(locationName)}</strong>`);
    }
    
    // Check for completed sessions
    newSessions.forEach((newSession, sessionIdx) => {
      const oldSession = oldSessions[sessionIdx];
      if (oldSession && !oldSession.end_time && newSession.end_time) {
        const duration = newSession.duration_seconds 
          ? ` (${Math.round(newSession.duration_seconds / 60)} minutes)`
          : '';
        changes.push(`Completed work session in <strong>${escapeHtml(locationName)}</strong>${duration}`);
      }
    });
  });
  
  // 3. Connections created
  newLocations.forEach((newLoc, idx) => {
    const oldLoc = oldLocations[idx] || {};
    const locationName = newLoc.name;
    
    const oldConnections = oldLoc.connections || [];
    const newConnections = newLoc.connections || [];
    
    if (newConnections.length > oldConnections.length) {
      const addedCount = newConnections.length - oldConnections.length;
      changes.push(`Created ${addedCount} connection${addedCount > 1 ? 's' : ''} in <strong>${escapeHtml(locationName)}</strong>`);
    }
  });
  
  // 4. Items deployed
  newLocations.forEach((newLoc, idx) => {
    const oldLoc = oldLocations[idx] || {};
    const locationName = newLoc.name;
    
    const oldItems = oldLoc.items_deployed || [];
    const newItems = newLoc.items_deployed || [];
    
    if (newItems.length > oldItems.length) {
      const addedCount = newItems.length - oldItems.length;
      changes.push(`Deployed ${addedCount} item${addedCount > 1 ? 's' : ''} to <strong>${escapeHtml(locationName)}</strong>`);
    }
  });
  
  // 5. Location status changes
  newLocations.forEach((newLoc, idx) => {
    const oldLoc = oldLocations[idx] || {};
    const locationName = newLoc.name;
    
    if (oldLoc.status !== newLoc.status) {
      changes.push(`<strong>${escapeHtml(locationName)}</strong> status changed from <strong>${escapeHtml(oldLoc.status || 'none')}</strong> to <strong>${escapeHtml(newLoc.status)}</strong>`);
    }
  });
  
  if (changes.length === 0) {
    return '';
  }
  
  return `
    <div class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
      <h4 class="font-medium text-gray-900 mb-3">Deployment Changes:</h4>
      <ul class="space-y-2 text-sm text-gray-700">
        ${changes.map(change => `<li>• ${change}</li>`).join('')}
      </ul>
    </div>
  `;
}

function formatValue(val) {
  if (val === null) return '<span class="text-gray-400 italic">null</span>';
  if (val === undefined) return '<span class="text-gray-400 italic">undefined</span>';
  if (typeof val === 'string') return escapeHtml(val);
  return escapeHtml(JSON.stringify(val));
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}