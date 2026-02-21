// TabBar — Season filter tabs

import { SEASONS } from '../utils/ideas-config.js';

/**
 * Render season tab bar into container.
 * @param {HTMLElement} container
 * @param {string} activeSeason - currently selected season
 * @param {function} onChange - called with new season string on tab click
 */
export function renderTabBar(container, activeSeason, onChange) {
  container.innerHTML = `
    <div class="tab-bar" role="tablist">
      ${SEASONS.map(season => `
        <button
          class="tab-bar-item${season === activeSeason ? ' active' : ''}"
          data-season="${season}"
          role="tab"
          aria-selected="${season === activeSeason}"
        >${season}</button>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.tab-bar-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const season = btn.dataset.season;
      if (season !== activeSeason) onChange(season);
    });
  });
}
