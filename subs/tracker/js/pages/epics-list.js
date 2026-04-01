/**
 * epics-list.js
 * Epics overview page — all epics grouped by state band.
 *
 * Bands (in order):
 *   Active    — state = active
 *   Planned   — state = planned | planning
 *   Completed — state = completed
 *
 * Data flow:
 *   1. GET /epics — all epic records
 *   2. GET /issues for each epic to calculate progress
 *   3. Render as cards with progress bar
 */

const EpicsListPage = (() => {

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stateCssName(state) {
    return {
      active:            'in-progress',
      planned:           'planned',
      planning:          'planning',
      planning_complete: 'planned',
      unplanned:         'not-planned',
      completed:         'completed',
    }[state] || 'planning';
  }

  function stateLabel(state) {
    return {
      active:            'Active',
      planned:           'Planned',
      planning:          'Planning',
      planning_complete: 'Planned',
      unplanned:         'Future',
      completed:         'Completed',
    }[state] || state;
  }

  // ── Render entry point ───────────────────────────────────────────────────────
  async function render() {
    const app = document.getElementById('app');
    app.innerHTML = buildShell();
    renderSkeletons();
    await load();
  }

  function buildShell() {
    return `
      <div class="epics-list-page">
        ${buildSubNav()}
        <div class="el-body" id="el-body"></div>
      </div>
    `;
  }

  function buildSubNav() {
    return `
      <nav class="nav">
        <span class="nav-logo"><a href="/tracker" class="nav-logo-link" id="nav-home-btn">Tracker</a></span>
        <div class="nav-links">
          <a class="nav-link" href="/tracker/priority">Priority</a>
          <a class="nav-link" href="/tracker/timeline">Timeline</a>
          <a class="nav-link active" href="/tracker/epics">Epics</a>
          <a class="nav-link" href="/tracker/new-issue">+ Issue</a>
        </div>
      </nav>
    `;
  }

  function renderSkeletons() {
    const body = document.getElementById('el-body');
    if (!body) return;
    const skels = Array.from({ length: 4 }, () =>
      `<div class="el-skeleton-card"></div>`
    ).join('');
    body.innerHTML = `
      <div class="el-band">
        <div class="el-band-label">Loading…</div>
        <div class="el-cards">${skels}</div>
      </div>
    `;
  }

  async function load() {
    try {
      const epicData = await TrackerApi.epics.list();
      const epics = epicData?.items || epicData || [];

      // Fetch issue counts for all epics in parallel
      const countResults = await Promise.allSettled(
        epics.map(epic => {
          const name = epic.epic_name || epic.id;
          return TrackerApi.issues.list({ epic: name }).then(d => ({
            epicName: name,
            items: d?.items || d || [],
          }));
        })
      );

      const countByEpic = {};
      countResults.forEach(r => {
        if (r.status === 'fulfilled') {
          const { epicName, items } = r.value;
          countByEpic[epicName] = {
            total: items.length,
            done:  items.filter(i => i.state === 'completed').length,
          };
        }
      });

      const merged = epics.map(epic => {
        const name   = epic.epic_name || epic.id;
        const counts = countByEpic[name];
        return { ...epic, epicName: name, total: counts?.total ?? null, done: counts?.done ?? null };
      });

      renderBands(merged);
    } catch (err) {
      showError(err.message || 'Failed to load epics');
    }
  }

  function renderBands(epics) {
    const body = document.getElementById('el-body');
    if (!body) return;

    const bands = [
      { label: 'Active',    filter: e => e.state === 'active' },
      { label: 'Planned',   filter: e => e.state === 'planning_complete' || e.state === 'planned' || e.state === 'planning' },
      { label: 'Future',    filter: e => e.state === 'unplanned' },
      { label: 'Completed', filter: e => e.state === 'completed' },
    ];

    let html = '';
    bands.forEach(({ label, filter }) => {
      const items = epics.filter(filter);
      if (!items.length) return;
      html += buildBand(label, items);
    });

    if (!html) {
      html = `<div class="empty-state"><div class="empty-state-title">No epics yet</div></div>`;
    }

    body.innerHTML = html;
    bindCardLinks();
    bindNavLinks();
  }

  function buildBand(label, items) {
    return `
      <div class="el-band">
        <div class="el-band-label">
          ${escHtml(label)}
          <span class="el-band-count">${items.length}</span>
        </div>
        <div class="el-cards">
          ${items.map(buildEpicCard).join('')}
        </div>
      </div>
    `;
  }

  function buildEpicCard(epic) {
    const progressHtml = epic.total !== null ? buildProgressBar(epic.done, epic.total) : '';
    const dueHtml = epic.due_date ? `<div class="el-card-due">Due ${escHtml(epic.due_date)}</div>` : '';

    return `
      <a class="el-card" href="/tracker/epics/${escHtml(epic.epicName)}" data-slug="${escHtml(epic.epicName)}">
        <div class="el-card-header">
          <span class="el-card-name">${escHtml(epic.title)}</span>
          <span class="badge badge-${stateCssName(epic.state)}">${stateLabel(epic.state)}</span>
        </div>
        ${epic.description ? `<div class="el-card-desc">${escHtml(epic.description)}</div>` : ''}
        ${dueHtml}
        ${progressHtml}
      </a>
    `;
  }

  function buildProgressBar(done, total) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return `
      <div class="el-progress">
        <div class="el-progress-track">
          <div class="el-progress-bar" style="width:${pct}%"></div>
        </div>
        <span class="el-progress-label">${done} / ${total} done</span>
      </div>
    `;
  }

  function bindCardLinks() {
    document.querySelectorAll('.el-card[data-slug]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        Router.navigate(`/epics/${el.dataset.slug}`);
      });
    });
  }

  function bindNavLinks() {
    document.getElementById('nav-home-btn')?.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate('/');
    });
  }

  function showError(msg) {
    const body = document.getElementById('el-body');
    if (!body) return;
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Failed to load epics</div>
        <div>${escHtml(msg)}</div>
      </div>
    `;
  }

  return { render };
})();
