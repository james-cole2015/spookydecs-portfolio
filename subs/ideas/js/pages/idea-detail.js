// Idea Detail Page

import { getIdea, updateIdea, deleteIdea, getIdeaCosts, createIdeaCost, getIdeaPhotos } from '../utils/ideas-api.js';
import { navigateTo } from '../utils/router.js';
import { showToast } from '../shared/toast.js';
import { showConfirmModal } from '../shared/modal.js';
import { ITEMS_BASE_URL } from '../utils/ideas-config.js';

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

const COST_TYPES = ['build', 'supply_purchase', 'other'];
const COST_CATEGORIES = ['materials', 'labor', 'parts', 'consumables', 'decoration', 'light', 'accessory', 'other'];

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

  const materialsHtml = (idea.materials || []).length
    ? `<ul class="materials-list">${idea.materials.map(m => {
        const mat = typeof m === 'string' ? { name: m, done: false } : m;
        return `<li${mat.done ? ' class="done"' : ''}>${_escHtml(mat.name)}</li>`;
      }).join('')}</ul>`
    : '<span class="detail-field-value empty">None listed</span>';

  const buildFields = [
    { label: 'Prep Start',     value: idea.prep_start },
    { label: 'Build Start',    value: idea.build_start },
    { label: 'Build Complete', value: idea.build_complete },
  ].map(f => `
    <div class="detail-field">
      <div class="detail-field-label">${f.label}</div>
      <div class="detail-field-value${!f.value ? ' empty' : ''}">${f.value ? _formatDate(f.value) : '—'}</div>
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
        <span>${_escHtml(idea.title)}</span>
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
          <a href="${ITEMS_BASE_URL}/items/${_escAttr(idea.item_id)}" target="_blank">View Item →</a>
        </div>` : ''}
        <h1 class="detail-title">${_escHtml(idea.title)}</h1>
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
            <div class="detail-field-value${!idea.description ? ' empty' : ''}">${idea.description ? _escHtml(idea.description) : 'No description provided.'}</div>
          </div>

          ${idea.notes ? `
          <div class="detail-section">
            <div class="detail-section-title">Notes</div>
            <div class="detail-field-value">${_escHtml(idea.notes)}</div>
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
                  ? `<a href="${ITEMS_BASE_URL}/items/${_escAttr(idea.item_id)}" target="_blank">${_escHtml(idea.item_id)}</a>`
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
            <div class="detail-section-title-row">
              <span class="detail-section-title" style="margin-bottom:0">Photos</span>
              ${idea.status !== 'Built' ? `<button type="button" class="btn btn-sm btn-secondary" id="id-add-photo-btn">+ Add Photo</button>` : ''}
            </div>
            <input id="id-photo-file-input" type="file" multiple accept="image/*" style="display:none">
            <span id="id-photo-status" style="display:none;font-size:0.85rem;color:var(--color-text-muted);margin-top:var(--space-2)"></span>
            <div id="id-photos-grid" class="bd-photos-grid" style="margin-top:var(--space-3)"></div>
          </div>

        </div>

        <div class="detail-sidebar">
          <div class="detail-section">
            <div class="detail-section-title">Info</div>

            <div class="detail-field">
              <div class="detail-field-label">Season</div>
              <div class="detail-field-value">${_escHtml(idea.season)}</div>
            </div>

            <div class="detail-field">
              <div class="detail-field-label">Status</div>
              <div class="detail-field-value">${_escHtml(idea.status)}</div>
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

    <!-- Log Cost Modal -->
    <div class="log-cost-backdrop" id="log-cost-modal" style="display:none" role="dialog" aria-modal="true" aria-label="Log Cost">
      <div class="log-cost-modal">
        <div class="log-cost-modal-header">
          <h2>Log Cost</h2>
          <button class="log-cost-close" id="log-cost-close" aria-label="Close">&times;</button>
        </div>
        <form id="log-cost-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="lc-item-name">Item / Description <span class="required">*</span></label>
            <input class="form-input" id="lc-item-name" type="text" placeholder="e.g. 3/4 inch PVC pipe" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="lc-cost-type">Cost Type <span class="required">*</span></label>
              <select class="form-select" id="lc-cost-type" required>
                ${COST_TYPES.map(t => `<option value="${t}"${t === 'build' ? ' selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="lc-category">Category <span class="required">*</span></label>
              <select class="form-select" id="lc-category" required>
                ${COST_CATEGORIES.map(c => `<option value="${c}"${c === 'materials' ? ' selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="lc-total-cost">Total Cost ($) <span class="required">*</span></label>
              <input class="form-input" id="lc-total-cost" type="number" min="0.01" step="0.01" placeholder="0.00" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="lc-cost-date">Date <span class="required">*</span></label>
              <input class="form-input" id="lc-cost-date" type="date" value="${todayIso}" required>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="lc-store">Store <span class="required">*</span></label>
              <input class="form-input" id="lc-store" type="text" placeholder="e.g. Home Depot" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="lc-manufacturer">Brand / Manufacturer</label>
              <input class="form-input" id="lc-manufacturer" type="text" placeholder="e.g. Spirit Halloween">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Receipt (optional)</label>
            <div class="lc-receipt-row">
              <input id="lc-receipt-file" type="file" accept="image/*,application/pdf" style="display:none">
              <button type="button" class="btn btn-secondary btn-sm" id="lc-receipt-btn">Attach Receipt</button>
              <span class="lc-receipt-name" id="lc-receipt-name" style="display:none"></span>
              <button type="button" class="btn-link lc-receipt-remove" id="lc-receipt-remove" style="display:none" aria-label="Remove receipt">✕</button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="lc-notes">Notes</label>
            <input class="form-input" id="lc-notes" type="text" placeholder="Optional">
          </div>
          <div class="form-error" id="lc-error" style="display:none"></div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" id="lc-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary" id="lc-submit">Save Cost</button>
          </div>
        </form>
      </div>
    </div>
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
  // Log Cost modal
  const modal = container.querySelector('#log-cost-modal');
  const _closeModal = () => {
    modal.style.display = 'none';
    const rf = container.querySelector('#lc-receipt-file');
    if (rf) rf.value = '';
    const rn = container.querySelector('#lc-receipt-name');
    if (rn) { rn.textContent = ''; rn.style.display = 'none'; }
    const rr = container.querySelector('#lc-receipt-remove');
    if (rr) rr.style.display = 'none';
  };

  container.querySelector('#log-cost-btn').addEventListener('click', () => {
    modal.style.display = 'flex';
    container.querySelector('#lc-item-name').focus();
  });
  container.querySelector('#log-cost-close').addEventListener('click', _closeModal);
  container.querySelector('#lc-cancel').addEventListener('click', _closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) _closeModal(); });

  // Receipt picker
  const receiptFile = container.querySelector('#lc-receipt-file');
  const receiptName = container.querySelector('#lc-receipt-name');
  const receiptRemove = container.querySelector('#lc-receipt-remove');
  container.querySelector('#lc-receipt-btn').addEventListener('click', () => receiptFile.click());
  receiptFile.addEventListener('change', () => {
    const f = receiptFile.files[0];
    if (f) {
      receiptName.textContent = f.name;
      receiptName.style.display = 'inline';
      receiptRemove.style.display = 'inline';
    }
  });
  receiptRemove.addEventListener('click', () => {
    receiptFile.value = '';
    receiptName.textContent = '';
    receiptName.style.display = 'none';
    receiptRemove.style.display = 'none';
  });

  container.querySelector('#log-cost-form').addEventListener('submit', async e => {
    e.preventDefault();
    await _handleLogCost(container, idea, () => _loadCosts(container, idea.id));
  });

  // Load linked costs
  _loadCosts(container, idea.id);
  } // end status !== 'Considering'

  // Photos — load from images table, then wire upload
  _loadPhotos(container, idea.id);
  _attachPhotoUpload(container, idea);
}

async function _loadPhotos(container, ideaId) {
  const grid = container.querySelector('#id-photos-grid');
  if (!grid) return;
  try {
    const photos = await getIdeaPhotos(ideaId);
    if (!photos.length) return;
    grid.innerHTML = photos.map(p => `
      <a href="${_escAttr(p.cloudfront_url)}" target="_blank" rel="noopener" class="bd-photo-thumb">
        <img src="${_escAttr(p.thumb_cloudfront_url || p.cloudfront_url)}" loading="lazy">
      </a>`).join('');
  } catch {
    // silently fail — photos section just stays empty
  }
}

function _attachPhotoUpload(container, idea) {
  const fileInput = container.querySelector('#id-photo-file-input');
  const addBtn    = container.querySelector('#id-add-photo-btn');
  const statusEl  = container.querySelector('#id-photo-status');
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
        context:    'idea',
        photo_type: 'inspiration',
        season:     (idea.season || 'Shared').toLowerCase(),
        idea_id:    idea.id,
      });
      const newPhotos = result?.photos || [];
      if (!newPhotos.length) throw new Error('Upload failed');
      await _loadPhotos(container, idea.id);

      statusEl.textContent = `${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added`;
      showToast('Photos saved', 'success');
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

async function _loadCosts(container, ideaId) {
  const costsContent = container.querySelector('#costs-content');
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
    </div>
  `;

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

async function _handleLogCost(container, idea, onSuccess) {
  const errorEl = container.querySelector('#lc-error');
  errorEl.style.display = 'none';
  errorEl.textContent = '';

  const itemName  = container.querySelector('#lc-item-name').value.trim();
  const costType  = container.querySelector('#lc-cost-type').value;
  const category  = container.querySelector('#lc-category').value;
  const totalCost = container.querySelector('#lc-total-cost').value.trim();
  const costDate  = container.querySelector('#lc-cost-date').value;
  const store     = container.querySelector('#lc-store').value.trim();
  const mfr       = container.querySelector('#lc-manufacturer').value.trim();
  const notes     = container.querySelector('#lc-notes').value.trim();
  const receiptFile = container.querySelector('#lc-receipt-file');
  const file = receiptFile?.files[0] || null;

  if (!itemName || !costType || !category || !totalCost || !costDate || !store) {
    errorEl.textContent = 'All required fields must be filled.';
    errorEl.style.display = 'block';
    return;
  }

  const submitBtn = container.querySelector('#lc-submit');
  submitBtn.disabled = true;

  let receiptPayload = { no_receipt: true };

  if (file) {
    submitBtn.textContent = 'Uploading receipt…';
    try {
      const service = document.createElement('photo-upload-service');
      const result = await service.upload([file], {
        context: 'receipt',
        photo_type: 'receipt',
        season: (idea.season || 'Shared').toLowerCase(),
        idea_id: idea.id,
      });
      if (!result?.success) throw new Error('Upload failed');
      const url = result.photos[0]?.cloudfront_url;
      receiptPayload = { no_receipt: false, receipt_data: { url } };
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
      item_name: itemName,
      cost_type: costType,
      category,
      total_cost: totalCost,
      cost_date: costDate,
      vendor: store,
      ...(mfr && { manufacturer: mfr }),
      ...(notes && { notes }),
      class_type: 'item',
      ...receiptPayload,
    });
    showToast('Cost record saved', 'success');
    container.querySelector('#log-cost-modal').style.display = 'none';
    container.querySelector('#log-cost-form').reset();
    container.querySelector('#lc-cost-date').value = new Date().toISOString().slice(0, 10);
    if (receiptFile) receiptFile.value = '';
    const rn = container.querySelector('#lc-receipt-name');
    if (rn) { rn.textContent = ''; rn.style.display = 'none'; }
    const rr = container.querySelector('#lc-receipt-remove');
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
  if (!iso) return '';
  try {
    return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  } catch { return iso; }
}

function _escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _escAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
