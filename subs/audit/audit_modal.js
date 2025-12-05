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