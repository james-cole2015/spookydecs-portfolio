const AuditState = {
    filters: {
        entityType: '',
        operation: ''
    },
    records: [],
    currentPageToken: null,
    nextToken: null,
    prevTokenStack: [],
    currentPage: 1,
    loading: false
};

function setFilter(key, value) {
    AuditState.filters[key] = value;
    resetPagination();
}

function resetPagination() {
    AuditState.currentPageToken = null;
    AuditState.nextToken = null;
    AuditState.prevTokenStack = [];
    AuditState.currentPage = 1;
}
