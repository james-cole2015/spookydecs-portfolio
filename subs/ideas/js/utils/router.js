// Router — Navigo-based client-side routing for Ideas sub

let _router = null;

// These path segments are not valid idea IDs
const RESERVED = new Set(['list', 'create']);

export function initRouter() {
  _router = new Navigo('/', { hash: false });

  _router
    // Landing hub
    .on('/', async () => {
      const { renderIdeasLanding } = await import('../pages/ideas-landing.js');
      await _render(container => renderIdeasLanding(container));
    })

    // List — with optional season from query string
    .on('/list', async () => {
      const params = new URLSearchParams(window.location.search);
      const season = params.get('season') || null;
      const { renderIdeasList } = await import('../pages/ideas-list.js');
      await _render(container => renderIdeasList(container, season));
    })

    // Create
    .on('/create', async () => {
      const { renderIdeaCreate } = await import('../pages/idea-create.js');
      await _render(container => renderIdeaCreate(container, null));
    })

    // Edit
    .on('/:id/edit', async ({ data }) => {
      const { renderIdeaCreate } = await import('../pages/idea-create.js');
      await _render(container => renderIdeaCreate(container, data.id));
    })

    // Detail — only if id is not a reserved segment
    .on('/:id', async ({ data }) => {
      if (RESERVED.has(data.id)) return;
      const { renderIdeaDetail } = await import('../pages/idea-detail.js');
      await _render(container => renderIdeaDetail(container, data.id));
    })

    .notFound(() => {
      const container = _getContainer();
      if (container) {
        container.innerHTML = `
          <div class="error-container">
            <div class="error-content">
              <h2>Page Not Found</h2>
              <p>The path <code>${window.location.pathname}</code> doesn't exist.</p>
              <button class="btn btn-primary" onclick="window.location.href='/'">Go Home</button>
            </div>
          </div>
        `;
      }
    });

  _router.resolve();
  return _router;
}

export function navigateTo(path) {
  if (_router) {
    _router.navigate(path);
  } else {
    window.location.href = path;
  }
}

export function getRouter() {
  return _router;
}

// ---- Helpers ------------------------------------------------

function _getContainer() {
  return document.getElementById('main-content');
}

async function _render(renderFn) {
  const container = _getContainer();
  if (!container) return;

  _showLoading();
  container.innerHTML = '';

  try {
    await renderFn(container);
  } catch (err) {
    console.error('Route render error:', err);
    container.innerHTML = `
      <div class="error-container">
        <div class="error-content">
          <h2>Something went wrong</h2>
          <p>${_escHtml(err.message)}</p>
          <button class="btn btn-secondary" onclick="window.location.reload()">Reload</button>
        </div>
      </div>
    `;
  } finally {
    _hideLoading();
  }
}

function _showLoading() {
  const el = document.getElementById('loading-indicator');
  if (el) el.style.display = 'flex';
}

function _hideLoading() {
  const el = document.getElementById('loading-indicator');
  if (el) el.style.display = 'none';
}

function _escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
