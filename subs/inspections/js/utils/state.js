/**
 * State Management
 * Manages URL state for filters, tabs, and navigation
 */

const State = {
    currentTab: 'by-rule',
    filters: {
        status: null,
        severity: null,
        rule_id: null
    },
    lastKey: null
};

/**
 * Get query parameter from URL
 */
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set query parameter in URL
 */
function setQueryParam(param, value) {
    const url = new URL(window.location.href);
    if (value) {
        url.searchParams.set(param, value);
    } else {
        url.searchParams.delete(param);
    }
    window.history.replaceState({}, '', url.toString());
}

/**
 * Get all query parameters as object
 */
function getAllQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of urlParams) {
        params[key] = value;
    }
    return params;
}

/**
 * Update URL with multiple query parameters
 */
function updateQueryParams(params) {
    const url = new URL(window.location.href);
    Object.keys(params).forEach(key => {
        if (params[key]) {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    window.history.replaceState({}, '', url.toString());
}

/**
 * Get current tab from URL
 */
function getCurrentTab() {
    return getQueryParam('tab') || 'by-rule';
}

/**
 * Set current tab in URL
 */
function setCurrentTab(tab) {
    State.currentTab = tab;
    setQueryParam('tab', tab === 'by-rule' ? null : tab);
}

/**
 * Get filters from URL
 */
function getFiltersFromUrl() {
    return {
        status: getQueryParam('status'),
        severity: getQueryParam('severity'),
        rule_id: getQueryParam('rule_id')
    };
}

/**
 * Set filters in URL
 */
function setFilters(filters) {
    State.filters = { ...filters };
    updateQueryParams({
        status: filters.status,
        severity: filters.severity,
        rule_id: filters.rule_id
    });
}

/**
 * Clear all filters
 */
function clearFilters() {
    State.filters = {
        status: null,
        severity: null,
        rule_id: null
    };
    updateQueryParams({
        status: null,
        severity: null,
        rule_id: null
    });
}

/**
 * Initialize state from URL
 */
function initializeState() {
    State.currentTab = getCurrentTab();
    State.filters = getFiltersFromUrl();
}

/**
 * Save scroll position
 */
function saveScrollPosition() {
    sessionStorage.setItem('inspector_scroll', window.scrollY);
}

/**
 * Restore scroll position
 */
function restoreScrollPosition() {
    const scrollY = sessionStorage.getItem('inspector_scroll');
    if (scrollY) {
        window.scrollTo(0, parseInt(scrollY));
        sessionStorage.removeItem('inspector_scroll');
    }
}
