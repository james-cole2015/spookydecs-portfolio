function renderFilterBar(container) {
    const { entityType, operation } = AuditState.filters;

    container.innerHTML = `
        <div class="filter-bar">
            <div class="filter-group">
                <label class="filter-label">Entity Type</label>
                <select class="filter-select" id="filter-entity-type">
                    <option value="" ${entityType === '' ? 'selected' : ''}>All types</option>
                    ${Object.entries(AuditConfig.ENTITY_TYPES).map(([k, v]) =>
                        `<option value="${k}" ${entityType === k ? 'selected' : ''}>${v.label}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="filter-group">
                <label class="filter-label">Operation</label>
                <select class="filter-select" id="filter-operation">
                    <option value="">All operations</option>
                    ${Object.entries(AuditConfig.OPERATIONS).map(([k, v]) =>
                        `<option value="${k}" ${operation === k ? 'selected' : ''}>${v.label}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="filter-actions">
                <button class="btn btn-ghost btn-sm" id="filter-reset">Reset</button>
                <button class="btn btn-accent btn-sm" id="bulk-export-btn">Export all</button>
            </div>
        </div>
    `;

    container.querySelector('#filter-entity-type').addEventListener('change', e => {
        setFilter('entityType', e.target.value);
        refreshRecordList();
    });

    container.querySelector('#filter-operation').addEventListener('change', e => {
        setFilter('operation', e.target.value);
        refreshRecordList();
    });

    container.querySelector('#filter-reset').addEventListener('click', () => {
        AuditState.filters.entityType = '';
        AuditState.filters.operation = '';
        resetPagination();
        renderFilterBar(container);
        refreshRecordList();
    });

    container.querySelector('#bulk-export-btn').addEventListener('click', handleBulkExport);
}
