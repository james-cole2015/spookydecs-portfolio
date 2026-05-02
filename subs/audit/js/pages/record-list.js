let _filterContainer = null;
let _tableContainer = null;

function renderRecordListPage() {
    const app = document.getElementById('app-container');
    app.innerHTML = `
        <div class="audit-container">
            <div class="audit-page-header">
                <h1>Audit Records</h1>
            </div>
            <div id="filter-bar-container"></div>
            <div id="records-table-container"></div>
        </div>
    `;

    _filterContainer = app.querySelector('#filter-bar-container');
    _tableContainer = app.querySelector('#records-table-container');

    renderFilterBar(_filterContainer);
    loadRecords(null);
}

async function loadRecords(token) {
    AuditState.loading = true;
    renderRecordsTable(_tableContainer);

    try {
        const { entityType, operation, environment } = AuditState.filters;
        const isAllTypes = !entityType;
        const result = isAllTypes
            ? await AuditAPI.getAllTypes({ operation, environment })
            : await AuditAPI.getRecords({
                entityType, operation, environment,
                nextToken: token,
                limit: AuditConfig.DEFAULT_PAGE_SIZE
            });

        AuditState.records = result.records || [];
        AuditState.nextToken = result.nextToken || null;
    } catch (err) {
        console.error('Failed to load audit records:', err);
        AuditState.records = [];
        AuditState.nextToken = null;
        showErrorToast('Failed to load records. Check the console for details.');
    } finally {
        AuditState.loading = false;
        renderRecordsTable(_tableContainer);
    }
}

function refreshRecordList() {
    resetPagination();
    loadRecords(null);
}

async function handleNextPage() {
    if (!AuditState.nextToken) return;
    AuditState.prevTokenStack.push(AuditState.currentPageToken);
    AuditState.currentPageToken = AuditState.nextToken;
    AuditState.currentPage++;
    await loadRecords(AuditState.currentPageToken);
}

async function handlePrevPage() {
    if (AuditState.prevTokenStack.length === 0) return;
    AuditState.currentPageToken = AuditState.prevTokenStack.pop();
    AuditState.currentPage--;
    await loadRecords(AuditState.currentPageToken);
}

async function handleBulkExport() {
    const { entityType, operation, environment } = AuditState.filters;
    showInfoToast('Fetching all records for export…', 4000);

    try {
        const records = await AuditAPI.getAllRecordsForExport({ entityType, operation, environment });
        if (!records.length) {
            showWarningToast('No records to export.');
            return;
        }

        const format = await promptExportFormat();
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const label = [entityType || 'all', operation || 'all', environment].filter(Boolean).join('-');

        if (format === 'json') {
            downloadFile(JSON.stringify(records, null, 2), `audit-export-${label}-${ts}.json`, 'application/json');
        } else {
            downloadFile(recordsToCsv(records), `audit-export-${label}-${ts}.csv`, 'text/csv');
        }

        showSuccessToast(`Exported ${records.length} records.`);
    } catch (err) {
        console.error('Bulk export failed:', err);
        showErrorToast('Export failed. Check the console for details.');
    }
}

function promptExportFormat() {
    return new Promise(resolve => {
        showConfirmModal(
            'Export format',
            'Export as JSON or CSV?',
            () => resolve('json'),
            () => resolve('csv')
        );
        const footer = document.querySelector('.modal-footer');
        if (footer) {
            const cancelBtn = footer.querySelector('.modal-cancel');
            if (cancelBtn) cancelBtn.textContent = 'CSV';
            const confirmBtn = footer.querySelector('.modal-confirm');
            if (confirmBtn) confirmBtn.textContent = 'JSON';
        }
    });
}
