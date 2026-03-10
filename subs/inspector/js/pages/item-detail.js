/**
 * Item Detail Page
 * Displays all violations for a specific item with inspector + items sub links
 */

let currentItemId = null;
let itemViolations = [];
let itemShortName = null;
let itemsAdminUrlItem = null;
let activeItemTab = 'open';

/**
 * Render Item Detail Page
 */
async function renderItemDetail(itemId) {
    activeItemTab = 'open';
    currentItemId = itemId;

    const container = document.getElementById('app-container');

    container.innerHTML = `
        <div class="rule-detail-container">
            <div class="breadcrumb">
                <a href="/inspector" onclick="navigateTo('/inspector'); return false;">← Back to Inspector</a>
            </div>
            <div id="item-detail-content">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>Loading item...</p>
                </div>
            </div>
        </div>
    `;

    try {
        const [violations, config] = await Promise.all([
            InspectorAPI.getViolationsForItem(itemId),
            window.SpookyConfig.get()
        ]);

        itemViolations = violations;
        itemsAdminUrlItem = config.ITEMS_ADMIN || null;
        itemShortName = violations.length > 0
            ? (violations[0].violation_details?.item_short_name || itemId)
            : itemId;

        renderItemDetailContent();

    } catch (error) {
        console.error('Error loading item detail:', error);
        const content = document.getElementById('item-detail-content');
        content.innerHTML = `
            <div class="error-container">
                <p class="error-message">Failed to load item: ${sanitizeHtml(error.message)}</p>
                <button class="btn btn-primary" onclick="navigateTo('/inspector')">Back to Inspector</button>
            </div>
        `;
    }
}

/**
 * Render item detail content
 */
function renderItemDetailContent() {
    const content = document.getElementById('item-detail-content');
    const stats = calculateStats(itemViolations);
    const subHref = itemsAdminUrlItem ? `${itemsAdminUrlItem}/${sanitizeHtml(currentItemId)}` : '#';

    content.innerHTML = `
        <div class="item-detail-header">
            <div class="item-detail-identity">
                <h1>${sanitizeHtml(itemShortName)}</h1>
                <span class="badge badge-inactive">${sanitizeHtml(currentItemId)}</span>
                <a href="${subHref}" target="_blank" rel="noopener" class="item-link">View in Items ↗</a>
            </div>
            <div class="item-detail-stats">
                <div class="stat-item">
                    <span class="stat-label">Total</span>
                    <span class="stat-value">${stats.total}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Open</span>
                    <span class="stat-value">${stats.open}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Resolved</span>
                    <span class="stat-value">${stats.resolved}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Dismissed</span>
                    <span class="stat-value">${stats.dismissed}</span>
                </div>
            </div>
        </div>

        <div class="violations-section">
            <h2>Violations (${itemViolations.length})</h2>
            ${renderItemViolations()}
        </div>
    `;

    attachItemDetailListeners();
}

/**
 * Filter violations by status
 */
function filterItemViolationsByStatus(status) {
    return itemViolations.filter(v => v.status === status);
}

/**
 * Render violations table for this item
 */
function renderItemViolations() {
    const openViolations = filterItemViolationsByStatus('open');
    const resolvedViolations = filterItemViolationsByStatus('resolved');
    const dismissedViolations = filterItemViolationsByStatus('dismissed');

    const activeViolations = {
        open: openViolations,
        resolved: resolvedViolations,
        dismissed: dismissedViolations
    }[activeItemTab] || openViolations;

    const tabsHtml = `
        <div class="violations-tabs">
            <button class="violations-tab-btn ${activeItemTab === 'open' ? 'active' : ''}"
                    data-item-tab="open">Open (${openViolations.length})</button>
            <button class="violations-tab-btn ${activeItemTab === 'resolved' ? 'active' : ''}"
                    data-item-tab="resolved">Resolved (${resolvedViolations.length})</button>
            <button class="violations-tab-btn ${activeItemTab === 'dismissed' ? 'active' : ''}"
                    data-item-tab="dismissed">Dismissed (${dismissedViolations.length})</button>
        </div>
    `;

    if (activeViolations.length === 0) {
        const emptyMessages = {
            open: 'No open violations',
            resolved: 'No resolved violations',
            dismissed: 'No dismissed violations'
        };
        return `
            ${tabsHtml}
            <div class="empty-state">
                <p>✓ ${emptyMessages[activeItemTab]}</p>
            </div>
        `;
    }

    const tableView = `
        <table class="violations-table">
            <thead>
                <tr>
                    <th>Rule</th>
                    <th>Issue</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Detected</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${activeViolations.map(v => {
                    const severityConfig = getSeverityConfig(v.severity);
                    const statusConfig = getStatusConfig(v.status);
                    return `
                        <tr>
                            <td>${sanitizeHtml(v.rule_id)}</td>
                            <td>${sanitizeHtml(truncateText(v.violation_details?.message || 'N/A', 60))}</td>
                            <td>
                                <span class="badge ${severityConfig.badge}">
                                    ${severityConfig.icon} ${severityConfig.label}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${statusConfig.badge}">
                                    ${statusConfig.label}
                                </span>
                            </td>
                            <td>${formatRelativeTime(v.detected_at)}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary view-item-violation-btn"
                                        data-violation-id="${v.violation_id}">
                                    View
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    const cardsView = `
        <div class="violations-cards">
            ${activeViolations.map(v => {
                const severityConfig = getSeverityConfig(v.severity);
                const statusConfig = getStatusConfig(v.status);
                return `
                    <div class="item-violation-card" data-violation-id="${v.violation_id}">
                        <div class="violation-card-item">${sanitizeHtml(v.rule_id)}</div>
                        <div class="violation-card-status">
                            <span class="badge ${severityConfig.badge}">${severityConfig.icon} ${severityConfig.label}</span>
                            <span class="badge ${statusConfig.badge}">${statusConfig.label}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    return `
        ${tabsHtml}
        <div class="violations-table-container" style="display: block;">
            ${tableView}
        </div>
        <div class="violations-cards-container" style="display: none;">
            ${cardsView}
        </div>
        <style>
            @media (max-width: 768px) {
                .violations-table-container { display: none !important; }
                .violations-cards-container { display: block !important; }
            }
        </style>
    `;
}

/**
 * Attach event listeners for tabs and violation rows/cards
 */
function attachItemDetailListeners() {
    // Tab switching
    document.querySelectorAll('.violations-tab-btn[data-item-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.itemTab;
            if (tab && tab !== activeItemTab) {
                activeItemTab = tab;
                const violationsSection = document.querySelector('.violations-section');
                if (violationsSection) {
                    violationsSection.innerHTML = `
                        <h2>Violations (${itemViolations.length})</h2>
                        ${renderItemViolations()}
                    `;
                    attachItemDetailListeners();
                }
            }
        });
    });

    // View buttons (desktop table)
    document.querySelectorAll('.view-item-violation-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigateTo(`/inspector/violations/${btn.dataset.violationId}`);
        });
    });

    // Violation cards (mobile)
    document.querySelectorAll('.item-violation-card').forEach(card => {
        card.addEventListener('click', () => {
            navigateTo(`/inspector/violations/${card.dataset.violationId}`);
        });
    });
}
