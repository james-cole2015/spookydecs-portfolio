// IdeaCard — Renders a single idea card

import { TERMINAL_STATUSES } from '../utils/ideas-config.js';
import { navigateTo } from '../utils/router.js';

const IMAGE_PLACEHOLDER = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="m21 15-5-5L5 21"/>
  </svg>`;

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

  const imageHtml = idea.images?.length
    ? `<div class="idea-card-image">
         <img src="${idea.images[0]}" alt="${escapeHtml(idea.title)}" loading="lazy">
       </div>`
    : `<div class="idea-card-placeholder">${IMAGE_PLACEHOLDER}</div>`;

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
