// Idea Detail — shared utilities (error states, date/escape helpers, YouTube ID)

import { navigateTo } from '../utils/router.js';

export function renderError(container, message) {
  container.innerHTML = `
    <div class="detail-page">
      <div class="breadcrumb"><a href="#" id="back-link">← Ideas</a></div>
      <div class="error-container">
        <div class="error-content">
          <h2>Failed to Load</h2>
          <p>${escHtml(message)}</p>
          <button class="btn btn-secondary" onclick="window.location.reload()">Retry</button>
        </div>
      </div>
    </div>
  `;
  container.querySelector('#back-link')?.addEventListener('click', e => {
    e.preventDefault(); navigateTo('/list');
  });
}

export function renderNotFound(container, id) {
  container.innerHTML = `
    <div class="detail-page">
      <div class="breadcrumb"><a href="#" id="back-link">← Ideas</a></div>
      <div class="not-found-page">
        <div class="not-found-content">
          <h2>Idea Not Found</h2>
          <p>No idea with ID <code>${escHtml(id)}</code> could be found.</p>
          <button class="btn btn-primary" id="back-btn">Back to Ideas</button>
        </div>
      </div>
    </div>
  `;
  container.querySelector('#back-link')?.addEventListener('click', e => {
    e.preventDefault(); navigateTo('/list');
  });
  container.querySelector('#back-btn')?.addEventListener('click', () => navigateTo('/list'));
}

export function getYoutubeId(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    let id = null;
    if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('?')[0];
    } else if (u.hostname.endsWith('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/shorts/')[1].split('?')[0];
      else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1].split('?')[0];
      else id = u.searchParams.get('v');
    }
    return id && /^[\w-]{5,15}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return iso; }
}

export function escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
