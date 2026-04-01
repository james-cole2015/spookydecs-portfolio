/**
 * priority-list.js
 * Priority list page — ranked list of all issues.
 *
 * Rank persistence:
 *   - PATCH /issues/{id} with { priority_rank } on drop
 *   - Debounced so rapid reorders don't flood the API
 *
 * Drag and drop:
 *   - Native HTML5 drag-and-drop
 */

const PriorityListPage = (() => {

  // ── State ──────────────────────────────────────────────────────────────────
  let issues      = [];
  let epics       = [];
  let filtered    = [];
  let dragSrcIdx  = null;
  let saveTimer   = null;

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
          <a class="nav-link active" href="/tracker/priority">Priority</a>
          <a class="nav-link" href="/tracker/timeline">Timeline</a>
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

      issues = (issueData?.items || issueData || []).sort(rankSort);
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
      if (epic  !== 'all' && issue.parent_epic !== epic) return false;
      if (state !== 'all' && issue.state       !== state) return false;
      return true;
    });

    renderList();
    document.getElementById('pl-count').textContent = `${filtered.length} issue${filtered.length !== 1 ? 's' : ''}`;
  }

  function rankSort(a, b) {
    const ar = a.priority_rank ?? Infinity;
    const br = b.priority_rank ?? Infinity;
    return ar - br;
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

  // ── List rendering ─────────────────────────────────────────────────────────
  function renderList() {
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

    const ranked   = filtered.filter(i => i.priority_rank != null);
    const unranked = filtered.filter(i => i.priority_rank == null);

    let html = '';

    ranked.forEach((issue, idx) => {
      html += buildRow(issue, idx + 1);
    });

    if (unranked.length) {
      html += `<div class="pl-section-label">Unranked</div>`;
      unranked.forEach(issue => {
        html += buildRow(issue, null);
      });
    }

    body.innerHTML = html;
    bindRows();
  }

  function buildRow(issue, rankDisplay) {
    const stateClass = {
      'backlog':   'badge-backlog',
      'planned':   'badge-planned',
      'open':      'badge-in-progress',
      'blocked':   'badge-blocked',
      'completed': 'badge-done',
    }[issue.state] || 'badge-backlog';

    const effortLabel   = issue.effort   || '–';
    const effortSet     = issue.effort   ? 'set' : '';
    const priorityLabel = issue.priority || '–';
    const prioritySet   = issue.priority ? 'set' : '';
    const epicName      = issue.parent_epic || null;
    const issueUrl      = `/tracker/epics/${encodeURIComponent(epicName || 'backlog')}/${issue.issue_number}`;

    const taskVals  = Object.values(issue.tasks || {});
    const taskTotal = taskVals.length;
    const taskDone  = taskVals.filter(t => t.state === 'completed').length;

    return `
      <div class="pl-row"
           data-id="${escHtml(issue.issue_number)}"
           data-rank="${issue.priority_rank ?? ''}"
           draggable="true">
        <span class="pl-handle">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="5"  r="1" fill="currentColor"/>
            <circle cx="9" cy="12" r="1" fill="currentColor"/>
            <circle cx="9" cy="19" r="1" fill="currentColor"/>
            <circle cx="15" cy="5"  r="1" fill="currentColor"/>
            <circle cx="15" cy="12" r="1" fill="currentColor"/>
            <circle cx="15" cy="19" r="1" fill="currentColor"/>
          </svg>
        </span>
        <span class="pl-rank ${rankDisplay == null ? 'unranked' : ''}">${rankDisplay ?? '—'}</span>
        <a class="pl-number" href="${issueUrl}">#${issue.issue_number}</a>
        <span class="pl-title">
          <a href="${issueUrl}">${escHtml(issue.title)}</a>
        </span>
        <div class="pl-meta">
          ${epicName ? `<span class="pl-epic" title="${escHtml(epicName)}">${escHtml(epicName)}</span>` : ''}
          ${taskTotal > 0 ? `<span class="pl-task-badge">${taskDone}/${taskTotal} ✓</span>` : ''}
          <div class="pl-priority" data-id="${escHtml(issue.issue_number)}">
            <button class="pl-priority-btn ${prioritySet}" data-priority="${escHtml(issue.priority || '')}">${priorityLabel}</button>
          </div>
          <div class="pl-effort" data-id="${escHtml(issue.issue_number)}">
            <button class="pl-effort-btn ${effortSet}" data-effort="${escHtml(issue.effort || '')}">
              ${effortLabel}
            </button>
          </div>
          <span class="badge ${stateClass} pl-status">${issue.state || 'backlog'}</span>
        </div>
      </div>`;
  }

  // ── Skeleton loading ───────────────────────────────────────────────────────
  function renderSkeletons() {
    const body = document.getElementById('pl-body');
    if (!body) return;
    body.innerHTML = Array.from({ length: 8 }, (_, i) => `
      <div class="pl-skeleton" style="animation-delay:${i * 40}ms">
        <div class="pl-skeleton-bar" style="width:28px"></div>
        <div class="pl-skeleton-bar" style="width:40px"></div>
        <div class="pl-skeleton-bar" style="flex:1; max-width:${180 + (i % 3) * 60}px"></div>
        <div class="pl-skeleton-bar" style="width:32px"></div>
        <div class="pl-skeleton-bar" style="width:72px"></div>
      </div>`).join('');
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

  // ── Row bindings (drag + effort + priority) ────────────────────────────────
  function bindRows() {
    const body = document.getElementById('pl-body');
    if (!body) return;

    body.querySelectorAll('.pl-row[draggable]').forEach(row => {
      row.addEventListener('dragstart', onDragStart);
      row.addEventListener('dragover',  onDragOver);
      row.addEventListener('dragleave', onDragLeave);
      row.addEventListener('drop',      onDrop);
      row.addEventListener('dragend',   onDragEnd);
    });

    body.querySelectorAll('.pl-priority-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        closeAllEffortMenus();
        closeAllPriorityMenus();
        showPriorityMenu(btn);
      });
    });

    body.querySelectorAll('.pl-effort-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        closeAllPriorityMenus();
        closeAllEffortMenus();
        showEffortMenu(btn);
      });
    });

    document.addEventListener('click', () => { closeAllEffortMenus(); closeAllPriorityMenus(); }, { once: false });

    // Issue row click → navigate
    body.querySelectorAll('.pl-number, .pl-title a').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const href = link.getAttribute('href').replace('/tracker', '');
        Router.navigate(href);
      });
    });
  }

  // ── Drag and drop ──────────────────────────────────────────────────────────
  function onDragStart(e) {
    dragSrcIdx = getRowIndex(e.currentTarget);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const body = document.getElementById('pl-body');
    body.querySelectorAll('.pl-row').forEach(r => r.classList.remove('drag-over'));
    e.currentTarget.classList.add('drag-over');
  }

  function onDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function onDrop(e) {
    e.preventDefault();
    const targetIdx = getRowIndex(e.currentTarget);
    if (dragSrcIdx === null || dragSrcIdx === targetIdx) return;

    const moved = filtered.splice(dragSrcIdx, 1)[0];
    filtered.splice(targetIdx, 0, moved);

    assignRanks(targetIdx);

    renderList();
    scheduleSave(moved);
  }

  function onDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.getElementById('pl-body')
      ?.querySelectorAll('.pl-row')
      .forEach(r => r.classList.remove('drag-over'));
    dragSrcIdx = null;
  }

  function getRowIndex(row) {
    const rows = [...document.getElementById('pl-body').querySelectorAll('.pl-row[data-id]')];
    return rows.indexOf(row);
  }

  // ── Rank calculation ───────────────────────────────────────────────────────
  function assignRanks(insertedIdx) {
    const prev = filtered[insertedIdx - 1];
    const next = filtered[insertedIdx + 1];

    const prevRank = prev?.priority_rank ?? 0;
    const nextRank = next?.priority_rank ?? (prevRank + 2000);

    const newRank = Math.round((prevRank + nextRank) / 2);
    filtered[insertedIdx].priority_rank = newRank;

    const master = issues.find(i => i.issue_number === filtered[insertedIdx].issue_number);
    if (master) master.priority_rank = newRank;
  }

  // ── Debounced save ─────────────────────────────────────────────────────────
  function scheduleSave(issue) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveRank(issue), 600);
  }

  async function saveRank(issue) {
    try {
      await TrackerApi.issues.update(issue.issue_number, { priority_rank: issue.priority_rank });
    } catch (err) {
      Toast.show(`Failed to save rank: ${err.message}`, 'error');
    }
  }

  // ── Priority menu ──────────────────────────────────────────────────────────
  const PRIORITIES = ['P0', 'P1', 'P2'];

  function showPriorityMenu(btn) {
    const container = btn.closest('.pl-priority');
    const issueId   = container.dataset.id;
    const current   = btn.dataset.priority;

    const menu = document.createElement('div');
    menu.className = 'pl-priority-menu';
    menu.innerHTML = PRIORITIES.map(p =>
      `<button class="${p === current ? 'active' : ''}" data-val="${p}">${p}</button>`
    ).join('');

    menu.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', async ev => {
        ev.stopPropagation();
        const val = b.dataset.val;
        closeAllPriorityMenus();
        await savePriority(issueId, val, btn);
      });
    });

    container.appendChild(menu);
  }

  function closeAllPriorityMenus() {
    document.querySelectorAll('.pl-priority-menu').forEach(m => m.remove());
  }

  async function savePriority(issueId, priority, btn) {
    try {
      await TrackerApi.issues.update(issueId, { priority });
      const issue = issues.find(i => i.issue_number === issueId);
      if (issue) issue.priority = priority;
      btn.textContent = priority;
      btn.dataset.priority = priority;
      btn.classList.add('set');
    } catch (err) {
      Toast.show(`Failed to save priority: ${err.message}`, 'error');
    }
  }

  // ── Effort menu ────────────────────────────────────────────────────────────
  const EFFORTS = ['XS', 'S', 'M', 'L', 'XL'];

  function showEffortMenu(btn) {
    const container = btn.closest('.pl-effort');
    const issueId   = container.dataset.id;
    const current   = btn.dataset.effort;

    const menu = document.createElement('div');
    menu.className = 'pl-effort-menu';
    menu.innerHTML = EFFORTS.map(e =>
      `<button class="${e === current ? 'active' : ''}" data-val="${e}">${e}</button>`
    ).join('');

    menu.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', async ev => {
        ev.stopPropagation();
        const val = b.dataset.val;
        closeAllEffortMenus();
        await saveEffort(issueId, val, btn);
      });
    });

    container.appendChild(menu);
  }

  function closeAllEffortMenus() {
    document.querySelectorAll('.pl-effort-menu').forEach(m => m.remove());
  }

  async function saveEffort(issueId, effort, btn) {
    try {
      await TrackerApi.issues.update(issueId, { effort });
      const issue = issues.find(i => i.issue_number === issueId);
      if (issue) issue.effort = effort;
      btn.textContent = effort;
      btn.dataset.effort = effort;
      btn.classList.add('set');
    } catch (err) {
      Toast.show(`Failed to save effort: ${err.message}`, 'error');
    }
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
