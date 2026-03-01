// Idea Detail Page

import { getIdea, deleteIdea } from '../utils/ideas-api.js';
import { navigateTo } from '../utils/router.js';
import { showToast } from '../shared/toast.js';
import { showConfirmModal } from '../shared/modal.js';

const PLACEHOLDERS = {
  halloween: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path d="M24 6 C24 6 28 2 31 4 C29 7 27 9 24 12" fill="#4ade80"/>
    <ellipse cx="18" cy="30" rx="10" ry="13" fill="#f97316"/>
    <ellipse cx="24" cy="28" rx="9" ry="15" fill="#fb923c"/>
    <ellipse cx="30" cy="30" rx="10" ry="13" fill="#f97316"/>
    <polygon points="17,24 14,30 20,30" fill="#7c2d12"/>
    <polygon points="31,24 28,30 34,30" fill="#7c2d12"/>
    <path d="M17 36 Q20 40 24 39 Q28 40 31 36" stroke="#7c2d12" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`,
  christmas: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <polygon points="24,3 25.5,8 31,8 26.5,11.5 28,17 24,14 20,17 21.5,11.5 17,8 22.5,8" fill="#fbbf24"/>
    <polygon points="24,10 13,26 35,26" fill="#16a34a"/>
    <polygon points="24,18 10,38 38,38" fill="#15803d"/>
    <rect x="21" y="38" width="6" height="7" rx="1" fill="#92400e"/>
  </svg>`,
  shared: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="m21 15-5-5L5 21"/>
  </svg>`,
};

function _getYoutubeId(url) {
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

export async function renderIdeaDetail(container, id) {
  container.innerHTML = `
    <div class="detail-page">
      <div class="breadcrumb">
        <a href="#" id="back-link">← Ideas</a>
      </div>
      <div class="empty-state">
        <div class="loading-spinner" style="margin:0 auto"></div>
      </div>
    </div>
  `;

  container.querySelector('#back-link').addEventListener('click', e => {
    e.preventDefault();
    navigateTo('/list');
  });

  let idea;
  try {
    idea = await getIdea(id);
  } catch (err) {
    _renderError(container, err.message);
    return;
  }

  if (!idea) {
    _renderNotFound(container, id);
    return;
  }

  _renderDetail(container, idea);
}

function _renderDetail(container, idea) {
  const seasonKey = (idea.season || '').toLowerCase();
  const statusKey = (idea.status || '').toLowerCase();
  const images = idea.images || [];
  const tags = idea.tags || [];

  let heroHtml;
  if (images.length) {
    heroHtml = `<div class="detail-hero"><img id="hero-img" src="${images[0]}" alt="${_escAttr(idea.title)}" loading="lazy"></div>`;
  } else {
    const ytId = _getYoutubeId(idea.link);
    if (ytId) {
      heroHtml = `<div class="detail-hero"><img id="hero-img" src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="${_escAttr(idea.title)}" loading="lazy"></div>`;
    } else {
      const placeholder = PLACEHOLDERS[seasonKey] || PLACEHOLDERS.shared;
      heroHtml = `<div class="detail-hero">
        <div class="detail-hero-placeholder detail-hero-placeholder--${seasonKey}">${placeholder}</div>
      </div>`;
    }
  }

  const galleryHtml = images.length > 1
    ? `<div class="detail-gallery">
        ${images.map((url, i) => `
          <div class="gallery-thumb${i === 0 ? ' active' : ''}" data-url="${_escAttr(url)}" data-idx="${i}">
            <img src="${url}" alt="image ${i + 1}" loading="lazy">
          </div>
        `).join('')}
       </div>`
    : '';

  const tagsHtml = tags.length
    ? `<div class="tags-row">${tags.map(t => `<span class="tag-chip">${_escHtml(t)}</span>`).join('')}</div>`
    : '<span class="detail-field-value empty">None</span>';

  const linkHtml = idea.link
    ? `<a href="${_escAttr(idea.link)}" target="_blank" rel="noopener noreferrer">${_escHtml(idea.link)}</a>`
    : '<span class="detail-field-value empty">—</span>';

  container.innerHTML = `
    <div class="detail-page">
      <div class="breadcrumb">
        <a href="#" id="back-link">← Ideas</a>
        <span class="breadcrumb-sep">/</span>
        <span>${_escHtml(idea.title)}</span>
      </div>

      ${heroHtml}
      ${galleryHtml}

      <div class="detail-header">
        <div class="detail-badges">
          <span class="badge badge-season-${seasonKey}">${idea.season}</span>
          <span class="badge badge-status-${statusKey}">${idea.status}</span>
        </div>
        <h1 class="detail-title">${_escHtml(idea.title)}</h1>
        <div class="detail-actions">
          <button class="btn btn-secondary" id="edit-btn">Edit</button>
          <button class="btn btn-danger btn-sm" id="delete-btn">Delete</button>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-main">

          <div class="detail-section">
            <div class="detail-section-title">Description</div>
            <div class="detail-field-value${!idea.description ? ' empty' : ''}">
              ${idea.description ? _escHtml(idea.description) : 'No description provided.'}
            </div>
          </div>

          ${idea.notes ? `
          <div class="detail-section">
            <div class="detail-section-title">Notes</div>
            <div class="detail-field-value">${_escHtml(idea.notes)}</div>
          </div>` : ''}

        </div>

        <div class="detail-sidebar">
          <div class="detail-section">
            <div class="detail-section-title">Info</div>

            <div class="detail-field">
              <div class="detail-field-label">Season</div>
              <div class="detail-field-value">
                <span class="badge badge-season-${seasonKey}">${idea.season}</span>
              </div>
            </div>

            <div class="detail-field">
              <div class="detail-field-label">Status</div>
              <div class="detail-field-value">
                <span class="badge badge-status-${statusKey}">${idea.status}</span>
              </div>
            </div>

            <div class="detail-field">
              <div class="detail-field-label">Link</div>
              <div class="detail-field-value">${linkHtml}</div>
            </div>

            <div class="detail-field">
              <div class="detail-field-label">Tags</div>
              <div class="detail-field-value">${tagsHtml}</div>
            </div>

            <div class="detail-field">
              <div class="detail-field-label">ID</div>
              <div class="detail-field-value" style="font-size:12px;color:var(--color-text-muted)">${idea.id}</div>
            </div>
          </div>

          <div class="detail-timestamps">
            ${idea.createdAt ? `<div>Created: ${_formatDate(idea.createdAt)}</div>` : ''}
            ${idea.updatedAt ? `<div>Updated: ${_formatDate(idea.updatedAt)}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // Back
  container.querySelector('#back-link').addEventListener('click', e => {
    e.preventDefault();
    navigateTo('/list');
  });

  // Edit
  container.querySelector('#edit-btn').addEventListener('click', () => {
    navigateTo(`/${idea.id}/edit`);
  });

  // Delete
  container.querySelector('#delete-btn').addEventListener('click', () => {
    showConfirmModal({
      title: 'Delete Idea',
      message: `Are you sure you want to delete "${idea.title}"? This cannot be undone.`,
      confirmLabel: 'Delete',
      confirmDanger: true,
      onConfirm: async () => {
        try {
          await deleteIdea(idea.id);
          showToast('Idea deleted', 'success');
          navigateTo('/list');
        } catch (err) {
          showToast('Failed to delete: ' + err.message, 'error');
        }
      }
    });
  });

  // Gallery thumb clicks
  if (images.length > 1) {
    container.querySelectorAll('.gallery-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        container.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
        const heroImg = container.querySelector('#hero-img');
        if (heroImg) heroImg.src = thumb.dataset.url;
      });
    });
  }
}

function _renderError(container, message) {
  container.innerHTML = `
    <div class="detail-page">
      <div class="breadcrumb"><a href="#" id="back-link">← Ideas</a></div>
      <div class="error-container">
        <div class="error-content">
          <h2>Failed to Load</h2>
          <p>${_escHtml(message)}</p>
          <button class="btn btn-secondary" onclick="window.location.reload()">Retry</button>
        </div>
      </div>
    </div>
  `;
  container.querySelector('#back-link')?.addEventListener('click', e => {
    e.preventDefault(); navigateTo('/list');
  });
}

function _renderNotFound(container, id) {
  container.innerHTML = `
    <div class="detail-page">
      <div class="breadcrumb"><a href="#" id="back-link">← Ideas</a></div>
      <div class="not-found-page">
        <div class="not-found-content">
          <h2>Idea Not Found</h2>
          <p>No idea with ID <code>${_escHtml(id)}</code> could be found.</p>
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

function _formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return iso; }
}

function _escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _escAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
