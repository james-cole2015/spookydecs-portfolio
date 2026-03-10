// Storage Statistics Page

import { storageAPI, itemsAPI } from '../utils/storage-api.js';
import { formatStorageUnit } from '../utils/storage-config.js';
import { showError } from '../shared/toast.js';
import { renderBreadcrumb } from '../shared/breadcrumb.js';

export async function renderStorageStatistics() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="statistics-page">
      <div id="breadcrumb"></div>
      <div class="stats-page-header">
        <h1>📊 Statistics</h1>
      </div>
      <div id="stats-content">
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading statistics...</p>
        </div>
      </div>
    </div>
  `;

  renderBreadcrumb(document.getElementById('breadcrumb'), [
    { label: 'Storage', route: '/' },
    { label: 'Statistics' }
  ]);

  try {
    const [storageData, itemsData] = await Promise.all([
      storageAPI.getAll({}),
      itemsAPI.getAll({})
    ]);

    const storage = storageData.map(unit => formatStorageUnit(unit));
    const stats = calculateStats(storage, itemsData);

    document.getElementById('stats-content').innerHTML = renderStatsContent(stats);
  } catch (error) {
    console.error('Failed to load statistics:', error);
    showError('Failed to load statistics');
    document.getElementById('stats-content').innerHTML =
      '<p style="padding:20px;color:#64748b;">Failed to load statistics.</p>';
  }
}

function calculateStats(storage, items) {
  const packedItems = items.filter(item => item.packing_data?.packing_status !== false);
  const packedStorage = storage.filter(unit => unit.packed !== false);

  const stats = {
    total_storage: storage.length,
    packed_storage: packedStorage.length,
    total_items: items.length,
    packed_items: packedItems.length,
    by_season: {}
  };

  ['Halloween', 'Christmas', 'Shared'].forEach(season => {
    const seasonStorage = storage.filter(unit => unit.season === season);
    const seasonItems = items.filter(item => item.season === season);
    const packedSeasonItems = seasonItems.filter(item => item.packing_data?.packing_status !== false);

    if (seasonStorage.length > 0 || seasonItems.length > 0) {
      stats.by_season[season] = {
        storage: seasonStorage.length,
        items: seasonItems.length,
        packed_items: packedSeasonItems.length
      };
    }
  });

  return stats;
}

function getSeasonIcon(season) {
  const icons = { 'Halloween': '🎃', 'Christmas': '🎄', 'Shared': '🔧' };
  return icons[season] || '📦';
}

function renderStatsContent(stats) {
  const unpackedStorage = stats.total_storage - stats.packed_storage;
  const unpackedItems = stats.total_items - stats.packed_items;

  return `
    <div class="stats-section">
      <h3 class="stats-section-title">Overview</h3>
      <div class="stats-grid">
        <div class="stat-card${unpackedStorage > 0 ? ' stat-warning' : ''}">
          <div class="stat-icon">📦</div>
          <div class="stat-content">
            <div class="stat-value">${stats.total_storage.toLocaleString()}</div>
            <div class="stat-label">Storage Units</div>
            <div class="stat-sublabel">${unpackedStorage > 0 ? `${unpackedStorage} unpacked` : 'All packed'}</div>
          </div>
        </div>
        <div class="stat-card${unpackedItems > 0 ? ' stat-alert' : ''}">
          <div class="stat-icon">🏷️</div>
          <div class="stat-content">
            <div class="stat-value">${stats.total_items.toLocaleString()}</div>
            <div class="stat-label">Items</div>
            <div class="stat-sublabel">${unpackedItems > 0 ? `${unpackedItems} need packing` : 'All packed'}</div>
          </div>
        </div>
      </div>
    </div>

    ${Object.keys(stats.by_season).length > 0 ? `
      <div class="stats-section">
        <h3 class="stats-section-title">By Season</h3>
        <div class="season-stats-list">
          ${Object.entries(stats.by_season).map(([season, data]) => {
            const unpackedSeason = data.items - data.packed_items;
            return `
            <div class="season-stat-item">
              <div class="season-stat-header">
                <span class="season-icon">${getSeasonIcon(season)}</span>
                <span class="season-name">${season}</span>
              </div>
              <div class="season-stat-values">
                <div class="season-stat-value">
                  <span class="season-stat-number">${data.storage || 0}</span>
                  <span class="season-stat-label">storage</span>
                </div>
                <div class="season-stat-value">
                  <span class="season-stat-number">${data.packed_items} / ${data.items}</span>
                  <span class="season-stat-label">items packed</span>
                </div>
                ${unpackedSeason > 0 ? `
                  <div class="season-stat-value season-stat-warning">
                    <span class="season-stat-number">${unpackedSeason}</span>
                    <span class="season-stat-label">unpacked</span>
                  </div>
                ` : ''}
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    ` : ''}
  `;
}
