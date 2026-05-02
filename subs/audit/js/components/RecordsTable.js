function renderRecordsTable(container) {
    const { records, loading, nextToken, prevTokenStack, currentPage } = AuditState;

    if (loading) {
        container.innerHTML = `
            <div class="records-table-wrapper">
                <div class="state-container">
                    <div class="loading-spinner"></div>
                    <p>Loading records…</p>
                </div>
            </div>`;
        return;
    }

    if (!records.length) {
        container.innerHTML = `
            <div class="records-table-wrapper">
                <div class="state-container">
                    <div class="empty-state-icon">📋</div>
                    <p>No audit records found for the current filters.</p>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="records-table-wrapper">
            <table class="records-table">
                <thead>
                    <tr>
                        <th class="col-timestamp">Timestamp</th>
                        <th class="col-entity-type">Entity Type</th>
                        <th class="col-operation">Operation</th>
                        <th class="col-entity-id">Entity ID</th>
                        <th class="col-changed-fields">Changed Fields</th>
                        <th class="col-user">User</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map((r, i) => renderRow(r, i)).join('')}
                </tbody>
            </table>
            <div class="pagination-bar">
                <span class="pagination-info">${AuditState.filters.entityType ? `Page ${currentPage}` : `Showing most recent ${records.length} records across all types`}</span>
                ${AuditState.filters.entityType ? `
                <div class="pagination-controls">
                    <button class="btn btn-ghost btn-sm" id="page-prev" ${prevTokenStack.length === 0 ? 'disabled' : ''}>← Prev</button>
                    <button class="btn btn-ghost btn-sm" id="page-next" ${!nextToken ? 'disabled' : ''}>Next →</button>
                </div>` : ''}
            </div>
        </div>`;

    container.querySelectorAll('tbody tr').forEach((row, i) => {
        row.addEventListener('click', () => openDetailModal(records[i]));
    });

    const prevBtn = container.querySelector('#page-prev');
    const nextBtn = container.querySelector('#page-next');
    if (prevBtn) prevBtn.addEventListener('click', handlePrevPage);
    if (nextBtn) nextBtn.addEventListener('click', handleNextPage);
}

function renderRow(record) {
    const fields = (record.changedFields || []).slice(0, 5);
    const overflow = (record.changedFields || []).length - 5;
    const chips = fields
        .map(f => `<span class="changed-field-chip">${sanitizeHtml(f)}</span>`)
        .join('');
    const overflowChip = overflow > 0
        ? `<span class="changed-field-chip">+${overflow}</span>`
        : '';

    return `
        <tr>
            <td class="col-timestamp">${sanitizeHtml(formatTimestamp(record.timestamp))}</td>
            <td class="col-entity-type">${entityTypeBadge(record.entityType)}</td>
            <td class="col-operation">${operationBadge(record.operation)}</td>
            <td class="col-entity-id">
                <span class="entity-id" title="${sanitizeHtml(record.entityId || '')}">
                    ${sanitizeHtml(record.entityId || '—')}
                </span>
            </td>
            <td class="col-changed-fields">
                <div class="changed-fields-list">
                    ${chips || overflowChip
                        ? chips + overflowChip
                        : '<span style="color:var(--text-muted)">—</span>'
                    }
                </div>
            </td>
            <td class="col-user">${sanitizeHtml(record.userId || '—')}</td>
        </tr>`;
}
