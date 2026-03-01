// IdeaCard — Renders a single idea card

import { TERMINAL_STATUSES } from '../utils/ideas-config.js';
import { navigateTo } from '../utils/router.js';

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

/** Extract a YouTube video ID from a URL, or return null. */
function getYoutubeId(url) {
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

/**
 * Render idea cards into a grid container.
 * @param {HTMLElement} container - grid container element
 * @param {Array} ideas - filtered/sorted idea objects
 */
export function renderIdeaCards(container, ideas) {
  if (!ideas.length) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1">
        <div class="empty-state-icon">💡</div>
        <div class="empty-state-title">No ideas found</div>
        <div class="empty-state-desc">Try adjusting your filters or add a new idea.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = ideas.map(idea => renderCard(idea)).join('');

  container.querySelectorAll('.idea-card').forEach(card => {
    card.addEventListener('click', () => navigateTo(`/${card.dataset.id}`));
  });
}

function renderCard(idea) {
  const isMuted = TERMINAL_STATUSES.has(idea.status);
  const seasonKey = (idea.season || '').toLowerCase();
  const statusKey = (idea.status || '').toLowerCase();

  let imageHtml;
  if (idea.images?.length) {
    imageHtml = `<div class="idea-card-image">
      <img src="${idea.images[0]}" alt="${escapeHtml(idea.title)}" loading="lazy">
    </div>`;
  } else {
    const ytId = getYoutubeId(idea.link);
    if (ytId) {
      imageHtml = `<div class="idea-card-image">
        <img src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="${escapeHtml(idea.title)}" loading="lazy">
      </div>`;
    } else {
      const placeholder = PLACEHOLDERS[seasonKey] || PLACEHOLDERS.shared;
      imageHtml = `<div class="idea-card-placeholder idea-card-placeholder--${seasonKey}">${placeholder}</div>`;
    }
  }

  const visibleTags = (idea.tags || []).slice(0, 3);
  const extraCount = (idea.tags || []).length - visibleTags.length;

  const tagsHtml = idea.tags?.length
    ? `<div class="idea-card-tags">
        ${visibleTags.map(t => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}
        ${extraCount > 0 ? `<span class="tag-chip">+${extraCount}</span>` : ''}
       </div>`
    : '';

  return `
    <div class="idea-card${isMuted ? ' muted' : ''}" data-id="${idea.id}" tabindex="0" role="button" aria-label="${escapeAttr(idea.title)}">
      ${imageHtml}
      <div class="idea-card-body">
        <div class="idea-card-badges">
          <span class="badge badge-season-${seasonKey}">${idea.season}</span>
          <span class="badge badge-status-${statusKey}">${idea.status}</span>
        </div>
        <div class="idea-card-title">${escapeHtml(idea.title)}</div>
        ${idea.description
          ? `<div class="idea-card-desc">${escapeHtml(idea.description)}</div>`
          : ''}
        ${tagsHtml}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
