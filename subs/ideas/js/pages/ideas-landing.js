// Ideas Landing Page — Hub with season cards

import { listIdeas } from '../utils/ideas-api.js';
import { navigateTo } from '../utils/router.js';

export async function renderIdeasLanding(container) {
  // Show skeleton while fetching
  container.innerHTML = `
    <div class="landing-page">
      <div class="landing-header">
        <h1>Ideas</h1>
        <p>Browse, plan, and track decoration ideas by season.</p>
      </div>
      <div class="option-cards" id="landing-cards">
        ${_skeletonCards()}
      </div>
    </div>
  `;

  // Fetch counts
  let counts = { Halloween: '—', Christmas: '—', Shared: '—' };
  try {
    const ideas = await listIdeas();
    counts.Halloween = ideas.filter(i => i.season === 'Halloween').length;
    counts.Christmas = ideas.filter(i => i.season === 'Christmas').length;
    counts.Shared    = ideas.filter(i => i.season === 'Shared').length;
  } catch {
    // counts stay as dashes — cards still render and are navigable
  }

  const cardsContainer = container.querySelector('#landing-cards');
  if (!cardsContainer) return;

  cardsContainer.innerHTML = `
    ${_seasonCard('Halloween', counts.Halloween, '/list?season=Halloween')}
    ${_seasonCard('Christmas', counts.Christmas, '/list?season=Christmas')}
    ${_seasonCard('Shared',    counts.Shared,    '/list?season=Shared')}
    ${_actionCard({
      id: 'create',
      label: 'New',
      title: 'Add Idea',
      desc: 'Capture a new decoration idea and start planning.',
      route: '/create',
      accent: true
    })}
    ${_actionCard({
      id: 'workbench',
      label: 'Tool',
      title: 'Workbench',
      desc: 'View items currently in the build pipeline.',
      route: null,
      href: _getWorkbenchUrl()
    })}
  `;

  // Attach click handlers
  cardsContainer.querySelectorAll('[data-route]').forEach(card => {
    card.addEventListener('click', () => navigateTo(card.dataset.route));
  });

  cardsContainer.querySelectorAll('[data-href]').forEach(card => {
    card.addEventListener('click', () => {
      window.location.href = card.dataset.href;
    });
  });
}

function _seasonCard(season, count, route) {
  const seasonKey = season.toLowerCase();
  const countLabel = typeof count === 'number'
    ? `${count} idea${count !== 1 ? 's' : ''}`
    : '— ideas';
  return `
    <div class="option-card" data-route="${route}" tabindex="0" role="button">
      <div class="card-label badge badge-season-${seasonKey}" style="width:fit-content">${season}</div>
      <div class="card-title">${season} Ideas</div>
      <div class="card-count">${countLabel}</div>
    </div>
  `;
}

function _actionCard({ id, label, title, desc, route, href, accent = false }) {
  const dataAttr = route
    ? `data-route="${route}"`
    : `data-href="${href || '#'}"`;
  return `
    <div class="option-card${accent ? ' card-accent' : ''}" ${dataAttr} tabindex="0" role="button">
      <div class="card-label">${label}</div>
      <div class="card-title">${title}</div>
      <div class="card-desc">${desc}</div>
    </div>
  `;
}

function _skeletonCards() {
  return Array(5).fill(0).map(() => `
    <div class="option-card" style="pointer-events:none">
      <div style="height:12px;width:60px;background:var(--color-border);border-radius:4px;margin-bottom:12px"></div>
      <div style="height:20px;width:120px;background:var(--color-border);border-radius:4px;margin-bottom:8px"></div>
      <div style="height:14px;width:60px;background:var(--color-bg);border-radius:4px"></div>
    </div>
  `).join('');
}

function _getWorkbenchUrl() {
  // Update this to the workbench subdomain URL once known
  return '/workbench';
}
