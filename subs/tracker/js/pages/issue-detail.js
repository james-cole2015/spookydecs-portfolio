/**
 * issue-detail.js
 * Issue detail page.
 *
 * Route: /tracker/epics/:epic/:issue
 *   epic  — epic slug
 *   issue — issue_number
 *
 * Features:
 *   - Editable issue fields (state, priority, effort, parent_epic, title, description)
 *   - Notes: append-only list with add-note form
 *   - Tasks: list of tasks with state toggle + add task form
 */

const IssueDetailPage = (() => {

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stateBadgeClass(state) {
    return {
      'backlog':   'badge-backlog',
      'planned':   'badge-planned',
      'open':      'badge-in-progress',
      'blocked':   'badge-blocked',
      'completed': 'badge-done',
    }[state] || 'badge-backlog';
  }

  // ── Render entry point ─────────────────────────────────────────────────────
  async function render({ epic, issue: issueParam }) {
    const app = document.getElementById('app');
    app.innerHTML = buildShell(epic);

    try {
      const [issueData, epicData, taskData] = await Promise.all([
        TrackerApi.issues.get(issueParam),
        TrackerApi.epics.list(),
        TrackerApi.tasks.list(issueParam),
      ]);

      const issue = issueData?.item || issueData;
      const epics = epicData?.items || epicData || [];
      const tasks = taskData?.items || taskData || [];

      if (!issue) {
        renderError(`Issue #${issueParam} not found.`);
        return;
      }

      renderCard(issue, epics, tasks, epic);
    } catch (err) {
      renderError(err.message);
    }
  }

  // ── Shell ──────────────────────────────────────────────────────────────────
  function buildShell(epicSlug) {
    return `
      <div class="issue-detail-page">
        ${buildSubNav()}
        <div class="id-body" id="id-body">
          <div class="id-skeleton-wrap">
            ${Array.from({ length: 4 }, (_, i) =>
              `<div class="id-skeleton" style="animation-delay:${i * 50}ms; width:${['60%','90%','45%','75%'][i]}"></div>`
            ).join('')}
          </div>
        </div>
      </div>`;
  }

  function buildSubNav() {
    return `
      <nav class="nav">
        <span class="nav-logo"><a href="/tracker" class="nav-logo-link" id="nav-home-btn">Tracker</a></span>
        <div class="nav-links">
          <a class="nav-link" href="/tracker/priority">Priority</a>
          <a class="nav-link" href="/tracker/timeline">Timeline</a>
          <a class="nav-link" href="/tracker/epics">Epics</a>
          <a class="nav-link" href="/tracker/new-issue">+ Issue</a>
        </div>
      </nav>`;
  }

  // ── Card rendering ─────────────────────────────────────────────────────────
  function renderCard(issue, epics, tasks, epicSlug) {
    const body = document.getElementById('id-body');
    if (!body) return;

    const currentEpic = issue.parent_epic || '';

    const epicOptions = epics
      .map(e => {
        const name = e.epic_name || e.id;
        return `<option value="${escHtml(name)}" ${name === currentEpic ? 'selected' : ''}>${escHtml(e.title || name)}</option>`;
      })
      .join('');

    body.innerHTML = `
      <div class="id-container">
        <div class="id-breadcrumbs">
          <a class="id-back" id="id-back-priority-btn" href="/tracker/priority">Priority</a>
          <span class="id-breadcrumb-sep">›</span>
          ${currentEpic ? `<a class="id-back" id="id-back-epic-btn" href="/tracker/epics/${encodeURIComponent(currentEpic)}">${escHtml(currentEpic)}</a><span class="id-breadcrumb-sep">›</span>` : ''}
          <span class="id-breadcrumb-current">#${issue.issue_number}</span>
        </div>

        <div class="id-card">
          <div class="id-header">
            <span class="id-number">#${issue.issue_number}</span>
            <h1 class="id-title" id="id-title-display">${escHtml(issue.title)}</h1>
          </div>

          <div class="id-meta">
            <div class="id-meta-row">
              <span class="id-label">State</span>
              <select class="id-select" id="id-state-select">
                ${['backlog','planned','open','blocked','completed'].map(s =>
                  `<option value="${s}" ${issue.state === s ? 'selected' : ''}>${s}</option>`
                ).join('')}
              </select>
            </div>
            <div class="id-meta-row">
              <span class="id-label">Epic</span>
              <select class="id-select" id="id-epic-select">
                <option value="">— Backlog —</option>
                ${epicOptions}
              </select>
            </div>
            <div class="id-meta-row">
              <span class="id-label">Priority</span>
              <select class="id-select" id="id-priority-select">
                <option value="">–</option>
                ${['P0','P1','P2'].map(p =>
                  `<option value="${p}" ${issue.priority === p ? 'selected' : ''}>${p}</option>`
                ).join('')}
              </select>
            </div>
            <div class="id-meta-row">
              <span class="id-label">Effort</span>
              <select class="id-select" id="id-effort-select">
                <option value="">–</option>
                ${['XS','S','M','L','XL'].map(e =>
                  `<option value="${e}" ${issue.effort === e ? 'selected' : ''}>${e}</option>`
                ).join('')}
              </select>
            </div>
            <div class="id-meta-row">
              <span class="id-label">Priority rank</span>
              <span class="id-value">${issue.priority_rank != null ? `#${issue.priority_rank}` : '—'}</span>
            </div>
          </div>

          <div class="id-description">
            <div class="id-section-label">Description</div>
            <div id="id-desc-display" class="id-body-text ${issue.description ? '' : 'id-empty'}">
              ${issue.description ? escHtml(issue.description) : 'No description.'}
            </div>
            <textarea id="id-desc-input" class="id-desc-textarea" rows="5" style="display:none">${escHtml(issue.description || '')}</textarea>
            <div id="id-desc-actions" style="display:none;gap:8px;margin-top:6px">
              <button id="id-desc-save-btn" class="ci-btn-primary" style="font-size:12px;padding:4px 10px">Save</button>
              <button id="id-desc-cancel-btn" class="ci-btn-ghost" style="font-size:12px;padding:4px 10px">Cancel</button>
            </div>
            <button id="id-desc-edit-btn" class="ed-inline-btn">edit</button>
          </div>

          <!-- Tasks -->
          <div class="id-tasks-section">
            <div class="id-section-label">Tasks <span class="id-task-count" id="id-task-count">${tasks.length}</span></div>
            <div class="id-task-progress" id="id-task-progress" style="display:none">
              <div class="id-task-progress-track">
                <div class="id-task-progress-bar" style="width:0%"></div>
              </div>
              <span class="id-task-progress-label"></span>
            </div>
            <div id="id-tasks-list"></div>
            <div class="id-add-task">
              <input id="id-new-task-input" class="id-task-new-input" type="text" placeholder="Add a task…" />
              <button id="id-add-task-btn" class="ci-btn-ghost">Add</button>
            </div>
          </div>

          <!-- Notes -->
          <div class="id-notes-section">
            <div class="id-section-label">Notes <span class="id-note-count">${(issue.notes || []).length}</span></div>
            <div id="id-notes-list"></div>
            <div class="id-add-note">
              <textarea id="id-new-note-input" class="id-note-new-input" rows="2" placeholder="Add a note or update…"></textarea>
              <button id="id-add-note-btn" class="ci-btn-ghost">Add note</button>
            </div>
          </div>
        </div>
      </div>`;

    renderTasks(tasks, issue.issue_number);
    renderNotes(issue.notes || []);
    bindCard(issue, epicSlug);
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  function renderTaskProgress(tasks) {
    const el = document.getElementById('id-task-progress');
    if (!el) return;
    const total = tasks.length;
    const done  = tasks.filter(t => t.state === 'completed').length;
    if (total === 0) { el.style.display = 'none'; return; }
    const pct = Math.round((done / total) * 100);
    el.style.display = 'flex';
    el.querySelector('.id-task-progress-bar').style.width = `${pct}%`;
    el.querySelector('.id-task-progress-label').textContent = `${done}/${total} tasks`;
  }

  function renderTasks(tasks, issueNumber) {
    const list = document.getElementById('id-tasks-list');
    if (!list) return;

    renderTaskProgress(tasks);

    if (!tasks.length) {
      list.innerHTML = `<div class="id-empty-tasks">No tasks yet.</div>`;
      return;
    }

    list.innerHTML = tasks.map(task => buildTaskRow(task)).join('');

    list.querySelectorAll('.id-task-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const taskId  = btn.dataset.taskId;
        const current = btn.dataset.state;
        const next    = current === 'completed' ? 'open' : 'completed';
        btn.disabled  = true;
        try {
          await TrackerApi.tasks.update(taskId, { state: next });
          btn.dataset.state     = next;
          btn.textContent       = next === 'completed' ? '✓' : '○';
          btn.classList.toggle('id-task-done', next === 'completed');
          const row = btn.closest('.id-task-row');
          if (row) row.classList.toggle('id-task-row-done', next === 'completed');
          // Sync state select inside detail panel
          const stateSelect = row?.querySelector('.id-task-detail-state-select');
          if (stateSelect) stateSelect.value = next;
          // Update progress bar
          const toggles = [...document.querySelectorAll('#id-tasks-list .id-task-toggle')];
          renderTaskProgress(toggles.map(b => ({ state: b.dataset.state })));
        } catch (err) {
          Toast.show(`Failed to update task: ${err.message}`, 'error');
        } finally {
          btn.disabled = false;
        }
      });
    });

    // Expand chevron
    list.querySelectorAll('.id-task-expand').forEach(btn => {
      btn.addEventListener('click', () => {
        const row    = btn.closest('.id-task-row');
        const detail = row?.querySelector('.id-task-detail');
        if (!detail) return;
        const open = detail.style.display === 'none';
        detail.style.display = open ? 'flex' : 'none';
        btn.classList.toggle('id-task-expand-open', open);
      });
    });

    // Description edit / save / cancel (per row)
    list.querySelectorAll('.id-task-row').forEach(row => {
      const taskId    = row.querySelector('.id-task-toggle')?.dataset.taskId;
      const descText  = row.querySelector('.id-task-detail-desc-text');
      const descArea  = row.querySelector('.id-task-detail-desc-textarea');
      const descActs  = row.querySelector('.id-task-detail-desc-actions');
      const editBtn   = row.querySelector('.id-task-detail-edit-btn');
      const saveBtn   = row.querySelector('.id-task-detail-save-btn');
      const cancelBtn = row.querySelector('.id-task-detail-cancel-btn');
      if (!editBtn) return;

      editBtn.addEventListener('click', () => {
        descText.style.display = 'none';
        editBtn.style.display  = 'none';
        descArea.style.display = 'block';
        descActs.style.display = 'flex';
      });

      cancelBtn.addEventListener('click', () => {
        descArea.style.display = 'none';
        descActs.style.display = 'none';
        descText.style.display = 'block';
        editBtn.style.display  = 'inline';
      });

      saveBtn.addEventListener('click', async () => {
        const val = descArea.value.trim();
        saveBtn.disabled = true;
        try {
          await TrackerApi.tasks.update(taskId, { description: val });
          descText.textContent = val || 'No description.';
          descText.classList.toggle('id-empty', !val);
          descArea.style.display = 'none';
          descActs.style.display = 'none';
          descText.style.display = 'block';
          editBtn.style.display  = 'inline';
        } catch (err) {
          Toast.show(`Failed to update task: ${err.message}`, 'error');
        } finally {
          saveBtn.disabled = false;
        }
      });
    });

    // State select (per row)
    list.querySelectorAll('.id-task-detail-state-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const taskId = sel.dataset.taskId;
        const next   = sel.value;
        sel.disabled = true;
        try {
          await TrackerApi.tasks.update(taskId, { state: next });
          const row    = sel.closest('.id-task-row');
          const toggle = row?.querySelector('.id-task-toggle');
          if (toggle) {
            toggle.dataset.state = next;
            toggle.textContent   = next === 'completed' ? '✓' : '○';
            toggle.classList.toggle('id-task-done', next === 'completed');
          }
          if (row) row.classList.toggle('id-task-row-done', next === 'completed');
          const toggles = [...document.querySelectorAll('#id-tasks-list .id-task-toggle')];
          renderTaskProgress(toggles.map(b => ({ state: b.dataset.state })));
        } catch (err) {
          Toast.show(`Failed to update task: ${err.message}`, 'error');
        } finally {
          sel.disabled = false;
        }
      });
    });
  }

  function fmtDate(iso) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return iso; }
  }

  function buildTaskRow(task) {
    const done        = task.state === 'completed';
    const state       = task.state || 'backlog';
    const desc        = task.description || '';
    const tags        = Array.isArray(task.tags) ? task.tags : [];
    const createdStr  = fmtDate(task.task_created);
    const closedStr   = fmtDate(task.task_closed);

    const stateOptions = ['backlog','planned','open','blocked','completed']
      .map(s => `<option value="${s}" ${state === s ? 'selected' : ''}>${s}</option>`)
      .join('');

    const tagsHtml = tags.length
      ? `<span class="id-task-detail-tags">${tags.map(t => `<span class="id-task-detail-tag">${escHtml(t)}</span>`).join('')}</span>`
      : '';

    const timestampsHtml = [
      createdStr ? `<span>created ${escHtml(createdStr)}</span>` : '',
      closedStr  ? `<span>closed ${escHtml(closedStr)}</span>`   : '',
    ].filter(Boolean).join('');

    return `
      <div class="id-task-row ${done ? 'id-task-row-done' : ''}">
        <div class="id-task-row-header">
          <button class="id-task-toggle ${done ? 'id-task-done' : ''}"
                  data-task-id="${escHtml(task.id)}"
                  data-state="${escHtml(state)}">${done ? '✓' : '○'}</button>
          <span class="id-task-title">${escHtml(task.title || task.description)}</span>
          <button class="id-task-expand" data-task-id="${escHtml(task.id)}" aria-label="Expand task">›</button>
        </div>
        <div class="id-task-detail" style="display:none">
          <div class="id-task-detail-desc">
            <div class="id-task-detail-desc-text ${desc ? '' : 'id-empty'}">${desc ? escHtml(desc) : 'No description.'}</div>
            <textarea class="id-task-detail-desc-textarea" rows="3" style="display:none">${escHtml(desc)}</textarea>
            <div class="id-task-detail-desc-actions" style="display:none">
              <button class="id-task-detail-save-btn ci-btn-primary" style="font-size:11px;padding:3px 9px">Save</button>
              <button class="id-task-detail-cancel-btn ci-btn-ghost" style="font-size:11px;padding:3px 9px">Cancel</button>
            </div>
            <button class="id-task-detail-edit-btn ed-inline-btn">edit</button>
          </div>
          <div class="id-task-detail-meta">
            <span class="id-task-detail-meta-label">State</span>
            <select class="id-task-detail-state-select" data-task-id="${escHtml(task.id)}">${stateOptions}</select>
            ${tagsHtml}
            ${timestampsHtml}
          </div>
        </div>
      </div>
    `;
  }

  // ── Notes ──────────────────────────────────────────────────────────────────
  function renderNotes(notes) {
    const list = document.getElementById('id-notes-list');
    if (!list) return;

    if (!notes.length) {
      list.innerHTML = `<div class="id-empty-notes">No notes yet.</div>`;
      return;
    }

    list.innerHTML = notes.map(note => `
      <div class="id-note">
        <div class="id-note-text">${escHtml(note.text)}</div>
        <div class="id-note-meta">${escHtml(note.created_at || '')}</div>
      </div>
    `).join('');
  }

  // ── Bindings ───────────────────────────────────────────────────────────────
  function bindCard(issue, epicSlug) {
    const id = issue.issue_number;

    document.getElementById('nav-home-btn')?.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate('/');
    });

    document.getElementById('id-back-priority-btn')?.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate('/priority');
    });

    document.getElementById('id-back-epic-btn')?.addEventListener('click', e => {
      e.preventDefault();
      const epic = issue.parent_epic || epicSlug;
      if (epic) Router.navigate(`/epics/${encodeURIComponent(epic)}`);
    });

    // State select
    document.getElementById('id-state-select')?.addEventListener('change', async e => {
      await patchIssue(id, { state: e.target.value });
    });

    // Epic select
    document.getElementById('id-epic-select')?.addEventListener('change', async e => {
      await patchIssue(id, { parent_epic: e.target.value || null });
    });

    // Priority select
    document.getElementById('id-priority-select')?.addEventListener('change', async e => {
      await patchIssue(id, { priority: e.target.value || null });
    });

    // Effort select
    document.getElementById('id-effort-select')?.addEventListener('change', async e => {
      await patchIssue(id, { effort: e.target.value || null });
    });

    // Description edit
    const descDisplay   = document.getElementById('id-desc-display');
    const descInput     = document.getElementById('id-desc-input');
    const descActions   = document.getElementById('id-desc-actions');
    const descEditBtn   = document.getElementById('id-desc-edit-btn');
    const descSaveBtn   = document.getElementById('id-desc-save-btn');
    const descCancelBtn = document.getElementById('id-desc-cancel-btn');

    descEditBtn?.addEventListener('click', () => {
      descDisplay.style.display  = 'none';
      descEditBtn.style.display  = 'none';
      descInput.style.display    = 'block';
      descActions.style.display  = 'flex';
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
      await patchIssue(id, { description: val });
      descDisplay.textContent    = val || 'No description.';
      descDisplay.classList.toggle('id-empty', !val);
      descInput.style.display    = 'none';
      descActions.style.display  = 'none';
      descDisplay.style.display  = 'block';
      descEditBtn.style.display  = 'inline';
      descSaveBtn.disabled = false;
    });

    // Add task
    document.getElementById('id-add-task-btn')?.addEventListener('click', async () => {
      const input = document.getElementById('id-new-task-input');
      const title = input.value.trim();
      if (!title) return;
      input.disabled = true;
      try {
        const res = await TrackerApi.tasks.create({ parent_issue: id, title, description: '' });
        const newTask = res?.item || res;
        const list = document.getElementById('id-tasks-list');
        // Remove empty state
        list.querySelector('.id-empty-tasks')?.remove();
        const row = document.createElement('div');
        row.innerHTML = buildTaskRow(newTask);
        list.appendChild(row.firstElementChild);
        // Rebind toggle for new row
        list.querySelectorAll('.id-task-toggle').forEach(btn => {
          btn.onclick = null;
        });
        renderTasks([...document.querySelectorAll('.id-task-row')].map(r => ({
          id:    r.querySelector('.id-task-toggle')?.dataset.taskId,
          state: r.querySelector('.id-task-toggle')?.dataset.state,
          title: r.querySelector('.id-task-title')?.textContent,
        })), id);
        // Update count
        const countEl = document.getElementById('id-task-count');
        if (countEl) countEl.textContent = document.querySelectorAll('.id-task-row').length;
        input.value = '';
      } catch (err) {
        Toast.show(`Failed to create task: ${err.message}`, 'error');
      } finally {
        input.disabled = false;
      }
    });

    // Add note
    document.getElementById('id-add-note-btn')?.addEventListener('click', async () => {
      const input = document.getElementById('id-new-note-input');
      const text  = input.value.trim();
      if (!text) return;
      input.disabled = true;
      try {
        const res = await TrackerApi.issues.update(id, { add_note: text });
        const updatedIssue = res?.item || res;
        renderNotes(updatedIssue?.notes || []);
        input.value = '';
      } catch (err) {
        Toast.show(`Failed to add note: ${err.message}`, 'error');
      } finally {
        input.disabled = false;
      }
    });
  }

  async function patchIssue(id, payload) {
    try {
      await TrackerApi.issues.update(id, payload);
    } catch (err) {
      Toast.show(`Failed to update: ${err.message}`, 'error');
    }
  }

  // ── Error state ────────────────────────────────────────────────────────────
  function renderError(msg) {
    const body = document.getElementById('id-body');
    if (!body) return;
    body.innerHTML = `
      <div class="id-container">
        <a class="id-back" id="id-back-btn">← Back to Priority</a>
        <div class="id-card id-error">
          <div class="id-error-title">Could not load issue</div>
          <div class="id-error-msg">${escHtml(msg)}</div>
        </div>
      </div>`;
    document.getElementById('id-back-btn')?.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate('/priority');
    });
  }

  return { render };
})();
