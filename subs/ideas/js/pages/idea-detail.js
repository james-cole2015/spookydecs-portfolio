// Idea Detail Page

import { getIdea, updateIdea, deleteIdea, startEnrichment } from '../utils/ideas-api.js';
import { navigateTo } from '../utils/router.js';
import { showToast } from '../shared/toast.js';
import { showConfirmModal } from '../shared/modal.js';
import { ITEMS_BASE_URL, SEASON_PLACEHOLDERS } from '../utils/ideas-config.js';
import { getCostModalHtml, wireCostModal } from './idea-detail-costs.js';
import { renderError, renderNotFound, getYoutubeId, formatDate, escHtml, escAttr } from './idea-detail-utils.js';
import { getIdeaPhotos } from '../utils/ideas-api.js';


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
    renderError(container, err.message);
    return;
  }

  if (!idea) {
    renderNotFound(container, id);
    return;
  }

  if (idea.status === 'Workbench') {
    navigateTo(`/workbench/${idea.id}`);
    return;
  }

  _renderDetail(container, idea);
}

async function _renderDetail(container, idea) {
  const seasonKey = (idea.season || '').toLowerCase();
  const statusKey = (idea.status || '').toLowerCase();
  const images = idea.images || [];
  const tags = idea.tags || [];

  let heroHtml;
  if (images.length) {
    heroHtml = `<div class="detail-hero"><img id="hero-img" src="${images[0]}" alt="${escAttr(idea.title)}" loading="lazy"></div>`;
  } else {
    const ytId = getYoutubeId(idea.link);
    if (ytId) {
      heroHtml = `<div class="detail-hero"><img id="hero-img" src="https://img.youtube.com/vi/${ytId}/hqdefault.jpg" alt="${escAttr(idea.title)}" loading="lazy"></div>`;
    } else {
      const placeholder = SEASON_PLACEHOLDERS[seasonKey] || SEASON_PLACEHOLDERS.shared;
      heroHtml = `<div class="detail-hero">
        <div class="detail-hero-placeholder detail-hero-placeholder--${seasonKey}">${placeholder}</div>
      </div>`;
    }
  }

  const galleryHtml = images.length > 1
    ? `<div class="detail-gallery">
        ${images.map((url, i) => `
          <div class="gallery-thumb${i === 0 ? ' active' : ''}" data-url="${escAttr(url)}" data-idx="${i}">
            <img src="${url}" alt="image ${i + 1}" loading="lazy">
          </div>
        `).join('')}
       </div>`
    : '';

  const tagsHtml = tags.length
    ? `<div class="tags-row">${tags.map(t => `<span class="tag-chip">${escHtml(t)}</span>`).join('')}</div>`
    : '<span class="detail-field-value empty">None</span>';

  const linkHtml = idea.link
    ? `<a href="${escAttr(idea.link)}" target="_blank" rel="noopener noreferrer">${escHtml(idea.link)}</a>`
    : '<span class="detail-field-value empty">—</span>';

  const materialsHtml = (idea.materials || []).length
    ? `<ul class="materials-list">${idea.materials.map(m => {
        const mat = typeof m === 'string' ? { name: m, done: false } : m;
        return `<li${mat.done ? ' class="done"' : ''}>${escHtml(mat.name)}</li>`;
      }).join('')}</ul>`
    : '<span class="detail-field-value empty">None listed</span>';

  const buildFields = [
    { label: 'Prep Start',     value: idea.prep_start },
    { label: 'Build Start',    value: idea.build_start },
    { label: 'Build Complete', value: idea.build_complete },
  ].map(f => `
    <div class="detail-field">
      <div class="detail-field-label">${f.label}</div>
      <div class="detail-field-value${!f.value ? ' empty' : ''}">${f.value ? formatDate(f.value) : '—'}</div>
    </div>
  `).join('');

  // Status transition buttons — dynamic by current status
  let statusBtnsHtml = '';
  if (idea.status === 'Considering') {
    statusBtnsHtml = `<button class="btn btn-workbench" id="status-forward-btn">Move to Planning →</button>`;
  } else if (idea.status === 'Planning') {
    statusBtnsHtml = `
      <button class="btn btn-secondary" id="status-back-btn">← Back to Considering</button>
      <button class="btn btn-workbench" id="status-forward-btn">Move to Workbench →</button>`;
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  container.innerHTML = `
    <div class="detail-page">
      <div class="breadcrumb">
        <a href="#" id="back-link">← Ideas</a>
        <span class="breadcrumb-sep">/</span>
        <span>${escHtml(idea.title)}</span>
      </div>

      ${heroHtml}
      ${galleryHtml}

      <div class="detail-header">
        <div class="detail-badges">
          <span class="badge badge-season-${seasonKey}">${idea.season}</span>
          <span class="badge badge-status-${statusKey}">${idea.status}</span>
        </div>
        ${idea.status === 'Built' && idea.item_id ? `
        <div class="idea-complete-banner">
          ✓ Build complete — this idea is locked.
          <a href="${ITEMS_BASE_URL}/items/${escAttr(idea.item_id)}" target="_blank">View Item →</a>
        </div>` : ''}
        <h1 class="detail-title">${escHtml(idea.title)}</h1>
        <div class="detail-actions">
          <button class="btn btn-secondary" id="edit-btn">Edit</button>
          ${statusBtnsHtml}
          <button class="btn btn-danger btn-sm" id="delete-btn">Delete</button>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-main">

          <div class="detail-section">
            <div class="detail-section-title">Description</div>
            <div class="detail-field-value${!idea.description ? ' empty' : ''}">${idea.description ? escHtml(idea.description) : 'No description provided.'}</div>
          </div>

          ${idea.notes ? `
          <div class="detail-section">
            <div class="detail-section-title">Notes</div>
            <div class="detail-field-value">${escHtml(idea.notes)}</div>
          </div>` : ''}

          ${idea.status !== 'Built' ? `
          <div class="detail-section" id="enrichment-section">
            ${_renderEnrichmentSection(idea.agent_enrichment)}
          </div>` : ''}

          <div class="detail-section">
            <div class="detail-section-title">Planning</div>
            <div class="detail-field" style="border-bottom:none">
              <div class="detail-field-label">Materials</div>
              <div class="detail-field-value">${materialsHtml}</div>
            </div>
          </div>

          ${idea.status !== 'Considering' ? `
          <div class="detail-section">
            <div class="detail-section-title">Build</div>
            ${buildFields}
            <div class="detail-field" style="border-bottom:none">
              <div class="detail-field-label">Item ID</div>
              <div class="detail-field-value${!idea.item_id ? ' empty' : ''}">
                ${idea.item_id
                  ? `<a href="${ITEMS_BASE_URL}/items/${escAttr(idea.item_id)}" target="_blank">${escHtml(idea.item_id)}</a>`
                  : '—'}
              </div>
            </div>
          </div>

          <div class="detail-section" id="costs-panel">
            <div class="detail-section-title-row">
              <span class="detail-section-title" style="margin-bottom:0">Costs</span>
              <button class="btn btn-sm btn-primary" id="log-cost-btn">+ Log Cost</button>
            </div>
            <div id="costs-content" style="margin-top:var(--space-4)">
              <div class="loading-spinner" style="margin:8px auto;width:20px;height:20px;border-width:2px"></div>
            </div>
          </div>
          ` : ''}

          <div class="detail-section" id="id-photos-section">
            <div class="detail-section-title">Photos</div>
            <photo-gallery
              context="idea"
              idea-id="${escAttr(idea.id)}"
              season="${escAttr((idea.season || 'shared').toLowerCase())}"
              photo-type="inspiration"
              ${idea.status === 'Built' ? 'max-photos="0" no-set-primary' : ''}
            ></photo-gallery>
          </div>

        </div>

        <div class="detail-sidebar">
          <div class="detail-section">
            <div class="detail-section-title">Info</div>

            <div class="detail-field">
              <div class="detail-field-label">Season</div>
              <div class="detail-field-value">${escHtml(idea.season)}</div>
            </div>

            ${idea.bucket ? `
            <div class="detail-field">
              <div class="detail-field-label">Build Season</div>
              <div class="detail-field-value">${escHtml(idea.bucket)}</div>
            </div>` : ''}

            <div class="detail-field">
              <div class="detail-field-label">Status</div>
              <div class="detail-field-value">${escHtml(idea.status)}</div>
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
            ${idea.createdAt ? `<div>Created: ${formatDate(idea.createdAt)}</div>` : ''}
            ${idea.updatedAt ? `<div>Updated: ${formatDate(idea.updatedAt)}</div>` : ''}
          </div>
        </div>
      </div>
    </div>

    ${getCostModalHtml(todayIso)}
  `;

  // Back
  container.querySelector('#back-link').addEventListener('click', e => {
    e.preventDefault();
    navigateTo('/list');
  });

  // Edit / Delete — hidden for completed ideas
  if (idea.status === 'Built' && idea.item_id) {
    container.querySelector('#edit-btn').style.display = 'none';
    container.querySelector('#delete-btn').style.display = 'none';
  }

  container.querySelector('#edit-btn').addEventListener('click', () => {
    navigateTo(`/${idea.id}/edit`);
  });

  // Status transitions — forward
  const forwardBtn = container.querySelector('#status-forward-btn');
  if (forwardBtn) {
    const transitions = {
      Considering: { newStatus: 'Planning',   title: 'Move to Planning',   msg: `Move "${idea.title}" to Planning?`,   dest: `/${idea.id}` },
      Planning:    { newStatus: 'Workbench',  title: 'Move to Workbench',  msg: `Move "${idea.title}" to the Workbench? It will be tracked as an active build.`, dest: '/workbench' },
    };
    const t = transitions[idea.status];
    if (t) {
      forwardBtn.addEventListener('click', () => {
        showConfirmModal({
          title: t.title,
          message: t.msg,
          confirmLabel: t.title,
          onConfirm: async () => {
            try {
              await updateIdea({ ...idea, status: t.newStatus });
              showToast(`Moved to ${t.newStatus}`, 'success');
              window.location.reload();
            } catch (err) {
              showToast('Failed: ' + err.message, 'error');
            }
          }
        });
      });
    }
  }

  // Status transitions — back
  const backBtn = container.querySelector('#status-back-btn');
  if (backBtn) {
    const backTransitions = {
      Planning: { newStatus: 'Considering', title: 'Back to Considering', msg: `Move "${idea.title}" back to Considering?` },
    };
    const t = backTransitions[idea.status];
    if (t) {
      backBtn.addEventListener('click', () => {
        showConfirmModal({
          title: t.title,
          message: t.msg,
          confirmLabel: t.title,
          onConfirm: async () => {
            try {
              await updateIdea({ ...idea, status: t.newStatus });
              showToast(`Moved to ${t.newStatus}`, 'success');
              window.location.reload();
            } catch (err) {
              showToast('Failed: ' + err.message, 'error');
            }
          }
        });
      });
    }
  }

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

  // Gallery
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

  if (idea.status !== 'Considering') {
    wireCostModal(container, idea);
  } // end status !== 'Considering'

  // Enrichment section
  if (idea.status !== 'Built') {
    const enrichSection = container.querySelector('#enrichment-section');
    if (enrichSection) {
      _wireEnrichBtn(enrichSection, idea.id);
      if (idea.agent_enrichment?.status === 'in_progress') {
        startEnrichmentPoll(enrichSection, idea.id);
      }
    }
  }

  // Keep the hero image in sync with the gallery's primary photo.
  // The gallery manages its own photo state (photos table); the hero initially
  // renders from idea.images[] but needs to track gallery changes (uploads,
  // set-primary) without re-navigating. We observe the gallery's shadow DOM
  // and re-fetch from the API whenever it re-renders.
  _syncHeroToGallery(container, idea.id);
}

// ---- Enrichment section -----------------------------------------

function _renderEnrichmentSection(ae) {
  const status = ae?.status;

  if (!status) {
    return `
      <div class="detail-section-title-row">
        <span class="detail-section-title" style="margin-bottom:0">AI Enrichment</span>
      </div>
      <p class="enrichment-intro">Automatically populate photos, purchase links, materials, and cost estimates using AI.</p>
      <button class="btn btn-primary btn-sm" id="enrich-btn">✨ Enrich with AI</button>
    `;
  }

  if (status === 'in_progress') {
    return `
      <div class="detail-section-title-row">
        <span class="detail-section-title" style="margin-bottom:0">AI Enrichment</span>
        <span class="enrichment-status-chip enrichment-status-chip--in-progress">Enriching…</span>
      </div>
      ${_renderSubAgentPanel(ae.sub_agents)}
    `;
  }

  if (status === 'complete' || status === 'partial') {
    const isPartial = status === 'partial';
    return `
      <div class="detail-section-title-row">
        <span class="detail-section-title" style="margin-bottom:0">AI Enrichment</span>
        <span class="enrichment-status-chip enrichment-status-chip--${status}">${isPartial ? 'Partial' : 'Complete'}</span>
      </div>
      ${_renderSubAgentPanel(ae.sub_agents)}
      <div class="enrichment-summary">${_buildEnrichmentSummary(ae)}</div>
      ${isPartial ? '<p class="enrichment-partial-note">Some sub-agents returned nothing — re-run to try again.</p>' : ''}
      <button class="btn btn-secondary btn-sm" id="enrich-btn">↺ Re-run enrichment</button>
    `;
  }

  if (status === 'failed') {
    if (ae.error) console.warn('[enrichment] failed:', ae.error);
    return `
      <div class="detail-section-title-row">
        <span class="detail-section-title" style="margin-bottom:0">AI Enrichment</span>
        <span class="enrichment-status-chip enrichment-status-chip--failed">Failed</span>
      </div>
      <p class="enrichment-error">Enrichment couldn't complete — the AI returned an unexpected response. Try re-running.</p>
      <button class="btn btn-primary btn-sm" id="enrich-btn">Retry enrichment</button>
    `;
  }

  return '';
}

function _renderSubAgentPanel(subAgents) {
  if (!subAgents) return '';
  const rows = [
    { key: 'photos',         label: 'Photos' },
    { key: 'purchase_links', label: 'Purchase Links' },
    { key: 'research',       label: 'Research' },
  ];
  return `<div class="enrichment-panel">${
    rows.map(r => {
      const state = subAgents[r.key] || 'pending';
      return `<div class="enrichment-sub-agent">
        <span class="enrichment-sub-agent-label">${r.label}</span>
        ${_subAgentChip(state)}
      </div>`;
    }).join('')
  }</div>`;
}

function _subAgentChip(state) {
  if (state === 'pending')  return `<span class="enrichment-chip enrichment-chip--pending"><span class="enrichment-pulse"></span>Pending</span>`;
  if (state === 'complete') return `<span class="enrichment-chip enrichment-chip--complete">✓ Complete</span>`;
  if (state === 'empty')    return `<span class="enrichment-chip enrichment-chip--empty">None found</span>`;
  if (state === 'failed')   return `<span class="enrichment-chip enrichment-chip--failed">✗ Failed</span>`;
  return `<span class="enrichment-chip enrichment-chip--empty">${escHtml(state)}</span>`;
}

function _buildEnrichmentSummary(ae) {
  const parts = [];
  if (ae.photos?.length)         parts.push(`${ae.photos.length} photo${ae.photos.length !== 1 ? 's' : ''}`);
  if (ae.purchase_links?.length) parts.push(`${ae.purchase_links.length} link${ae.purchase_links.length !== 1 ? 's' : ''}`);
  if (ae.materials?.length)      parts.push(`${ae.materials.length} material${ae.materials.length !== 1 ? 's' : ''}`);
  if (ae.instructions?.length)   parts.push(`${ae.instructions.length} instruction${ae.instructions.length !== 1 ? 's' : ''}`);
  return parts.length ? parts.join(' · ') : 'No results returned';
}

function _wireEnrichBtn(sectionEl, ideaId) {
  const btn = sectionEl.querySelector('#enrich-btn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = 'Starting…';
    try {
      await startEnrichment(ideaId);
      const optimisticAe = {
        status: 'in_progress',
        started_at: new Date().toISOString(),
        sub_agents: { photos: 'pending', purchase_links: 'pending', research: 'pending' },
      };
      sectionEl.innerHTML = _renderEnrichmentSection(optimisticAe);
      _wireEnrichBtn(sectionEl, ideaId);
      startEnrichmentPoll(sectionEl, ideaId);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = '✨ Enrich with AI';
      showToast(err.message || 'Enrichment failed to start', 'error');
    }
  });
}

const POLL_INTERVAL_MS = 4000;
const POLL_MAX_TICKS = 75; // ~5 min

function startEnrichmentPoll(sectionEl, ideaId) {
  let ticks = 0;
  const intervalId = setInterval(async () => {
    if (!sectionEl.isConnected) { clearInterval(intervalId); return; }
    ticks++;
    if (ticks >= POLL_MAX_TICKS) {
      clearInterval(intervalId);
      const panel = sectionEl.querySelector('.enrichment-panel');
      if (panel) panel.insertAdjacentHTML('afterend', '<p class="enrichment-timeout">Still running — refresh to check the latest status.</p>');
      return;
    }
    try {
      const refreshed = await getIdea(ideaId);
      const ae = refreshed?.agent_enrichment;
      if (!ae) return;
      sectionEl.innerHTML = _renderEnrichmentSection(ae);
      _wireEnrichBtn(sectionEl, ideaId);
      if (ae.status !== 'in_progress') clearInterval(intervalId);
    } catch { /* silent — retry next tick */ }
  }, POLL_INTERVAL_MS);
}

// ---- Hero / gallery sync ----------------------------------------

function _syncHeroToGallery(container, ideaId) {
  const gallery = container.querySelector('photo-gallery');
  if (!gallery) return;

  const updateHero = async () => {
    try {
      const photos = await getIdeaPhotos(ideaId);
      if (!photos.length) return;

      const primary = photos.find(p => p.is_primary) || photos[0];
      if (!primary?.cloudfront_url) return;

      // Rebuild hero img from images-table primary photo
      const heroDiv = container.querySelector('.detail-hero');
      if (heroDiv) {
        heroDiv.innerHTML = `<img id="hero-img" src="${escAttr(primary.cloudfront_url)}" alt="" loading="lazy">`;
      }

      // Rebuild thumbnail strip from images-table photos (not stale idea.images[])
      const galleryDiv = container.querySelector('.detail-gallery');
      if (photos.length > 1) {
        const noPrimary = !photos.some(p => p.is_primary);
        const thumbsHtml = photos.map((p, i) => {
          const isActive = p.is_primary || (noPrimary && i === 0);
          return `<div class="gallery-thumb${isActive ? ' active' : ''}"
                       data-url="${escAttr(p.cloudfront_url)}"
                       data-idx="${i}">
            <img src="${escAttr(p.thumb_cloudfront_url || p.cloudfront_url)}" alt="image ${i + 1}" loading="lazy">
          </div>`;
        }).join('');

        if (galleryDiv) {
          galleryDiv.innerHTML = thumbsHtml;
        } else if (heroDiv) {
          heroDiv.insertAdjacentHTML('afterend', `<div class="detail-gallery">${thumbsHtml}</div>`);
        }

        // Rewire thumb click handlers
        container.querySelectorAll('.gallery-thumb').forEach(thumb => {
          thumb.addEventListener('click', () => {
            container.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            const heroImg = container.querySelector('#hero-img');
            if (heroImg) heroImg.src = thumb.dataset.url;
          });
        });
      } else if (galleryDiv) {
        galleryDiv.remove();
      }
    } catch { /* silent */ }
  };

  const originalRefresh = gallery.refresh.bind(gallery);
  gallery.refresh = async function () {
    await originalRefresh();
    await updateHero();
  };

  // Sync hero on initial load, not just after gallery refresh
  updateHero();
}

