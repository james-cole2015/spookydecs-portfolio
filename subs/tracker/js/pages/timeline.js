/**
 * timeline.js
 * Timeline page — simple list of all active epics (state != completed).
 * Each epic is clickable and routes to epic detail.
 */

const TimelinePage = (() => {

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stateLabel(state) {
    return {
      active:   'Active',
      planned:  'Planned',
      planning: 'Planning',
    }[state] || state;
  }

  function stateCssName(state) {
    return {
      active:   'in-progress',
      planned:  'planned',
      planning: 'planning',
    }[state] || 'planning';
  }

  async function render() {
    const app = document.getElementById('app');
    app.innerHTML = buildShell();
    await load();
  }

  function buildShell() {
    return `
      <div class="timeline-page">
        ${buildSubNav()}
        <div class="tl-body" id="tl-body">
          <div class="tl-loading">Loading…</div>
        </div>
      </div>
    `;
  }

  function buildSubNav() {
    return `
      <nav class="nav">
        <span class="nav-logo"><a href="/tracker" class="nav-logo-link" id="nav-home-btn">Tracker</a></span>
        <div class="nav-links">
          <a class="nav-link" href="/tracker/priority">Priority</a>
          <a class="nav-link active" href="/tracker/timeline">Timeline</a>
          <a class="nav-link" href="/tracker/epics">Epics</a>
          <a class="nav-link" href="/tracker/new-issue">+ Issue</a>
        </div>
      </nav>
    `;
  }

  async function load() {
    const body = document.getElementById('tl-body');
    try {
      const epicData = await TrackerApi.epics.list();
      const all   = epicData?.items || epicData || [];
      const active = all.filter(e => e.state !== 'completed');

      if (!active.length) {
        body.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-title">No active epics</div>
            <div>All epics are completed or none exist yet.</div>
          </div>`;
        return;
      }

      body.innerHTML = `
        <div class="tl-list">
          <div class="tl-header">Active Epics <span class="tl-count">${active.length}</span></div>
          ${active.map(buildEpicRow).join('')}
        </div>
      `;

      body.querySelectorAll('.tl-row[data-slug]').forEach(row => {
        row.addEventListener('click', () => {
          Router.navigate(`/epics/${row.dataset.slug}`);
        });
      });

      document.getElementById('nav-home-btn')?.addEventListener('click', e => {
        e.preventDefault();
        Router.navigate('/');
      });

    } catch (err) {
      body.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Failed to load timeline</div>
          <div>${escHtml(err.message)}</div>
        </div>`;
    }
  }

  function buildEpicRow(epic) {
    const slug = epic.epic_name || epic.id;
    const due  = epic.due_date ? `<span class="tl-due">Due ${escHtml(epic.due_date)}</span>` : '';
    return `
      <div class="tl-row" data-slug="${escHtml(slug)}">
        <div class="tl-row-left">
          <span class="badge badge-${stateCssName(epic.state)}">${stateLabel(epic.state)}</span>
          <span class="tl-epic-title">${escHtml(epic.title)}</span>
        </div>
        <div class="tl-row-right">
          ${due}
          <span class="tl-arrow">→</span>
        </div>
      </div>
    `;
  }

  return { render };
})();
