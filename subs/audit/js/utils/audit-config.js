const AuditConfig = {
    ENTITY_TYPES: {
        inventory:          { label: 'Inventory',    badge: 'badge-inventory' },
        maintenance_record: { label: 'Maintenance',  badge: 'badge-maintenance' },
        violation:          { label: 'Violation',    badge: 'badge-violation' },
        deployment:         { label: 'Deployment',   badge: 'badge-deployment' }
    },

    OPERATIONS: {
        CREATE: { label: 'Create', badge: 'badge-op-create' },
        UPDATE: { label: 'Update', badge: 'badge-op-update' },
        DELETE: { label: 'Delete', badge: 'badge-op-delete' }
    },

    DEFAULT_PAGE_SIZE: 25
};

function formatTimestamp(ts) {
    if (!ts) return '—';
    try {
        return new Date(ts).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    } catch {
        return ts;
    }
}

function sanitizeHtml(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function entityTypeBadge(type) {
    const cfg = AuditConfig.ENTITY_TYPES[type];
    const cls = cfg ? cfg.badge : 'badge-inventory';
    const lbl = cfg ? cfg.label : type;
    return `<span class="badge ${cls}">${sanitizeHtml(lbl)}</span>`;
}

function operationBadge(op) {
    const cfg = AuditConfig.OPERATIONS[op];
    const cls = cfg ? cfg.badge : 'badge-op-update';
    const lbl = cfg ? cfg.label : op;
    return `<span class="badge ${cls}">${sanitizeHtml(lbl)}</span>`;
}

function highlightJsonDiff(jsonObj, changedFields = []) {
    if (jsonObj === null || jsonObj === undefined) {
        return `<span class="diff-empty">—</span>`;
    }

    const raw = JSON.stringify(jsonObj, null, 2);

    let escaped = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    changedFields.forEach(field => {
        const pattern = new RegExp(`"(${escapeRegex(field)})"(\\s*:)`, 'g');
        escaped = escaped.replace(pattern, `<span class="diff-key-highlight">"$1"</span>$2`);
    });

    return escaped;
}

function recordsToCsv(records) {
    const headers = ['auditId', 'timestamp', 'entityType', 'entityId', 'operation', 'changedFields', 'userId'];
    const rows = records.map(r => [
        r.auditId || '',
        r.timestamp || '',
        r.entityType || '',
        r.entityId || '',
        r.operation || '',
        (r.changedFields || []).join('|'),
        r.userId || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    return [headers.join(','), ...rows].join('\n');
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
