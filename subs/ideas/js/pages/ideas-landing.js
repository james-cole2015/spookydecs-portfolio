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

  // Fetch counts — season counts include only Considering + Planning ideas
  let counts = { Halloween: '—', Christmas: '—', Shared: '—' };
  let workbenchCounts = { Halloween: 0, Christmas: 0, Shared: 0, total: 0 };
  try {
    const ideas = await listIdeas();
    const active = ideas.filter(i => i.status === 'Considering' || i.status === 'Planning');
    counts.Halloween = active.filter(i => i.season === 'Halloween').length;
    counts.Christmas = active.filter(i => i.season === 'Christmas').length;
    counts.Shared    = active.filter(i => i.season === 'Shared').length;
    const wb = ideas.filter(i => i.status === 'Workbench');
    workbenchCounts.Halloween = wb.filter(i => i.season === 'Halloween').length;
    workbenchCounts.Christmas = wb.filter(i => i.season === 'Christmas').length;
    workbenchCounts.Shared    = wb.filter(i => i.season === 'Shared').length;
    workbenchCounts.total     = wb.length;
  } catch {
    // counts stay as dashes — cards still render and are navigable
  }

  const cardsContainer = container.querySelector('#landing-cards');
  if (!cardsContainer) return;

  const wbDesc = workbenchCounts.total > 0
    ? `${workbenchCounts.total} active build${workbenchCounts.total !== 1 ? 's' : ''} in progress.`
    : 'No active builds right now.';

  cardsContainer.innerHTML = `
    ${_seasonCard('Halloween', counts.Halloween, '/list?season=Halloween', workbenchCounts.Halloween)}
    ${_seasonCard('Christmas', counts.Christmas, '/list?season=Christmas', workbenchCounts.Christmas)}
    ${_seasonCard('Shared',    counts.Shared,    '/list?season=Shared',    workbenchCounts.Shared)}
    ${_actionCard({
      label: 'New',
      title: 'Add Idea',
      desc: 'Capture a new decoration idea and start planning.',
      route: '/create',
      accent: true
    })}
    ${_actionCard({
      label: 'Build',
      title: 'Active Builds',
      desc: wbDesc,
      route: '/workbench',
      badge: workbenchCounts.total > 0 ? workbenchCounts.total : null
    })}
    ${_actionCard({
      label: 'Inspo',
      title: 'Inspirations',
      desc: 'Browse saved inspiration images and references.',
      href: '#'
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

function _seasonCard(season, count, route, wbCount) {
  const seasonKey = season.toLowerCase();
  const countLabel = typeof count === 'number'
    ? `${count} idea${count !== 1 ? 's' : ''}`
    : '— ideas';
  const wbBadge = wbCount > 0
    ? `<span class="card-wb-badge">${wbCount} in builds</span>`
    : '';
  return `
    <div class="option-card" data-route="${route}" tabindex="0" role="button">
      <div class="card-label badge badge-season-${seasonKey}" style="width:fit-content">${season}</div>
      <div class="card-title">${season} Ideas</div>
      <div class="card-count">${countLabel}${wbBadge}</div>
    </div>
  `;
}

function _actionCard({ label, title, desc, route, href, accent = false, badge = null }) {
  const dataAttr = route
    ? `data-route="${route}"`
    : `data-href="${href || '#'}"`;
  const badgeHtml = badge != null
    ? `<span class="card-count-badge">${badge}</span>`
    : '';
  return `
    <div class="option-card${accent ? ' card-accent' : ''}" ${dataAttr} tabindex="0" role="button">
      <div class="card-label-row">
        <span class="card-label">${label}</span>
        ${badgeHtml}
      </div>
      <div class="card-title">${title}</div>
      <div class="card-desc">${desc}</div>
    </div>
  `;
}

function _skeletonCards() {
  return Array(6).fill(0).map(() => `
    <div class="option-card" style="pointer-events:none">
      <div style="height:12px;width:60px;background:var(--color-border);border-radius:4px;margin-bottom:12px"></div>
      <div style="height:20px;width:120px;background:var(--color-border);border-radius:4px;margin-bottom:8px"></div>
      <div style="height:14px;width:60px;background:var(--color-bg);border-radius:4px"></div>
    </div>
  `).join('');
}
