/**
 * priority-list.js
 * Issues page — all issues in a card grid.
 *
 * Route: /tracker/priority
 */

const PriorityListPage = (() => {

  let issues   = [];
  let epics    = [];
  let filtered = [];

  let filters = {
    search: '',
    epic:   'all',
    state:  'all',
  };

  // ── Render entry point ─────────────────────────────────────────────────────
  async function render() {
    const app = document.getElementById('app');
    app.innerHTML = buildShell();
    bindToolbar();
    renderSkeletons();
    await load();
  }

  // ── Shell HTML ─────────────────────────────────────────────────────────────
  function buildShell() {
    return `
      <div class="priority-list-page">
        ${buildSubNav()}
        <div class="pl-toolbar">
          <div class="pl-toolbar-left">
            <div class="pl-search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input id="pl-search-input" type="text" placeholder="Search issues…" value="${escHtml(filters.search)}" />
            </div>
            <select id="pl-epic-filter" class="pl-select">
              <option value="all">All epics</option>
            </select>
            <select id="pl-state-filter" class="pl-select">
              <option value="all">All states</option>
              <option value="backlog">Backlog</option>
              <option value="planned">Planned</option>
              <option value="open">Open</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
            <span id="pl-count" class="pl-count"></span>
          </div>
        </div>
        <div class="pl-body" id="pl-body"></div>
      </div>
    `;
  }

  function buildSubNav() {
    return `
      <nav class="nav">
        <span class="nav-logo"><a href="/tracker" class="nav-logo-link" id="nav-home-btn">Tracker</a></span>
        <div class="nav-links">
          <a class="nav-link active" href="/tracker/priority">Issues</a>
          <a class="nav-link" href="/tracker/epics">Epics</a>
          <a class="nav-link" href="/tracker/new-issue">+ Issue</a>
        </div>
      </nav>
    `;
  }

  // ── Data loading ───────────────────────────────────────────────────────────
  async function load() {
    try {
      const [issueData, epicData] = await Promise.all([
        TrackerApi.issues.list(),
        TrackerApi.epics.list(),
      ]);

      issues = issueData?.items || issueData || [];
      epics  = epicData?.items  || epicData  || [];

      populateEpicFilter();
      applyFilters();
    } catch (err) {
      showError(err.message);
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  function applyFilters() {
    const { search, epic, state } = filters;
    const q = search.toLowerCase();

    filtered = issues.filter(issue => {
      if (q && !issue.title.toLowerCase().includes(q) && !String(issue.issue_number).includes(q)) return false;
      if (epic  !== 'all' && issue.parent_epic !== epic)  return false;
      if (state !== 'all' && issue.state       !== state) return false;
      return true;
    });

    renderCards();
    document.getElementById('pl-count').textContent = `${filtered.length} issue${filtered.length !== 1 ? 's' : ''}`;
  }

  // ── Epic filter population ─────────────────────────────────────────────────
  function populateEpicFilter() {
    const sel = document.getElementById('pl-epic-filter');
    if (!sel) return;
    epics.forEach(epic => {
      const opt = document.createElement('option');
      opt.value = epic.epic_name || epic.id;
      opt.textContent = epic.title;
      sel.appendChild(opt);
    });
  }

  // ── Card rendering ─────────────────────────────────────────────────────────
  function renderCards() {
    const body = document.getElementById('pl-body');
    if (!body) return;

    if (filtered.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No issues found</div>
          <div>Try adjusting your filters.</div>
        </div>`;
      return;
    }

    body.innerHTML = `<div class="pl-grid">${filtered.map(buildCard).join('')}</div>`;

    body.querySelectorAll('.pl-card[data-href]').forEach(card => {
      card.addEventListener('click', () => Router.navigate(card.dataset.href));
    });
  }

  function buildCard(issue) {
    const stateClass = {
      'backlog':   'badge-backlog',
      'planned':   'badge-planned',
      'open':      'badge-in-progress',
      'blocked':   'badge-blocked',
      'completed': 'badge-done',
    }[issue.state] || 'badge-backlog';

    const epicName = issue.parent_epic || null;
    const issueUrl = `/epics/${encodeURIComponent(epicName || 'backlog')}/${issue.issue_number}`;

    const taskVals  = Object.values(issue.tasks || {});
    const taskTotal = taskVals.length;
    const taskDone  = taskVals.filter(t => t.state === 'completed').length;

    return `
      <div class="pl-card" data-href="${escHtml(issueUrl)}">
        <div class="pl-card-header">
          <span class="pl-card-number">#${issue.issue_number}</span>
          <span class="badge ${stateClass}">${issue.state || 'backlog'}</span>
        </div>
        <div class="pl-card-title">${escHtml(issue.title)}</div>
        <div class="pl-card-footer">
          ${epicName ? `<span class="pl-card-epic">${escHtml(epicName)}</span>` : ''}
          ${taskTotal > 0 ? `<span class="pl-card-tasks">${taskDone}/${taskTotal} ✓</span>` : ''}
        </div>
      </div>
    `;
  }

  // ── Skeleton loading ───────────────────────────────────────────────────────
  function renderSkeletons() {
    const body = document.getElementById('pl-body');
    if (!body) return;
    body.innerHTML = `<div class="pl-grid">${
      Array.from({ length: 9 }, (_, i) =>
        `<div class="pl-card-skeleton" style="animation-delay:${i * 40}ms"></div>`
      ).join('')
    }</div>`;
  }

  // ── Toolbar bindings ───────────────────────────────────────────────────────
  function bindToolbar() {
    document.addEventListener('input', e => {
      if (e.target.id === 'pl-search-input') {
        filters.search = e.target.value;
        applyFilters();
      }
    });

    document.addEventListener('change', e => {
      if (e.target.id === 'pl-epic-filter')  { filters.epic  = e.target.value; applyFilters(); }
      if (e.target.id === 'pl-state-filter') { filters.state = e.target.value; applyFilters(); }
    });

    document.addEventListener('click', e => {
      if (e.target.id === 'nav-home-btn') {
        e.preventDefault();
        Router.navigate('/');
      }
    });
  }

  // ── Error state ────────────────────────────────────────────────────────────
  function showError(msg) {
    const body = document.getElementById('pl-body');
    if (body) body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Failed to load issues</div>
        <div>${escHtml(msg)}</div>
      </div>`;
  }

  // ── Utilities ──────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return { render };
})();
