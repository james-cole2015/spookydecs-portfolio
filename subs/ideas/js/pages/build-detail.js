// Build Detail — Interactive workspace for active Workbench builds

import { getIdea, updateIdea, getIdeaCosts, createIdeaCost, createItem, getIdeaPhotos } from '../utils/ideas-api.js';
import { navigateTo } from '../utils/router.js';
import { showToast } from '../shared/toast.js';
import { showConfirmModal } from '../shared/modal.js';
import { ITEMS_BASE_URL } from '../utils/ideas-config.js';

const COST_TYPES = ['build', 'supply_purchase', 'other'];
const COST_CATEGORIES = ['materials', 'labor', 'parts', 'consumables', 'decoration', 'light', 'accessory', 'other'];

const PIPELINE_STAGES = ['Considering', 'Planning', 'Workbench', 'Built'];

const CLASS_TYPES = {
  Decoration: ['Inflatable', 'Animatronic', 'Static Prop'],
  Light:      ['Spot Light', 'String Light'],
  Accessory:  ['Cord', 'Plug', 'Receptacle'],
};

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
    return id || null;
  } catch { return null; }
}

export async function renderBuildDetail(container, id) {
  container.innerHTML = `
    <div class="build-detail-page">
      <button class="btn-back" id="bd-back-btn">&#8592; Active Builds</button>
      <div class="empty-state" style="margin-top:var(--space-8)">
        <div class="loading-spinner" style="margin:0 auto"></div>
      </div>
    </div>
  `;
  container.querySelector('#bd-back-btn').addEventListener('click', () => navigateTo('/workbench'));

  let idea;
  try {
    idea = await getIdea(id);
  } catch (err) {
    container.innerHTML = `
      <div class="build-detail-page">
        <button class="btn-back" id="bd-back-btn2">&#8592; Active Builds</button>
        <div class="error-container"><div class="error-content">
          <h2>Failed to Load</h2><p>${_escHtml(err.message)}</p>
          <button class="btn btn-secondary" onclick="window.location.reload()">Retry</button>
        </div></div>
      </div>`;
    container.querySelector('#bd-back-btn2').addEventListener('click', () => navigateTo('/workbench'));
    return;
  }

  if (!idea) {
    container.innerHTML = `
      <div class="build-detail-page">
        <button class="btn-back" id="bd-back-btn3">&#8592; Active Builds</button>
        <div class="not-found-page"><div class="not-found-content">
          <h2>Build Not Found</h2>
          <button class="btn btn-primary" id="bd-home">Back to Active Builds</button>
        </div></div>
      </div>`;
    container.querySelector('#bd-back-btn3').addEventListener('click', () => navigateTo('/workbench'));
    container.querySelector('#bd-home').addEventListener('click', () => navigateTo('/workbench'));
    return;
  }

  if (idea.status === 'Built' || idea.status === 'Abandoned') {
    navigateTo(`/${idea.id}`);
    return;
  }

  _renderBuild(container, idea);
}

function _renderBuild(container, idea) {
  const seasonKey  = (idea.season || '').toLowerCase();
  const images     = (idea.build_images?.length ? idea.build_images : null) || idea.images || [];
  const materials  = (idea.materials || []).map(m => typeof m === 'string' ? { name: m, done: false } : m);
  const sessions   = idea.build_sessions || [];
  const todayIso   = new Date().toISOString().slice(0, 10);

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
      <div id="hero-placeholder" class="detail-hero-placeholder detail-hero-placeholder--${seasonKey}">${placeholder}</div>
    </div>`;
    }
  }

  const pipelineHtml = _renderPipeline(idea.status);

  container.innerHTML = `
    <div class="build-detail-page">
      <button class="btn-back" id="bd-back-btn">&#8592; Active Builds</button>

      ${pipelineHtml}

      ${heroHtml}

      <div class="build-detail-header">
        <h1 class="build-detail-title" id="bd-title-display">${_escHtml(idea.title)}</h1>
      </div>

      <div class="build-detail-body">

        <div class="build-detail-main">

          <section class="bd-section">
            <div class="bd-section-title">Description</div>
            <div class="bd-inline-field" data-field="description" data-type="textarea">
              <div class="bd-field-display${!idea.description ? ' empty' : ''}" id="bd-desc-display">
                ${idea.description ? _escHtml(idea.description) : 'Click to add a description…'}
              </div>
            </div>
          </section>

          <section class="bd-section">
            <div class="bd-section-title">Materials</div>
            <div id="bd-materials-list" class="bd-materials-list"></div>
            <div class="bd-add-row">
              <input class="form-input bd-add-material-input" type="text" id="bd-add-mat-input" placeholder="Add material…">
              <button class="btn btn-sm btn-secondary" id="bd-add-mat-btn">Add</button>
            </div>
          </section>

          <section class="bd-section">
            <div class="bd-section-title-row">
              <span class="bd-section-title" style="margin-bottom:0">Build Sessions</span>
              <button class="btn btn-sm btn-primary" id="bd-add-session-btn">+ Add Session</button>
            </div>
            <div id="bd-sessions-list" class="bd-sessions-list"></div>
            <div id="bd-session-form" class="bd-session-form" style="display:none">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label" for="bs-date">Date</label>
                  <input class="form-input" id="bs-date" type="date" value="${todayIso}">
                </div>
                <div class="form-group">
                  <label class="form-label" for="bs-duration">Duration (min)</label>
                  <input class="form-input" id="bs-duration" type="number" min="1" placeholder="60">
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="bs-notes">Notes</label>
                <textarea class="form-textarea" id="bs-notes" rows="3" placeholder="What did you work on?"></textarea>
              </div>
              <div class="form-actions" style="margin-top:0">
                <button type="button" class="btn btn-secondary" id="bs-cancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="bs-save">Save Session</button>
              </div>
            </div>
          </section>

          <section class="bd-section" id="bd-costs-section">
            <div class="bd-section-title-row">
              <span class="bd-section-title" style="margin-bottom:0">Costs</span>
              <button class="btn btn-sm btn-primary" id="bd-log-cost-btn">+ Log Cost</button>
            </div>
            <div id="bd-costs-content" style="margin-top:var(--space-4)">
              <div class="loading-spinner" style="margin:8px auto;width:20px;height:20px;border-width:2px"></div>
            </div>
          </section>

          <section class="bd-section" id="bd-photos-section">
            <div class="bd-section-title-row">
              <span class="bd-section-title" style="margin-bottom:0">Build Photos</span>
              <button type="button" class="btn btn-sm btn-secondary" id="bd-add-photo-btn">+ Add Build Photo</button>
            </div>
            <input id="bd-photo-file-input" type="file" multiple accept="image/*" style="display:none">
            <span id="bd-photo-status" style="display:none;font-size:0.85rem;color:var(--color-text-muted);margin-top:var(--space-2)"></span>
            <div id="bd-photos-grid" class="bd-photos-grid" style="margin-top:var(--space-3)"></div>
          </section>

        </div>

        <div class="build-detail-sidebar">
          <section class="bd-section">
            <div class="bd-section-title">Info</div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">ID</div>
              <div class="bd-sidebar-value" style="font-size:0.75rem;word-break:break-all">${_escHtml(idea.id)}</div>
            </div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">Season</div>
              <div class="bd-sidebar-value">${_escHtml(idea.season)}</div>
            </div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">Status</div>
              <div class="bd-sidebar-value">${_escHtml(idea.status)}</div>
            </div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">Prep Start</div>
              <div class="bd-inline-field" data-field="prep_start" data-type="date">
                <div class="bd-field-display${!idea.prep_start ? ' empty' : ''}" id="bd-prep-start-display">
                  ${idea.prep_start ? _formatDate(idea.prep_start) : '—'}
                </div>
              </div>
            </div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">Build Start</div>
              <div class="bd-inline-field" data-field="build_start" data-type="date">
                <div class="bd-field-display${!idea.build_start ? ' empty' : ''}" id="bd-build-start-display">
                  ${idea.build_start ? _formatDate(idea.build_start) : '—'}
                </div>
              </div>
            </div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">Build Complete</div>
              <div class="bd-inline-field" data-field="build_complete" data-type="date">
                <div class="bd-field-display${!idea.build_complete ? ' empty' : ''}" id="bd-build-complete-display">
                  ${idea.build_complete ? _formatDate(idea.build_complete) : '—'}
                </div>
              </div>
            </div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">Link</div>
              <div class="bd-inline-field" data-field="link" data-type="url">
                <div class="bd-field-display${!idea.link ? ' empty' : ''}" id="bd-link-display">
                  ${idea.link ? `<a href="${_escAttr(idea.link)}" target="_blank" rel="noopener noreferrer">${_escHtml(idea.link)}</a>` : '—'}
                </div>
              </div>
            </div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">Notes</div>
              <div class="bd-inline-field" data-field="notes" data-type="textarea">
                <div class="bd-field-display${!idea.notes ? ' empty' : ''}" id="bd-notes-display">
                  ${idea.notes ? _escHtml(idea.notes) : '—'}
                </div>
              </div>
            </div>

            <div class="bd-sidebar-field">
              <div class="bd-sidebar-label">Item ID</div>
              <div class="bd-field-display${!idea.item_id ? ' empty' : ''}">
                ${idea.item_id
                  ? `<a href="${ITEMS_BASE_URL}/items/${_escAttr(idea.item_id)}" target="_blank">${_escHtml(idea.item_id)}</a>`
                  : '—'}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="build-action-bar">
        <button class="btn btn-primary" id="bd-complete-btn">Complete Build</button>
        <button class="btn btn-secondary" id="bd-edit-btn">Edit Full Form</button>
        <button class="btn btn-danger" id="bd-abandon-btn">Abandon Build</button>
      </div>
    </div>

    <!-- Log Cost Modal -->
    <div class="log-cost-backdrop" id="bd-log-cost-modal" style="display:none" role="dialog" aria-modal="true">
      <div class="log-cost-modal">
        <div class="log-cost-modal-header">
          <h2>Log Cost</h2>
          <button class="log-cost-close" id="bd-lc-close">&times;</button>
        </div>
        <form id="bd-log-cost-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="bd-lc-item-name">Item / Description <span class="required">*</span></label>
            <input class="form-input" id="bd-lc-item-name" type="text" placeholder="e.g. 3/4 inch PVC pipe" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="bd-lc-cost-type">Cost Type <span class="required">*</span></label>
              <select class="form-select" id="bd-lc-cost-type" required>
                ${COST_TYPES.map(t => `<option value="${t}"${t === 'build' ? ' selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="bd-lc-category">Category <span class="required">*</span></label>
              <select class="form-select" id="bd-lc-category" required>
                ${COST_CATEGORIES.map(c => `<option value="${c}"${c === 'materials' ? ' selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="bd-lc-total-cost">Total Cost ($) <span class="required">*</span></label>
              <input class="form-input" id="bd-lc-total-cost" type="number" min="0.01" step="0.01" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="bd-lc-cost-date">Date <span class="required">*</span></label>
              <input class="form-input" id="bd-lc-cost-date" type="date" value="${todayIso}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="bd-lc-store">Store <span class="required">*</span></label>
              <input class="form-input" id="bd-lc-store" type="text" placeholder="e.g. Home Depot" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="bd-lc-manufacturer">Brand / Manufacturer</label>
              <input class="form-input" id="bd-lc-manufacturer" type="text" placeholder="e.g. Spirit Halloween">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Receipt (optional)</label>
            <div class="lc-receipt-row">
              <input id="bd-lc-receipt-file" type="file" accept="image/*,application/pdf" style="display:none">
              <button type="button" class="btn btn-secondary btn-sm" id="bd-lc-receipt-btn">Attach Receipt</button>
              <span class="lc-receipt-name" id="bd-lc-receipt-name" style="display:none"></span>
              <button type="button" class="btn-link lc-receipt-remove" id="bd-lc-receipt-remove" style="display:none">✕</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="bd-lc-notes">Notes</label>
            <input class="form-input" id="bd-lc-notes" type="text" placeholder="Optional">
          </div>
          <div class="form-error" id="bd-lc-error" style="display:none"></div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="bd-lc-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="bd-lc-submit">Save Cost</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Complete Build Modal -->
    <div class="log-cost-backdrop" id="bd-complete-modal" style="display:none" role="dialog" aria-modal="true">
      <div class="complete-modal">
        <div class="log-cost-modal-header">
          <h2>Complete Build</h2>
          <button class="log-cost-close" id="bd-cm-close">&times;</button>
        </div>
        <div class="complete-modal-steps">
          <div class="cm-step-indicator">
            <span class="cm-step active" id="cm-step-dot-1">1</span>
            <span class="cm-step-line"></span>
            <span class="cm-step" id="cm-step-dot-2">2</span>
            <span class="cm-step-line"></span>
            <span class="cm-step" id="cm-step-dot-3">3</span>
          </div>

          <!-- Step 1: Confirm completion -->
          <div id="cm-step-1" class="cm-step-panel">
            <h3>Confirm Completion</h3>
            <div class="form-group">
              <label class="form-label" for="cm-complete-date">Build Complete Date</label>
              <input class="form-input" id="cm-complete-date" type="date" value="${idea.build_complete || todayIso}">
            </div>
            <div class="form-actions">
              <button class="btn btn-secondary" id="cm-cancel-1">Cancel</button>
              <button class="btn btn-primary" id="cm-next-1">Next →</button>
            </div>
          </div>

          <!-- Step 2: Create Item -->
          <div id="cm-step-2" class="cm-step-panel" style="display:none">
            <h3>Create Item Record</h3>
            <div id="cm-step2-cost-summary" class="cm-cost-summary-display"></div>
            <div class="form-group">
              <label class="form-label" for="cm-short-name">Item Name <span class="required">*</span></label>
              <input class="form-input" id="cm-short-name" type="text" value="${_escAttr(idea.title)}" required>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label" for="cm-class">Class <span class="required">*</span></label>
                <select class="form-select" id="cm-class" required>
                  <option value="">— select —</option>
                  ${Object.keys(CLASS_TYPES).map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="cm-class-type">Type <span class="required">*</span></label>
                <select class="form-select" id="cm-class-type" required disabled>
                  <option value="">— select class first —</option>
                </select>
              </div>
            </div>

            <!-- Class-type specific fields (shown dynamically) -->
            <div id="cm-specific-fields"></div>

            <div class="form-group">
              <label class="form-label" for="cm-general-notes">Notes</label>
              <textarea class="form-textarea" id="cm-general-notes" rows="3"></textarea>
            </div>

            <div class="form-error" id="cm-step2-error" style="display:none"></div>
            <div class="form-actions">
              <button class="btn btn-secondary" id="cm-back-2">← Back</button>
              <button class="btn btn-primary" id="cm-next-2">Review →</button>
            </div>
          </div>

          <!-- Step 3: Submit -->
          <div id="cm-step-3" class="cm-step-panel" style="display:none">
            <h3>Confirm & Submit</h3>
            <div id="cm-review-summary" class="cm-review-summary"></div>
            <div class="form-error" id="cm-step3-error" style="display:none"></div>
            <div class="form-actions">
              <button class="btn btn-secondary" id="cm-back-3">← Back</button>
              <button class="btn btn-primary" id="cm-submit">Complete Build</button>
            </div>
          </div>

          <!-- Success State -->
          <div id="cm-success-state" class="cm-step-panel" style="display:none">
            <div class="cm-success">
              <div class="cm-success-check">&#10003;</div>
              <h3>Build Complete!</h3>
              <p>Item <strong id="cm-success-item-id">—</strong> created.</p>
              <div class="form-actions" style="margin-top:var(--space-6)">
                <button class="btn btn-secondary" id="cm-view-item-btn">View Item →</button>
                <button class="btn btn-primary" id="cm-back-ideas-btn">Back to Ideas</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // ── Event listeners ──────────────────────────────────────────────

  container.querySelector('#bd-back-btn').addEventListener('click', () => navigateTo('/workbench'));
  container.querySelector('#bd-edit-btn').addEventListener('click', () => navigateTo(`/${idea.id}/edit`));

  // Abandon
  container.querySelector('#bd-abandon-btn').addEventListener('click', () => {
    showConfirmModal({
      title: 'Abandon Build',
      message: `Abandon "${idea.title}"? It will be moved to Abandoned status.`,
      confirmLabel: 'Abandon',
      confirmDanger: true,
      onConfirm: async () => {
        try {
          await updateIdea({ id: idea.id, season: idea.season, title: idea.title, status: 'Abandoned' });
          showToast('Build abandoned', 'success');
          navigateTo('/');
        } catch (err) {
          showToast('Failed: ' + err.message, 'error');
        }
      }
    });
  });

  // Inline editable fields
  _attachInlineEdits(container, idea);

  // Materials
  _renderMaterials(container, idea, materials);

  // Build sessions
  _renderSessions(container, sessions, idea);
  _attachSessionForm(container, idea, sessions);

  // Log Cost modal
  _attachCostModal(container, idea);

  // Load costs
  _loadCosts(container, idea.id);

  // Pipeline clicks — advance to next stage
  _attachPipelineClicks(container, idea);

  // Build photos — load from images table, then wire upload
  _loadBuildPhotos(container, idea.id);
  _attachBuildPhotoUpload(container, idea);

  // Complete Build modal
  _attachCompleteModal(container, idea);
}

// ── Build Photo Upload ──────────────────────────────────────────────

async function _loadBuildPhotos(container, ideaId) {
  const grid = container.querySelector('#bd-photos-grid');
  if (!grid) return;
  try {
    const photos = await getIdeaPhotos(ideaId, 'build');
    if (!photos.length) return;
    grid.innerHTML = photos.map(p => `
      <a href="${_escAttr(p.cloudfront_url)}" target="_blank" rel="noopener" class="bd-photo-thumb">
        <img src="${_escAttr(p.thumb_cloudfront_url || p.cloudfront_url)}" loading="lazy">
      </a>`).join('');
  } catch {
    // silently fail — grid stays empty
  }
}

function _attachBuildPhotoUpload(container, idea) {
  const fileInput  = container.querySelector('#bd-photo-file-input');
  const addBtn     = container.querySelector('#bd-add-photo-btn');
  const statusEl   = container.querySelector('#bd-photo-status');
  if (!fileInput || !addBtn) return;

  addBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files);
    if (!files.length) return;

    addBtn.disabled = true;
    statusEl.textContent = 'Uploading…';
    statusEl.style.display = 'inline';

    try {
      const service = document.createElement('photo-upload-service');
      const result = await service.upload(files, {
        context: 'idea',
        photo_type: 'build',
        season: idea.season || '',
        idea_id: idea.id,
      });
      const newPhotos = result?.photos || [];
      if (!newPhotos.length) throw new Error('Upload failed');
      await _loadBuildPhotos(container, idea.id);

      statusEl.textContent = `${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added`;
      showToast('Build photos saved', 'success');
    } catch (err) {
      statusEl.textContent = 'Upload failed';
      showToast('Photo upload failed: ' + err.message, 'error');
    } finally {
      addBtn.disabled = false;
      fileInput.value = '';
      setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    }
  });
}

// ── Pipeline ────────────────────────────────────────────────────────

function _renderPipeline(currentStatus) {
  const currentIdx = PIPELINE_STAGES.indexOf(currentStatus);
  const stagesHtml = PIPELINE_STAGES.map((s, i) => {
    let cls = 'pipeline-stage';
    if (i < currentIdx) cls += ' past';
    else if (i === currentIdx) cls += ' active';
    const connector = i < PIPELINE_STAGES.length - 1
      ? `<div class="pipeline-connector${i < currentIdx ? ' past' : ''}"></div>`
      : '';
    return `<div class="${cls}" data-stage="${_escAttr(s)}">${_escHtml(s)}</div>${connector}`;
  }).join('');
  return `<div class="pipeline-bar">${stagesHtml}</div>`;
}

function _attachPipelineClicks(container, idea) {
  const currentIdx = PIPELINE_STAGES.indexOf(idea.status);
  container.querySelectorAll('.pipeline-stage').forEach((el, i) => {
    if (i === currentIdx + 1) {
      el.classList.add('clickable');
      el.title = `Advance to ${PIPELINE_STAGES[i]}`;
      el.addEventListener('click', async () => {
        const newStatus = PIPELINE_STAGES[i];
        try {
          await updateIdea({ id: idea.id, season: idea.season, title: idea.title, status: newStatus });
          showToast(`Moved to ${newStatus}`, 'success');
          if (newStatus === 'Built') {
            navigateTo('/');
          } else {
            window.location.reload();
          }
        } catch (err) {
          showToast('Failed: ' + err.message, 'error');
        }
      });
    }
  });
}

// ── Inline editable fields ──────────────────────────────────────────

function _attachInlineEdits(container, idea) {
  container.querySelectorAll('.bd-inline-field').forEach(wrapper => {
    const field = wrapper.dataset.field;
    const type  = wrapper.dataset.type;
    const display = wrapper.querySelector('.bd-field-display');
    if (!display || !field) return;

    display.classList.add('inline-editable');
    display.title = 'Click to edit';
    display.addEventListener('click', () => _startInlineEdit(wrapper, display, field, type, idea, container));
  });
}

function _startInlineEdit(wrapper, display, field, type, idea, container) {
  if (wrapper.querySelector('.bd-field-input')) return; // already editing

  const currentVal = idea[field] != null ? idea[field] : '';
  let input;

  if (type === 'textarea') {
    input = document.createElement('textarea');
    input.className = 'form-textarea bd-field-input';
    input.rows = 4;
    input.value = currentVal;
  } else {
    input = document.createElement('input');
    input.className = 'form-input bd-field-input';
    input.type = type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'url' ? 'url' : 'text';
    if (type === 'number') { input.min = '0'; input.step = '0.01'; }
    input.value = currentVal;
  }

  display.style.display = 'none';
  wrapper.appendChild(input);
  input.focus();

  const _save = async () => {
    const newVal = type === 'number'
      ? (input.value.trim() !== '' ? parseFloat(input.value) : null)
      : input.value.trim();

    input.remove();
    display.style.display = '';

    if (newVal === currentVal) return;
    if (newVal === '' && currentVal === '') return;

    try {
      await updateIdea({ id: idea.id, season: idea.season, title: idea.title, [field]: newVal });
      idea[field] = newVal;
      _refreshFieldDisplay(display, field, type, newVal);
      showToast('Saved', 'success');
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  };

  input.addEventListener('blur', _save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && type !== 'textarea') { e.preventDefault(); _save(); }
    if (e.key === 'Escape') { input.remove(); display.style.display = ''; }
  });
}

function _refreshFieldDisplay(display, field, type, newVal) {
  if (newVal == null || newVal === '') {
    display.classList.add('empty');
    display.textContent = '—';
    return;
  }
  display.classList.remove('empty');
  if (type === 'number') {
    display.textContent = field === 'estimated_cost' ? '$' + parseFloat(newVal).toFixed(2) : newVal;
  } else if (type === 'date') {
    display.textContent = _formatDate(newVal);
  } else if (type === 'url') {
    display.innerHTML = `<a href="${_escAttr(newVal)}" target="_blank" rel="noopener noreferrer">${_escHtml(newVal)}</a>`;
  } else {
    display.textContent = newVal;
  }
}

// ── Materials ───────────────────────────────────────────────────────

function _renderMaterials(container, idea, materials) {
  const list = container.querySelector('#bd-materials-list');
  if (!list) return;

  if (!materials.length) {
    list.innerHTML = '<div class="bd-empty-msg">No materials listed yet.</div>';
  } else {
    list.innerHTML = materials.map((m, i) => `
      <div class="bd-material-row" data-idx="${i}">
        <input type="checkbox" class="bd-mat-check" ${m.done ? 'checked' : ''} data-idx="${i}" aria-label="${_escAttr(m.name)}">
        <span class="bd-mat-name${m.done ? ' done' : ''}">${_escHtml(m.name)}</span>
        <button class="bd-mat-remove btn-icon" data-idx="${i}" aria-label="Remove">×</button>
      </div>
    `).join('');
  }

  // Checkbox toggle
  list.querySelectorAll('.bd-mat-check').forEach(cb => {
    cb.addEventListener('change', async () => {
      const idx = parseInt(cb.dataset.idx);
      materials[idx].done = cb.checked;
      try {
        await updateIdea({ id: idea.id, season: idea.season, title: idea.title, materials: [...materials] });
        idea.materials = [...materials];
        _renderMaterials(container, idea, materials);
      } catch (err) {
        showToast('Failed to save: ' + err.message, 'error');
      }
    });
  });

  // Remove
  list.querySelectorAll('.bd-mat-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.idx);
      materials.splice(idx, 1);
      try {
        await updateIdea({ id: idea.id, season: idea.season, title: idea.title, materials: [...materials] });
        idea.materials = [...materials];
        _renderMaterials(container, idea, materials);
      } catch (err) {
        showToast('Failed to save: ' + err.message, 'error');
      }
    });
  });

  // Add material
  const addInput = container.querySelector('#bd-add-mat-input');
  const addBtn   = container.querySelector('#bd-add-mat-btn');
  if (addBtn) {
    addBtn.onclick = async () => {
      const name = addInput?.value.trim();
      if (!name) return;
      materials.push({ name, done: false });
      try {
        await updateIdea({ id: idea.id, season: idea.season, title: idea.title, materials: [...materials] });
        idea.materials = [...materials];
        if (addInput) addInput.value = '';
        _renderMaterials(container, idea, materials);
      } catch (err) {
        showToast('Failed to save: ' + err.message, 'error');
      }
    };
  }
  if (addInput) {
    addInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addBtn?.click(); }
    });
  }
}

// ── Build Sessions ──────────────────────────────────────────────────

function _renderSessions(container, sessions, idea) {
  const list = container.querySelector('#bd-sessions-list');
  if (!list) return;

  if (!sessions.length) {
    list.innerHTML = '<div class="bd-empty-msg">No sessions logged yet.</div>';
    return;
  }

  const sorted = [...sessions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  list.innerHTML = sorted.map(s => `
    <div class="bd-session-row" data-id="${_escAttr(s.session_id)}">
      <div class="bd-session-meta">
        <span class="bd-session-date">${_formatDate(s.date)}</span>
        ${s.duration_min ? `<span class="bd-session-dur">${_formatDuration(s.duration_min)}</span>` : ''}
      </div>
      ${s.notes ? `<div class="bd-session-notes">${_escHtml(s.notes)}</div>` : ''}
    </div>
  `).join('');
}

function _attachSessionForm(container, idea, sessions) {
  const addBtn  = container.querySelector('#bd-add-session-btn');
  const form    = container.querySelector('#bd-session-form');
  const saveBtn = container.querySelector('#bs-save');
  const cancelBtn = container.querySelector('#bs-cancel');

  addBtn?.addEventListener('click', () => {
    form.style.display = 'block';
    addBtn.style.display = 'none';
    container.querySelector('#bs-notes')?.focus();
  });

  cancelBtn?.addEventListener('click', () => {
    form.style.display = 'none';
    addBtn.style.display = '';
    _clearSessionForm(container);
  });

  saveBtn?.addEventListener('click', async () => {
    const date     = container.querySelector('#bs-date')?.value;
    const durRaw   = container.querySelector('#bs-duration')?.value.trim();
    const notes    = container.querySelector('#bs-notes')?.value.trim();
    const duration_min = durRaw ? parseInt(durRaw) : null;

    if (!date) { showToast('Date is required', 'error'); return; }

    const suffix = Math.random().toString(36).slice(2, 6);
    const session_id = `sess-${date.replace(/-/g, '')}-${suffix}`;
    const newSession = { session_id, date, notes };
    if (duration_min) newSession.duration_min = duration_min;

    sessions.push(newSession);
    saveBtn.disabled = true;

    try {
      await updateIdea({ id: idea.id, season: idea.season, title: idea.title, build_sessions: [...sessions] });
      idea.build_sessions = [...sessions];
      _renderSessions(container, sessions, idea);
      form.style.display = 'none';
      addBtn.style.display = '';
      _clearSessionForm(container);
      showToast('Session saved', 'success');
    } catch (err) {
      sessions.pop();
      showToast('Failed to save session: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });
}

function _clearSessionForm(container) {
  const today = new Date().toISOString().slice(0, 10);
  const dateEl = container.querySelector('#bs-date');
  if (dateEl) dateEl.value = today;
  const durEl = container.querySelector('#bs-duration');
  if (durEl) durEl.value = '';
  const notesEl = container.querySelector('#bs-notes');
  if (notesEl) notesEl.value = '';
}

// ── Costs ───────────────────────────────────────────────────────────

function _attachCostModal(container, idea) {
  const modal  = container.querySelector('#bd-log-cost-modal');
  const _close = () => {
    modal.style.display = 'none';
    container.querySelector('#bd-log-cost-form')?.reset();
    const rn = container.querySelector('#bd-lc-receipt-name');
    if (rn) { rn.textContent = ''; rn.style.display = 'none'; }
    const rr = container.querySelector('#bd-lc-receipt-remove');
    if (rr) rr.style.display = 'none';
    container.querySelector('#bd-lc-error').style.display = 'none';
    const rf = container.querySelector('#bd-lc-receipt-file');
    if (rf) rf.value = '';
  };

  container.querySelector('#bd-log-cost-btn').addEventListener('click', () => {
    modal.style.display = 'flex';
    container.querySelector('#bd-lc-item-name')?.focus();
  });
  container.querySelector('#bd-lc-close').addEventListener('click', _close);
  container.querySelector('#bd-lc-cancel').addEventListener('click', _close);
  modal.addEventListener('click', e => { if (e.target === modal) _close(); });

  // Receipt picker
  const rf = container.querySelector('#bd-lc-receipt-file');
  const rn = container.querySelector('#bd-lc-receipt-name');
  const rr = container.querySelector('#bd-lc-receipt-remove');
  container.querySelector('#bd-lc-receipt-btn').addEventListener('click', () => rf.click());
  rf.addEventListener('change', () => {
    const f = rf.files[0];
    if (f) { rn.textContent = f.name; rn.style.display = 'inline'; rr.style.display = 'inline'; }
  });
  rr.addEventListener('click', () => {
    rf.value = ''; rn.textContent = ''; rn.style.display = 'none'; rr.style.display = 'none';
  });

  container.querySelector('#bd-log-cost-form').addEventListener('submit', async e => {
    e.preventDefault();
    await _handleLogCost(container, idea, () => _loadCosts(container, idea.id));
  });
}

async function _handleLogCost(container, idea, onSuccess) {
  const errorEl = container.querySelector('#bd-lc-error');
  errorEl.style.display = 'none';

  const itemName  = container.querySelector('#bd-lc-item-name').value.trim();
  const costType  = container.querySelector('#bd-lc-cost-type').value;
  const category  = container.querySelector('#bd-lc-category').value;
  const totalCost = container.querySelector('#bd-lc-total-cost').value.trim();
  const costDate  = container.querySelector('#bd-lc-cost-date').value;
  const store     = container.querySelector('#bd-lc-store').value.trim();
  const mfr       = container.querySelector('#bd-lc-manufacturer').value.trim();
  const notes     = container.querySelector('#bd-lc-notes').value.trim();
  const rf        = container.querySelector('#bd-lc-receipt-file');
  const file      = rf?.files[0] || null;

  if (!itemName || !totalCost || !costDate || !store) {
    errorEl.textContent = 'All required fields must be filled.';
    errorEl.style.display = 'block';
    return;
  }

  const submitBtn = container.querySelector('#bd-lc-submit');
  submitBtn.disabled = true;

  let receiptPayload = { no_receipt: true };
  if (file) {
    submitBtn.textContent = 'Uploading receipt…';
    try {
      const service = document.createElement('photo-upload-service');
      const result = await service.upload([file], {
        context: 'receipt', photo_type: 'receipt',
        season: idea.season || '', idea_id: idea.id
      });
      if (!result?.success) throw new Error('Upload failed');
      receiptPayload = { no_receipt: false, receipt_data: { url: result.photos[0]?.cloudfront_url } };
    } catch (err) {
      errorEl.textContent = 'Receipt upload failed: ' + err.message;
      errorEl.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Cost';
      return;
    }
  }

  submitBtn.textContent = 'Saving…';
  try {
    await createIdeaCost(idea.id, {
      item_name: itemName, cost_type: costType, category, total_cost: totalCost,
      cost_date: costDate, vendor: store, class_type: 'item',
      ...(mfr && { manufacturer: mfr }),
      ...(notes && { notes }), ...receiptPayload
    });
    showToast('Cost record saved', 'success');
    container.querySelector('#bd-log-cost-modal').style.display = 'none';
    container.querySelector('#bd-log-cost-form').reset();
    container.querySelector('#bd-lc-cost-date').value = new Date().toISOString().slice(0, 10);
    if (rf) rf.value = '';
    const rn = container.querySelector('#bd-lc-receipt-name');
    if (rn) { rn.textContent = ''; rn.style.display = 'none'; }
    const rr = container.querySelector('#bd-lc-receipt-remove');
    if (rr) rr.style.display = 'none';
    await onSuccess();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Cost';
  }
}

async function _loadCosts(container, ideaId) {
  const costsContent = container.querySelector('#bd-costs-content');
  if (!costsContent) return;

  let costs;
  try {
    costs = await getIdeaCosts(ideaId);
  } catch (err) {
    costsContent.innerHTML = `<span class="detail-field-value empty">Failed to load costs: ${_escHtml(err.message)}</span>`;
    return;
  }

  const total = costs.reduce((sum, c) => sum + (parseFloat(c.total_cost) || 0), 0);

  const summaryHtml = `
    <div class="costs-summary">
      <div class="costs-summary-item">
        <span class="costs-summary-label">Actual</span>
        <span class="costs-summary-value">$${total.toFixed(2)}</span>
      </div>
    </div>`;

  if (!costs.length) {
    costsContent.innerHTML = summaryHtml +
      `<div class="detail-field-value empty" style="margin-top:var(--space-3)">No cost records yet.</div>`;
    return;
  }

  const rowsHtml = costs.map(c => `
    <div class="cost-row">
      <div class="cost-row-main">
        <span class="cost-row-name">${_escHtml(c.item_name)}</span>
        <span class="cost-row-amount">$${parseFloat(c.total_cost).toFixed(2)}</span>
      </div>
      <div class="cost-row-meta">${_escHtml(c.vendor)} · ${_escHtml(c.cost_date)} · ${_escHtml(c.category)}</div>
    </div>
  `).join('');

  costsContent.innerHTML = summaryHtml + `<div class="cost-rows">${rowsHtml}</div>`;
}

// ── Complete Build Modal ─────────────────────────────────────────────

function _attachCompleteModal(container, idea) {
  const modal = container.querySelector('#bd-complete-modal');

  // Open
  container.querySelector('#bd-complete-btn').addEventListener('click', async () => {
    modal.style.display = 'flex';
    _goToStep(container, 1);
  });

  // Close — navigate to ideas root if build was completed, otherwise just hide
  const _closeModal = () => {
    const success = container.querySelector('#cm-success-state');
    if (success && success.style.display !== 'none') {
      navigateTo('/');
    } else {
      modal.style.display = 'none';
    }
  };
  container.querySelector('#bd-cm-close').addEventListener('click', _closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) _closeModal(); });

  // Step 1
  container.querySelector('#cm-cancel-1').addEventListener('click', _closeModal);
  container.querySelector('#cm-next-1').addEventListener('click', async () => {
    _goToStep(container, 2);
    const step2Summary = container.querySelector('#cm-step2-cost-summary');
    if (step2Summary) {
      step2Summary.innerHTML = '<div class="loading-spinner" style="margin:8px auto;width:18px;height:18px;border-width:2px"></div>';
      try {
        const costs = await getIdeaCosts(idea.id);
        const total = costs.reduce((s, c) => s + (parseFloat(c.total_cost) || 0), 0);
        const summaryHtml = `
          <div class="costs-summary">
            <div class="costs-summary-item">
              <span class="costs-summary-label">Actual</span>
              <span class="costs-summary-value">$${total.toFixed(2)}</span>
            </div>
          </div>`;
        const rowsHtml = costs.length
          ? costs.map(c => `
            <div class="cost-row">
              <div class="cost-row-main">
                <span class="cost-row-name">${_escHtml(c.item_name)}</span>
                <span class="cost-row-amount">$${parseFloat(c.total_cost).toFixed(2)}</span>
              </div>
            </div>`).join('')
          : '<div class="bd-empty-msg">No cost records logged.</div>';
        step2Summary.innerHTML = summaryHtml + `<div class="cost-rows">${rowsHtml}</div>`;
      } catch {
        step2Summary.innerHTML = '<span class="detail-field-value empty">Could not load costs.</span>';
      }
    }
  });

  // Step 2 — class/type cascade
  const classSelect    = container.querySelector('#cm-class');
  const classTypeSelect = container.querySelector('#cm-class-type');
  classSelect.addEventListener('change', () => {
    const cls = classSelect.value;
    classTypeSelect.disabled = !cls;
    classTypeSelect.innerHTML = cls
      ? `<option value="">— select —</option>` +
        CLASS_TYPES[cls].map(t => `<option value="${t}">${t}</option>`).join('')
      : `<option value="">— select class first —</option>`;
    _renderSpecificFields(container, cls, '');
  });
  classTypeSelect.addEventListener('change', () => {
    _renderSpecificFields(container, classSelect.value, classTypeSelect.value);
  });

  container.querySelector('#cm-back-2').addEventListener('click', () => _goToStep(container, 1));
  container.querySelector('#cm-next-2').addEventListener('click', () => {
    const err = container.querySelector('#cm-step2-error');
    err.style.display = 'none';
    if (!container.querySelector('#cm-short-name')?.value.trim()) {
      err.textContent = 'Item name is required.'; err.style.display = 'block'; return;
    }
    if (!classSelect.value) {
      err.textContent = 'Class is required.'; err.style.display = 'block'; return;
    }
    if (!classTypeSelect.value) {
      err.textContent = 'Type is required.'; err.style.display = 'block'; return;
    }
    _buildReviewSummary(container, idea);
    _goToStep(container, 3);
  });

  // Step 3
  container.querySelector('#cm-back-3').addEventListener('click', () => _goToStep(container, 2));
  container.querySelector('#cm-submit').addEventListener('click', () => _submitCompleteBuild(container, idea));

  // Success state
  container.querySelector('#cm-back-ideas-btn').addEventListener('click', () => navigateTo('/'));
  container.querySelector('#cm-view-item-btn').addEventListener('click', () => {
    const idEl = container.querySelector('#cm-success-item-id');
    const itemId = idEl?.textContent?.trim();
    if (itemId) window.open(`${ITEMS_BASE_URL}/items/${encodeURIComponent(itemId)}`, '_blank');
  });
}

function _goToStep(container, n) {
  [1, 2, 3].forEach(i => {
    const panel = container.querySelector(`#cm-step-${i}`);
    const dot   = container.querySelector(`#cm-step-dot-${i}`);
    if (panel) panel.style.display = i === n ? 'block' : 'none';
    if (dot) {
      dot.classList.toggle('active', i === n);
      dot.classList.toggle('past', i < n);
    }
  });
}

function _renderSpecificFields(container, cls, type) {
  const el = container.querySelector('#cm-specific-fields');
  if (!el) return;
  el.innerHTML = '';

  if (!cls || !type) return;

  const fields = [];

  if (cls === 'Decoration') {
    fields.push({ id: 'cm-height', label: 'Height/Length (ft)', name: 'height_length', ph: 'e.g. 3.5' });
    fields.push({ id: 'cm-tethers', label: 'Tethers', name: 'tethers', ph: '0' });
    fields.push({ id: 'cm-stakes', label: 'Stakes', name: 'stakes', ph: '0' });
    if (type === 'Inflatable' || type === 'Animatronic') {
      fields.push({ id: 'cm-adapter', label: 'Adapter', name: 'adapter', ph: '' });
    }
  }

  if (cls === 'Light') {
    fields.push({ id: 'cm-bulb-type', label: 'Bulb Type', name: 'bulb_type', ph: 'e.g. Built-In' });
    fields.push({ id: 'cm-color', label: 'Color', name: 'color', ph: 'e.g. Orange' });
    fields.push({ id: 'cm-amps', label: 'Amps', name: 'amps', ph: '' });
    fields.push({ id: 'cm-watts', label: 'Watts', name: 'watts', ph: '' });
    if (type === 'String Light') {
      fields.push({ id: 'cm-length', label: 'Length (ft)', name: 'length', ph: '' });
    }
    el.innerHTML += `
      <div class="cm-field-group">
        <div class="cm-field-group-title">Light Details</div>
        <label class="form-label" style="display:flex;align-items:center;gap:var(--space-2);cursor:pointer;margin-bottom:var(--space-3)">
          <input type="checkbox" id="cm-power-inlet" checked> Has Power Inlet
        </label>
      </div>`;
  }

  if (cls === 'Accessory') {
    fields.push({ id: 'cm-male-ends', label: 'Male Ends', name: 'male_ends', ph: '1' });
    fields.push({ id: 'cm-female-ends', label: 'Female Ends', name: 'female_ends', ph: '1' });
    fields.push({ id: 'cm-length', label: 'Length (ft)', name: 'length', ph: '' });
  }

  if (!fields.length) return;

  const groupTitle = cls === 'Decoration' ? 'Dimensions' : cls === 'Accessory' ? 'Connections' : '';

  const groupEl = document.createElement('div');
  groupEl.className = 'cm-field-group';
  if (groupTitle) groupEl.innerHTML = `<div class="cm-field-group-title">${groupTitle}</div>`;

  // Pair fields into rows of 2
  for (let i = 0; i < fields.length; i += 2) {
    const rowEl = document.createElement('div');
    rowEl.className = 'form-row';
    [fields[i], fields[i + 1]].filter(Boolean).forEach(f => {
      rowEl.innerHTML += `
        <div class="form-group">
          <label class="form-label" for="${f.id}">${f.label}</label>
          <input class="form-input" id="${f.id}" type="text" data-field="${f.name}" placeholder="${_escAttr(f.ph)}">
        </div>`;
    });
    groupEl.appendChild(rowEl);
  }

  el.appendChild(groupEl);
}

function _buildReviewSummary(container, idea) {
  const el = container.querySelector('#cm-review-summary');
  if (!el) return;

  const name  = container.querySelector('#cm-short-name')?.value.trim();
  const cls   = container.querySelector('#cm-class')?.value;
  const type  = container.querySelector('#cm-class-type')?.value;
  const date  = container.querySelector('#cm-complete-date')?.value;

  el.innerHTML = `
    <div class="review-row"><span>Item Name</span><strong>${_escHtml(name)}</strong></div>
    <div class="review-row"><span>Class / Type</span><strong>${_escHtml(cls)} / ${_escHtml(type)}</strong></div>
    <div class="review-row"><span>Season</span><strong>${_escHtml(idea.season)}</strong></div>
    <div class="review-row"><span>Completion Date</span><strong>${date ? _formatDate(date) : '—'}</strong></div>
  `;
}

async function _submitCompleteBuild(container, idea) {
  const submitBtn = container.querySelector('#cm-submit');
  const errEl     = container.querySelector('#cm-step3-error');
  errEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating item…';

  try {
    const cls       = container.querySelector('#cm-class')?.value;
    const classType = container.querySelector('#cm-class-type')?.value;
    const shortName = container.querySelector('#cm-short-name')?.value.trim();
    const complDate = container.querySelector('#cm-complete-date')?.value;

    const itemBody = {
      short_name:    shortName,
      class:         cls,
      class_type:    classType,
      season:        idea.season,
      status:        'Active',
      general_notes: container.querySelector('#cm-general-notes')?.value.trim() || '',
      date_acquired: String(new Date().getFullYear()),
      // Build lineage
      build_data: {
        idea_build:      true,
        related_idea_id: idea.id,
      },
    };

    // Class-specific fields
    if (cls === 'Decoration') {
      itemBody.height_length = container.querySelector('#cm-height')?.value.trim() || '';
      itemBody.tethers       = container.querySelector('#cm-tethers')?.value.trim() || '0';
      itemBody.stakes        = container.querySelector('#cm-stakes')?.value.trim() || '0';
      const adapterEl = container.querySelector('#cm-adapter');
      if (adapterEl) itemBody.adapter = adapterEl.value.trim();
    }
    if (cls === 'Light') {
      itemBody.bulb_type = container.querySelector('#cm-bulb-type')?.value.trim() || '';
      itemBody.color     = container.querySelector('#cm-color')?.value.trim() || '';
      // amps/watts — flat, not nested in power_data
      itemBody.amps      = container.querySelector('#cm-amps')?.value.trim() || '';
      itemBody.watts     = container.querySelector('#cm-watts')?.value.trim() || '';
      const lenEl = container.querySelector('#cm-length');
      if (lenEl) itemBody.length = lenEl.value.trim();
    }
    if (cls === 'Accessory') {
      itemBody.male_ends   = container.querySelector('#cm-male-ends')?.value.trim() || '1';
      itemBody.female_ends = container.querySelector('#cm-female-ends')?.value.trim() || '1';
      const lenEl = container.querySelector('#cm-length');
      if (lenEl) itemBody.length = lenEl.value.trim();
    }

    // Step 1: Create item
    const itemResult = await createItem(itemBody);
    const item_id    = itemResult?.confirmation?.id
                    || itemResult?.preview?.id;
    if (!item_id) throw new Error('Item created but no ID returned');

    // Step 2: Update idea
    submitBtn.textContent = 'Finishing build…';
    await updateIdea({
      id: idea.id, season: idea.season, title: idea.title,
      status: 'Built',
      build_complete: complDate || new Date().toISOString().slice(0, 10),
      item_id,
      related_item_id: item_id,
    });

    // Show success state in modal
    container.querySelector('#cm-step-3').style.display = 'none';
    container.querySelector('#cm-success-item-id').textContent = item_id;
    container.querySelector('#cm-success-state').style.display = 'block';
  } catch (err) {
    errEl.textContent = 'Error: ' + err.message;
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Complete Build';
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

function _formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return iso; }
}

function _formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

function _escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _escAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
