/**
 * deployment-historical.js
 * Orchestration for the Historical Deployments page.
 * Handles: routing, data fetching, state, event binding, URL sync.
 */

import {
  listHistoricalDeployments,
  getHistoricalDeployment
} from '../utils/deployment-api.js';

import {
  renderSidebar,
  renderEmptyState,
  renderLoading,
  renderError,
  renderDetail
} from '../components/historical/HistoricalView.js';

// ─── State ────────────────────────────────────────────────────────────────

let _deployments = [];
let _selectedId = null;
let _isMobile = false;

function isMobile() {
  return window.innerWidth <= 768;
}

// ─── Entry Point ──────────────────────────────────────────────────────────

export async function renderHistoricalPage(deploymentId = null) {
  const app = document.getElementById('app');
  _isMobile = isMobile();

  app.innerHTML = `
    <div class="historical-page${deploymentId && _isMobile ? ' detail-active' : ''}" id="historical-page">
      <aside class="historical-sidebar" id="historical-sidebar">
        <div class="historical-loading">⏳ Loading...</div>
      </aside>
      <main class="historical-main" id="historical-main">
        ${deploymentId ? renderLoading() : renderEmptyState()}
      </main>
    </div>
  `;

  // Load deployment list
  try {
    const res = await listHistoricalDeployments();
    _deployments = res.data || [];
  } catch (err) {
    console.error('[deployment-historical] Failed to load list:', err);
    _deployments = [];
  }

  _selectedId = deploymentId || null;
  _renderSidebar();
  _bindSidebarEvents();
  _bindResizeHandler();

  // Auto-load detail if ID was passed via URL
  if (deploymentId) {
    await _loadDetail(deploymentId);
  } else {
    _bindBreadcrumbEvents();
  }
}

// ─── Sidebar ──────────────────────────────────────────────────────────────

function _renderSidebar() {
  const sidebar = document.getElementById('historical-sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = renderSidebar(_deployments, _selectedId);
  _bindSidebarEvents();
}

function _bindSidebarEvents() {
  const list = document.getElementById('deployment-list');
  if (!list) return;

  list.querySelectorAll('.historical-deployment-item').forEach(el => {
    el.addEventListener('click', () => _onSelectDeployment(el.dataset.id));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') _onSelectDeployment(el.dataset.id);
    });
  });
}

async function _onSelectDeployment(id) {
  if (id === _selectedId) return;
  _selectedId = id;

  // Update URL without full navigation
  const newUrl = `/deployments/historical/${id}`;
  window.history.pushState({ deploymentId: id }, '', newUrl);

  // On mobile, hide sidebar and show detail
  const page = document.getElementById('historical-page');
  if (page && isMobile()) {
    page.classList.add('detail-active');
  }

  _renderSidebar();
  await _loadDetail(id);
}

// ─── Detail Panel ─────────────────────────────────────────────────────────

async function _loadDetail(id) {
  const main = document.getElementById('historical-main');
  if (!main) return;

  main.innerHTML = renderLoading();

  try {
    const res = await getHistoricalDeployment(id);
    const data = res.data;
    main.innerHTML = renderDetail(data);
    _bindDetailEvents();
  } catch (err) {
    console.error('[deployment-historical] Failed to load detail:', err);
    main.innerHTML = renderError(err.message);
  }
}

function _bindBreadcrumbEvents() {
  document.querySelectorAll('.breadcrumb-link[data-path]').forEach(link => {
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const { navigate } = await import('../utils/router.js');
      navigate(link.dataset.path);
    });
  });
}

function _bindDetailEvents() {
  _bindBreadcrumbEvents();

  // Mobile back button
  const backBtn = document.getElementById('mobile-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', _onMobileBack);
  }

  // Zone collapse toggles
  document.querySelectorAll('.historical-zone-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.historical-zone-section');
      if (section) section.classList.toggle('collapsed');
    });
  });
}

function _onMobileBack() {
  _selectedId = null;
  const page = document.getElementById('historical-page');
  if (page) page.classList.remove('detail-active');

  const main = document.getElementById('historical-main');
  if (main) main.innerHTML = renderEmptyState();

  window.history.pushState({}, '', '/deployments/historical');
  _renderSidebar();
}

// ─── Resize Handler ───────────────────────────────────────────────────────

function _bindResizeHandler() {
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nowMobile = isMobile();
      if (nowMobile !== _isMobile) {
        _isMobile = nowMobile;
        // If switching to desktop while in mobile-detail mode, restore layout
        if (!nowMobile) {
          const page = document.getElementById('historical-page');
          if (page) page.classList.remove('detail-active');
        }
      }
    }, 150);
  });
}