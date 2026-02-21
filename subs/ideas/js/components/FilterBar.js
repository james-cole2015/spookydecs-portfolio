// FilterBar — Status, search, and sort controls

import { STATUSES, SORT_OPTIONS } from '../utils/ideas-config.js';

let _debounceTimer = null;

/**
 * Render filter bar into container.
 * @param {HTMLElement} container
 * @param {{ status, sort, search }} state - current filter state
 * @param {function} onChange - called with { status?, sort?, search? } patch on change
 * @param {number} resultCount - number of visible ideas (shown in corner)
 */
export function renderFilterBar(container, state, onChange, resultCount) {
  const statusOptions = [
    '<option value="all">All Statuses</option>',
    ...STATUSES.map(s => `<option value="${s}"${state.status === s ? ' selected' : ''}>${s}</option>`)
  ].join('');

  const sortOptions = SORT_OPTIONS.map(opt =>
    `<option value="${opt.value}"${state.sort === opt.value ? ' selected' : ''}>${opt.label}</option>`
  ).join('');

  container.innerHTML = `
    <div class="filter-bar">
      <span class="filter-bar-label">Filter:</span>
      <select class="filter-select" id="filter-status" aria-label="Status filter">
        ${statusOptions}
      </select>
      <input
        class="filter-search"
        id="filter-search"
        type="search"
        placeholder="Search title, tags…"
        value="${escapeAttr(state.search)}"
        aria-label="Search ideas"
      >
      <select class="filter-select" id="filter-sort" aria-label="Sort order">
        ${sortOptions}
      </select>
      <span class="filter-results">${resultCount} idea${resultCount !== 1 ? 's' : ''}</span>
    </div>
  `;

  container.querySelector('#filter-status').addEventListener('change', e => {
    onChange({ status: e.target.value });
  });

  container.querySelector('#filter-sort').addEventListener('change', e => {
    onChange({ sort: e.target.value });
  });

  container.querySelector('#filter-search').addEventListener('input', e => {
    clearTimeout(_debounceTimer);
    const value = e.target.value;
    _debounceTimer = setTimeout(() => onChange({ search: value }), 300);
  });
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
