/**
 * create-issue.js
 * Create new issue form.
 *
 * Required fields: title, description, parent_epic
 * Optional: initial tasks (repeatable)
 */

const CreateIssuePage = (() => {

  function escHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function render() {
    const app = document.getElementById('app');
    app.innerHTML = buildShell();

    // Load epics for the dropdown
    let epics = [];
    try {
      const data = await TrackerApi.epics.list();
      epics = data?.items || data || [];
    } catch (_) { /* proceed with empty dropdown */ }

    populateEpicDropdown(epics);
    bindForm();
  }

  function buildShell() {
    return `
      <div class="create-issue-page">
        <div class="ci-container">
          <div class="ci-breadcrumbs">
            <a class="ci-back" id="ci-back-btn" href="/tracker">← Tracker</a>
          </div>
          <h1 class="ci-title">New Issue</h1>

          <form id="ci-form" class="ci-form" novalidate>
            <div class="ci-field">
              <label class="ci-label" for="ci-issue-title">Title <span class="ci-required">*</span></label>
              <input id="ci-issue-title" class="ci-input" type="text" placeholder="Short, descriptive title" required />
            </div>

            <div class="ci-field">
              <label class="ci-label" for="ci-description">Description <span class="ci-required">*</span></label>
              <textarea id="ci-description" class="ci-textarea" rows="5" placeholder="Describe the issue in detail" required></textarea>
            </div>

            <div class="ci-field">
              <label class="ci-label" for="ci-epic-select">Epic <span class="ci-required">*</span></label>
              <select id="ci-epic-select" class="ci-select" required>
                <option value="">— Select an epic —</option>
              </select>
            </div>

            <div class="ci-field ci-tasks-section">
              <label class="ci-label">Initial tasks <span class="ci-optional">(optional)</span></label>
              <div id="ci-tasks-list"></div>
              <button type="button" id="ci-add-task-btn" class="ci-btn-ghost">+ Add task</button>
            </div>

            <div class="ci-actions">
              <button type="submit" id="ci-submit-btn" class="ci-btn-primary">Create issue</button>
              <button type="button" id="ci-cancel-btn" class="ci-btn-ghost">Cancel</button>
            </div>

            <div id="ci-error" class="ci-error" style="display:none;"></div>
          </form>
        </div>
      </div>
    `;
  }

  function populateEpicDropdown(epics) {
    const sel = document.getElementById('ci-epic-select');
    if (!sel) return;
    epics.forEach(epic => {
      const opt = document.createElement('option');
      opt.value = epic.epic_name || epic.id;
      opt.textContent = epic.title || epic.epic_name;
      sel.appendChild(opt);
    });
  }

  function bindForm() {
    document.getElementById('ci-back-btn')?.addEventListener('click', e => {
      e.preventDefault();
      Router.navigate('/');
    });

    document.getElementById('ci-cancel-btn')?.addEventListener('click', () => {
      Router.navigate('/');
    });

    document.getElementById('ci-add-task-btn')?.addEventListener('click', () => {
      addTaskRow();
    });

    document.getElementById('ci-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      await submitForm();
    });
  }

  let taskCount = 0;

  function addTaskRow() {
    taskCount++;
    const list = document.getElementById('ci-tasks-list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'ci-task-row';
    row.dataset.taskId = taskCount;
    row.innerHTML = `
      <input class="ci-input ci-task-input" type="text" placeholder="Task description" data-task-id="${taskCount}" />
      <button type="button" class="ci-task-remove" data-task-id="${taskCount}">✕</button>
    `;
    row.querySelector('.ci-task-remove').addEventListener('click', () => {
      row.remove();
    });
    list.appendChild(row);
  }

  function getTaskTitles() {
    return [...document.querySelectorAll('.ci-task-input')]
      .map(inp => inp.value.trim())
      .filter(Boolean);
  }

  async function submitForm() {
    const titleEl   = document.getElementById('ci-issue-title');
    const descEl    = document.getElementById('ci-description');
    const epicEl    = document.getElementById('ci-epic-select');
    const submitBtn = document.getElementById('ci-submit-btn');
    const errorEl   = document.getElementById('ci-error');

    const title      = titleEl.value.trim();
    const description= descEl.value.trim();
    const parentEpic = epicEl.value;

    errorEl.style.display = 'none';

    if (!title) {
      showError('Title is required.');
      titleEl.focus();
      return;
    }
    if (!description) {
      showError('Description is required.');
      descEl.focus();
      return;
    }
    if (!parentEpic) {
      showError('Please select an epic.');
      epicEl.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating…';

    try {
      const issue = await TrackerApi.issues.create({ title, description, parent_epic: parentEpic });
      const issueNumber = issue?.item?.issue_number || issue?.issue_number;

      // Create initial tasks if any
      const taskTitles = getTaskTitles();
      if (issueNumber && taskTitles.length) {
        await Promise.allSettled(
          taskTitles.map(t => TrackerApi.tasks.create({
            parent_issue: issueNumber,
            title:        t,
            description:  '',
          }))
        );
      }

      Router.navigate(`/epics/${encodeURIComponent(parentEpic)}/${issueNumber}`);
    } catch (err) {
      showError(err.message || 'Failed to create issue. Please try again.');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create issue';
    }
  }

  function showError(msg) {
    const el = document.getElementById('ci-error');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
  }

  return { render };
})();
