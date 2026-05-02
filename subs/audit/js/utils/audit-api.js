const AuditAPI = {
    async getBaseUrl() {
        const { API_ENDPOINT } = await window.SpookyConfig.get();
        return API_ENDPOINT;
    },

    buildQuery(params) {
        const pairs = Object.entries(params)
            .filter(([, v]) => v !== null && v !== undefined && v !== '');
        if (!pairs.length) return '';
        return '?' + pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    },

    async request(path, params = {}) {
        const base = await this.getBaseUrl();
        const url = `${base}${path}${this.buildQuery(params)}`;
        const headers = window.SpookyAuth ? window.SpookyAuth.buildHeaders() : {};
        const response = await fetch(url, { headers });
        if (response.status === 401) {
            if (window.SpookyAuth) await window.SpookyAuth.redirectToLogin();
            return null;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(result.error || result.message || `HTTP ${response.status}`);
        }
        return result.data || result;
    },

    async getRecords({ entityType, operation, environment, nextToken, limit = AuditConfig.DEFAULT_PAGE_SIZE } = {}) {
        return this.request('/audit/records', { entityType, operation, environment, nextToken, limit });
    },

    async getEntityHistory({ entityType, entityId, environment, nextToken, limit = AuditConfig.DEFAULT_PAGE_SIZE } = {}) {
        return this.request(`/audit/${entityType}/${entityId}/history`, { environment, nextToken, limit });
    },

    async getAllTypes({ operation, environment, limit = AuditConfig.DEFAULT_PAGE_SIZE } = {}) {
        const types = Object.keys(AuditConfig.ENTITY_TYPES);
        const pages = await Promise.all(
            types.map(t => this.getRecords({ entityType: t, operation, environment, limit }).catch(() => ({ records: [] })))
        );
        const merged = pages.flatMap(p => p.records || []);
        merged.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        return { records: merged.slice(0, limit), nextToken: null };
    },

    async getAllRecordsForExport({ entityType, operation, environment } = {}) {
        const records = [];
        let token = null;
        do {
            const page = await this.request('/audit/records', {
                entityType, operation, environment, nextToken: token, limit: 100
            });
            records.push(...(page.records || []));
            token = page.nextToken || null;
        } while (token);
        return records;
    }
};
