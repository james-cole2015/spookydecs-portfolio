// Ideas List Page — Season tabs + filters + card grid

import { listIdeas } from '../utils/ideas-api.js';
import { stateManager } from '../utils/state.js';
import { navigateTo } from '../utils/router.js';
import { renderFilterBar } from '../components/FilterBar.js';
import { renderIdeaCards } from '../components/IdeaCard.js';
import { showToast } from '../shared/toast.js';

let _allIdeas = [];
let _unsubscribe = null;

export async function renderIdeasList(container, initialSeason) {
  // Clean up previous subscription
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

  // Apply initial season from route param if provided
  if (initialSeason) {
    stateManager.setState({ season: initialSeason });
  }

  container.innerHTML = `
    <div class="list-page">
      <div class="list-page-header">
        <button class="btn-back" id="ideas-back-btn" aria-label="Back to landing">&#8592; Back</button>
      </div>
      <div id="filter-bar-container"></div>
      <div class="ideas-grid-container">
        <div class="ideas-grid" id="ideas-grid">
          <div class="empty-state" style="grid-column:1/-1">
            <div class="loading-spinner" style="margin:0 auto"></div>
          </div>
        </div>
      </div>
    </div>
    <button class="fab" id="ideas-fab" title="Add Idea" aria-label="Add new idea">+</button>
  `;

  container.querySelector('#ideas-fab').addEventListener('click', () => navigateTo('/create'));
  container.querySelector('#ideas-back-btn').addEventListener('click', () => navigateTo('/'));

  // Fetch all ideas once
  try {
    _allIdeas = await listIdeas();
  } catch (err) {
    console.error('Failed to load ideas:', err);
    showToast('Failed to load ideas', 'error');
    container.querySelector('#ideas-grid').innerHTML = `
      <div class="error-container" style="grid-column:1/-1">
        <div class="error-content">
          <h2>Failed to load</h2>
          <p>${err.message}</p>
          <button class="btn btn-secondary" onclick="window.location.reload()">Retry</button>
        </div>
      </div>
    `;
    return;
  }

  // Initial render
  _renderAll(container);

  // Subscribe to state changes and re-render
  _unsubscribe = stateManager.subscribe(() => _renderAll(container));
}

function _renderAll(container) {
  const state = stateManager.getState();
  const filterBar = container.querySelector('#filter-bar-container');
  const grid = container.querySelector('#ideas-grid');

  if (!filterBar || !grid) return;

  const filtered = _filter(_allIdeas, state);
  const sorted = _sort(filtered, state.sort);

  renderFilterBar(filterBar, state, patch => stateManager.setState(patch), sorted.length);
  renderIdeaCards(grid, sorted);
}

function _filter(ideas, state) {
  return ideas.filter(idea => {
    if (idea.season !== state.season) return false;
    if (state.status !== 'all' && idea.status !== state.status) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const inTitle = (idea.title || '').toLowerCase().includes(q);
      const inDesc  = (idea.description || '').toLowerCase().includes(q);
      const inTags  = (idea.tags || []).some(t => t.toLowerCase().includes(q));
      if (!inTitle && !inDesc && !inTags) return false;
    }
    return true;
  });
}

function _sort(ideas, sort) {
  const arr = [...ideas];
  switch (sort) {
    case 'oldest':
      return arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case 'az':
      return arr.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    default: // newest
      return arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}
