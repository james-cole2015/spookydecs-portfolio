/**
 * epic-detail.js
 * Epic detail page.
 *
 * Route: /tracker/epics/:slug
 *
 * Layout:
 *   - Header: epic name, issue count, due date (editable)
 *   - Two columns: open issues (left, priority order) | completed issues (right, in italics)
 *   - Editable: due_date, description
 */

const EpicDetailPage = (() => {

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stateBadgeClass(state) {
    return {
      'open':      'badge-in-progress',
      'planned':   'badge-planned',
      'blocked':   'badge-blocked',
      'backlog':   'badge-backlog',
      'completed': 'badge-done',
    }[state] || 'badge-backlog';
  }

  // ── Render entry point ───────────────────────────────────────────────────────
  async function render({ slug } = {}) {
    const app = document.getElementById('app');
    app.innerHTML = buildShell();

    if (!slug) {
      renderError('No epic specified.');
      return;
    }

    renderSkeletons();
    await load(slug);
  }

  function buildShell() {
    return `
      <div class="epic-detail-page">
        ${buildSubNav()}
        <div class="ed-body" id="ed-body"></div>
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
    const body = document.getElementById('ed-body');
    if (!body) return;
    const rows = Array.from({ length: 5 }, (_, i) =>
      `<div class="ed-skeleton" style="width:${70 + (i % 3) * 10}%; opacity:${0.6 - i * 0.07}"></div>`
    ).join('');
    body.innerHTML = `<div class="ed-container" style="display:flex;flex-direction:column;gap:10px;">${rows}</div>`;
  }

  async function load(slug) {
    try {
      const epicData = await TrackerApi.epics.get(slug);
      const epic   = epicData?.epic || epicData;
      const issues = epicData?.issues || [];

      if (!epic) {
        renderError(`Epic "${escHtml(slug)}" not found.`);
        return;
      }

      renderDetail(epic, issues, slug);
    } catch (err) {
      renderError(err.message || 'Failed to load epic');
    }
  }

  function renderDetail(epic, issues, slug) {
    const body = document.getElementById('ed-body');
    if (!body) return;

    const openIssues = issues
      .filter(i => i.state !== 'completed')
      .sort((a, b) => {
        const ar = a.priority_rank ?? Infinity;
        const br = b.priority_rank ?? Infinity;
        return ar - br;
      });
    const completedIssues = issues.filter(i => i.state === 'completed');

    body.innerHTML = `
      <div class="ed-container">
        <div class="ed-breadcrumbs">
          <a class="ed-back" id="ed-back-btn">← Epics</a>
        </div>

        <div class="ed-header">
          <h1 class="ed-title">${escHtml(epic.title)}</h1>
          <div class="ed-header-meta">
            <span class="ed-issue-count">${issues.length} issue${issues.length !== 1 ? 's' : ''}</span>
            <div class="ed-due-date-wrap">
              <span class="ed-label">Due:</span>
              <span id="ed-due-display" class="ed-due-value ${epic.due_date ? '' : 'ed-empty'}">${epic.due_date ? escHtml(epic.due_date) : 'not set'}</span>
              <input id="ed-due-input" class="ed-due-input" type="date" value="${escHtml(epic.due_date || '')}" style="display:none" />
              <button id="ed-due-edit-btn" class="ed-inline-btn">edit</button>
            </div>
          </div>
        </div>

        <div class="ed-description-wrap">
          <div class="ed-label">Description</div>
          <div id="ed-desc-display" class="ed-desc-text ${epic.description ? '' : 'ed-empty'}">${epic.description ? escHtml(epic.description) : 'No description.'}</div>
          <textarea id="ed-desc-input" class="ed-desc-textarea" rows="3" style="display:none">${escHtml(epic.description || '')}</textarea>
          <div class="ed-desc-actions" id="ed-desc-actions" style="display:none">
            <button id="ed-desc-save-btn" class="ci-btn-primary" style="font-size:12px;padding:4px 10px">Save</button>
            <button id="ed-desc-cancel-btn" class="ci-btn-ghost" style="font-size:12px;padding:4px 10px">Cancel</button>
          </div>
          <button id="ed-desc-edit-btn" class="ed-inline-btn">edit</button>
        </div>

        <div class="ed-columns">
          <div class="ed-col">
            <div class="ed-col-label">Open (${openIssues.length})</div>
            ${openIssues.length
              ? openIssues.map(i => buildIssueRow(i, slug, false)).join('')
              : `<div class="ed-empty-col">No open issues.</div>`
            }
          </div>
          <div class="ed-col">
            <div class="ed-col-label">Completed (${completedIssues.length})</div>
            ${completedIssues.length
              ? completedIssues.map(i => buildIssueRow(i, slug, true)).join('')
              : `<div class="ed-empty-col">No completed issues.</div>`
            }
          </div>
        </div>
      </div>
    `;

    bindDetail(epic, slug);
  }

  function buildIssueRow(issue, epicSlug, completed) {
    const href = `/epics/${encodeURIComponent(epicSlug)}/${issue.issue_number}`;
    const taskVals  = Object.values(issue.tasks || {});
    const taskTotal = taskVals.length;
    const taskDone  = taskVals.filter(t => t.state === 'completed').length;
    return `
      <div class="ed-issue-row ${completed ? 'ed-issue-completed' : ''}" data-href="${escHtml(href)}">
        <span class="ed-issue-number">#${issue.issue_number}</span>
        <span class="ed-issue-title">${escHtml(issue.title)}</span>
        <div class="ed-issue-meta">
          ${taskTotal > 0 ? `<span class="pl-task-badge">${taskDone}/${taskTotal} ✓</span>` : ''}
          ${issue.effort ? `<span class="effort-badge">${escHtml(issue.effort)}</span>` : ''}
          <span class="badge ${stateBadgeClass(issue.state)}">${issue.state || 'backlog'}</span>
        </div>
      </div>
    `;
  }

  function bindDetail(epic, slug) {
    document.getElementById('ed-back-btn')?.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate('/epics');
    });

    document.getElementById('nav-home-btn')?.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate('/');
    });

    // Issue row navigation
    document.querySelectorAll('.ed-issue-row[data-href]').forEach(row => {
      row.addEventListener('click', () => {
        Router.navigate(row.dataset.href);
      });
    });

    // Due date editing
    const dueDisplay  = document.getElementById('ed-due-display');
    const dueInput    = document.getElementById('ed-due-input');
    const dueEditBtn  = document.getElementById('ed-due-edit-btn');

    dueEditBtn?.addEventListener('click', () => {
      dueDisplay.style.display = 'none';
      dueEditBtn.style.display = 'none';
      dueInput.style.display   = 'inline-block';
      dueInput.focus();
    });

    dueInput?.addEventListener('change', async () => {
      const val = dueInput.value;
      try {
        await TrackerApi.epics.update(slug, { due_date: val || null });
        dueDisplay.textContent    = val || 'not set';
        dueDisplay.classList.toggle('ed-empty', !val);
        dueInput.style.display    = 'none';
        dueDisplay.style.display  = 'inline';
        dueEditBtn.style.display  = 'inline';
      } catch (err) {
        Toast.show(`Failed to update due date: ${err.message}`, 'error');
        dueInput.style.display    = 'none';
        dueDisplay.style.display  = 'inline';
        dueEditBtn.style.display  = 'inline';
      }
    });

    dueInput?.addEventListener('blur', () => {
      dueInput.style.display   = 'none';
      dueDisplay.style.display = 'inline';
      dueEditBtn.style.display = 'inline';
    });

    // Description editing
    const descDisplay   = document.getElementById('ed-desc-display');
    const descInput     = document.getElementById('ed-desc-input');
    const descActions   = document.getElementById('ed-desc-actions');
    const descEditBtn   = document.getElementById('ed-desc-edit-btn');
    const descSaveBtn   = document.getElementById('ed-desc-save-btn');
    const descCancelBtn = document.getElementById('ed-desc-cancel-btn');

    descEditBtn?.addEventListener('click', () => {
      descDisplay.style.display  = 'none';
      descEditBtn.style.display  = 'none';
      descInput.style.display    = 'block';
      descActions.style.display  = 'flex';
      descInput.focus();
    });

    descCancelBtn?.addEventListener('click', () => {
      descInput.style.display    = 'none';
      descActions.style.display  = 'none';
      descDisplay.style.display  = 'block';
      descEditBtn.style.display  = 'inline';
    });

    descSaveBtn?.addEventListener('click', async () => {
      const val = descInput.value.trim();
      descSaveBtn.disabled = true;
      try {
        await TrackerApi.epics.update(slug, { description: val });
        descDisplay.textContent = val || 'No description.';
        descDisplay.classList.toggle('ed-empty', !val);
        descInput.style.display    = 'none';
        descActions.style.display  = 'none';
        descDisplay.style.display  = 'block';
        descEditBtn.style.display  = 'inline';
      } catch (err) {
        Toast.show(`Failed to update description: ${err.message}`, 'error');
      } finally {
        descSaveBtn.disabled = false;
      }
    });
  }

  function renderError(msg) {
    const body = document.getElementById('ed-body');
    if (!body) return;
    body.innerHTML = `
      <div class="ed-container">
        <a class="ed-back" id="ed-back-btn">← Epics</a>
        <div class="empty-state" style="padding-top: 60px;">
          <div class="empty-state-title">Epic not found</div>
          <div>${escHtml(msg)}</div>
        </div>
      </div>
    `;
    document.getElementById('ed-back-btn')?.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate('/epics');
    });
  }

  return { render };
})();
