let _detailOverlay = null;

function openDetailModal(record) {
    if (_detailOverlay) _detailOverlay.remove();

    const changedFields = record.changedFields || [];
    const isCreate = record.operation === 'CREATE';
    const isDelete = record.operation === 'DELETE';

    _detailOverlay = document.createElement('div');
    _detailOverlay.className = 'detail-overlay';
    _detailOverlay.innerHTML = `
        <div class="detail-panel">
            <div class="detail-header">
                <div class="detail-header-left">
                    <div class="detail-title">
                        ${entityTypeBadge(record.entityType)}
                        ${operationBadge(record.operation)}
                        <span style="font-family:monospace;font-size:0.8125rem;color:var(--text-secondary)">
                            ${sanitizeHtml(record.entityId || '')}
                        </span>
                    </div>
                    <div class="detail-meta">
                        <span class="detail-meta-item">
                            <span class="detail-meta-label">Time:</span>
                            ${sanitizeHtml(formatTimestamp(record.timestamp))}
                        </span>
                        ${record.userId ? `
                        <span class="detail-meta-item">
                            <span class="detail-meta-label">User:</span>
                            ${sanitizeHtml(record.userId)}
                        </span>` : ''}
                        ${record.auditId ? `
                        <span class="detail-meta-item">
                            <span class="detail-meta-label">Audit ID:</span>
                            <span style="font-family:monospace;font-size:0.75rem">${sanitizeHtml(record.auditId)}</span>
                        </span>` : ''}
                    </div>
                </div>
                <button class="detail-close-btn" id="detail-close" aria-label="Close">&times;</button>
            </div>

            <div class="detail-body">
                ${changedFields.length ? `
                <div class="changed-fields-section">
                    <div class="section-label">Changed Fields</div>
                    <div class="changed-fields-pills">
                        ${changedFields.map(f => `<span class="changed-field-pill">${sanitizeHtml(f)}</span>`).join('')}
                    </div>
                </div>` : ''}

                <div class="diff-section">
                    <div class="section-label">Value Diff</div>
                    <div class="diff-grid">
                        <div class="diff-pane">
                            <div class="diff-pane-header old">Before</div>
                            ${isCreate
                                ? `<div class="diff-empty">No previous value — this is a CREATE.</div>`
                                : `<pre>${highlightJsonDiff(record.oldValue, changedFields)}</pre>`
                            }
                        </div>
                        <div class="diff-pane">
                            <div class="diff-pane-header new">After</div>
                            ${isDelete
                                ? `<div class="diff-empty">No new value — this is a DELETE.</div>`
                                : `<pre>${highlightJsonDiff(record.newValue, changedFields)}</pre>`
                            }
                        </div>
                    </div>
                </div>
            </div>

            <div class="detail-footer">
                <div class="detail-export-group">
                    <span class="detail-export-label">Export record:</span>
                    <button class="btn btn-ghost btn-sm" id="export-json">JSON</button>
                    <button class="btn btn-ghost btn-sm" id="export-csv">CSV</button>
                </div>
                <button class="btn btn-ghost btn-sm" id="detail-close-footer">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(_detailOverlay);
    setTimeout(() => _detailOverlay.classList.add('open'), 10);

    const close = () => {
        _detailOverlay.classList.remove('open');
        setTimeout(() => { if (_detailOverlay) { _detailOverlay.remove(); _detailOverlay = null; } }, 200);
    };

    _detailOverlay.querySelector('#detail-close').addEventListener('click', close);
    _detailOverlay.querySelector('#detail-close-footer').addEventListener('click', close);
    _detailOverlay.addEventListener('click', e => { if (e.target === _detailOverlay) close(); });

    const esc = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } };
    document.addEventListener('keydown', esc);

    _detailOverlay.querySelector('#export-json').addEventListener('click', () => exportRecordJson(record));
    _detailOverlay.querySelector('#export-csv').addEventListener('click', () => exportRecordCsv(record));

    const pres = [..._detailOverlay.querySelectorAll('.diff-pane pre')];
    if (pres.length === 2) {
        let syncing = false;
        pres.forEach((pane, i) => {
            pane.addEventListener('scroll', () => {
                if (syncing) return;
                syncing = true;
                pres[1 - i].scrollTop = pane.scrollTop;
                pres[1 - i].scrollLeft = pane.scrollLeft;
                syncing = false;
            });
        });
    }
}

function exportRecordJson(record) {
    const filename = `audit-record-${record.auditId || record.entityId || 'export'}.json`;
    downloadFile(JSON.stringify(record, null, 2), filename, 'application/json');
    showSuccessToast('JSON downloaded.');
}

function exportRecordCsv(record) {
    const filename = `audit-record-${record.auditId || record.entityId || 'export'}.csv`;
    downloadFile(recordsToCsv([record]), filename, 'text/csv');
    showSuccessToast('CSV downloaded.');
}
