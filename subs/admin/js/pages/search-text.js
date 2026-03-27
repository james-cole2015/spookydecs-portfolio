// Search Text Manager Page
import { searchItems, getItemSearchText, updateItemSearchText, triggerReindex } from '../utils/admin-api.js';
import { navigate } from '../utils/router.js';

let _debounceTimer = null;

export async function renderSearchText(config) {
    const container = document.getElementById('app-container');
    container.innerHTML = '<div style="text-align: center; padding: 3rem;">Loading...</div>';

    const itemsBaseUrl = (await window.SpookyConfig.get()).INV_ADMIN_URL || '';

    container.innerHTML = `
        <div class="st-page">
            <div class="st-header">
                <button class="st-back-btn" id="st-back">← Back to Dashboard</button>
                <h1 class="page-title">Iris Search Text</h1>
                <p class="st-subtitle">Edit an item's search text to improve Iris vector search results, then reindex.</p>
            </div>

            <div class="st-layout">
                <div class="st-sidebar">
                    <div class="st-search-box">
                        <input
                            type="text"
                            id="st-search-input"
                            class="st-input"
                            placeholder="Search items..."
                            autocomplete="off"
                        />
                    </div>
                    <div id="st-results" class="st-results"></div>
                </div>

                <div class="st-main" id="st-main">
                    <div class="st-empty-state">
                        <p>Select an item to edit its search text.</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('st-back').addEventListener('click', () => navigate('/'));

    const searchInput = document.getElementById('st-search-input');
    searchInput.addEventListener('input', () => {
        clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(() => _runSearch(searchInput.value.trim(), itemsBaseUrl), 300);
    });
}

async function _runSearch(query, itemsBaseUrl) {
    const resultsEl = document.getElementById('st-results');
    if (!query) {
        resultsEl.innerHTML = '';
        return;
    }

    resultsEl.innerHTML = '<div class="st-results-loading">Searching...</div>';

    try {
        const items = await searchItems(query);
        if (!items || items.length === 0) {
            resultsEl.innerHTML = '<div class="st-results-empty">No items found.</div>';
            return;
        }

        resultsEl.innerHTML = items.map(item => `
            <div class="st-result-item" data-id="${_esc(item.id)}">
                <span class="st-result-name">${_esc(item.short_name || item.id)}</span>
                <span class="st-result-id">${_esc(item.id)}</span>
            </div>
        `).join('');

        resultsEl.querySelectorAll('.st-result-item').forEach(el => {
            el.addEventListener('click', () => _loadItem(el.dataset.id, itemsBaseUrl));
        });
    } catch (err) {
        resultsEl.innerHTML = `<div class="st-results-error">Search failed: ${_esc(err.message)}</div>`;
    }
}

async function _loadItem(itemId, itemsBaseUrl) {
    const mainEl = document.getElementById('st-main');
    mainEl.innerHTML = '<div class="st-loading">Loading item...</div>';

    document.querySelectorAll('.st-result-item').forEach(el => {
        el.classList.toggle('st-result-item--active', el.dataset.id === itemId);
    });

    try {
        const item = await getItemSearchText(itemId);
        _renderItemEditor(item, itemsBaseUrl);
    } catch (err) {
        mainEl.innerHTML = `<div class="st-error">Failed to load item: ${_esc(err.message)}</div>`;
    }
}

function _renderItemEditor(item, itemsBaseUrl) {
    const mainEl = document.getElementById('st-main');
    const itemUrl = itemsBaseUrl ? `${itemsBaseUrl}/${encodeURIComponent(item.item_id)}` : null;

    mainEl.innerHTML = `
        <div class="st-editor">
            <div class="st-item-meta">
                <span class="st-id-chip">${_esc(item.item_id)}</span>
                <span class="st-item-name">${_esc(item.short_name)}</span>
                ${item.season ? `<span class="st-season-badge">${_esc(item.season)}</span>` : ''}
                ${itemUrl ? `<a href="${itemUrl}" target="_blank" rel="noopener noreferrer" class="st-item-link">View item →</a>` : ''}
            </div>

            <label class="st-label" for="st-textarea">search_text</label>
            <textarea id="st-textarea" class="st-textarea">${_esc(item.search_text || '')}</textarea>

            <div class="st-actions">
                <div class="st-action-buttons">
                    <button class="st-btn st-btn--primary" id="st-save-btn">Save</button>
                    <button class="st-btn st-btn--secondary" id="st-reindex-btn">Reindex</button>
                </div>
                <div id="st-status" class="st-status"></div>
            </div>
        </div>
    `;

    document.getElementById('st-save-btn').addEventListener('click', () => _save(item.item_id));
    document.getElementById('st-reindex-btn').addEventListener('click', _reindex);
}

async function _save(itemId) {
    const textarea = document.getElementById('st-textarea');
    const statusEl = document.getElementById('st-status');
    const saveBtn = document.getElementById('st-save-btn');

    saveBtn.disabled = true;
    _setStatus(statusEl, 'loading', 'Saving...');

    try {
        await updateItemSearchText(itemId, textarea.value);
        _setStatus(statusEl, 'success', 'Saved.');
    } catch (err) {
        _setStatus(statusEl, 'error', `Save failed: ${err.message}`);
    } finally {
        saveBtn.disabled = false;
    }
}

async function _reindex() {
    const statusEl = document.getElementById('st-status');
    const reindexBtn = document.getElementById('st-reindex-btn');

    reindexBtn.disabled = true;
    _setStatus(statusEl, 'loading', 'Reindexing...');

    try {
        const result = await triggerReindex();
        _setStatus(
            statusEl,
            'success',
            `Indexed ${result.indexed_count} items (${result.image_embedded_count} image, ${result.text_embedded_count} text).`
        );
    } catch (err) {
        _setStatus(statusEl, 'error', `Reindex failed: ${err.message}`);
    } finally {
        reindexBtn.disabled = false;
    }
}

function _setStatus(el, type, message) {
    el.className = `st-status st-status--${type}`;
    el.textContent = message;
}

function _esc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
