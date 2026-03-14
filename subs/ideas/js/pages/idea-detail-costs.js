// Idea Detail — Costs section helpers

import { getIdeaCosts, createIdeaCost } from '../utils/ideas-api.js';
import { showToast } from '../shared/toast.js';

const COST_TYPES = ['build', 'supply_purchase', 'other'];
const COST_CATEGORIES = ['materials', 'labor', 'parts', 'consumables', 'decoration', 'light', 'accessory', 'other'];

export function getCostFormConstants() {
  return { COST_TYPES, COST_CATEGORIES };
}

export async function loadCosts(container, ideaId) {
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

  let financeUrl = '';
  try {
    const config = await window.SpookyConfig.get();
    financeUrl = config.finance_url || '';
  } catch { /* leave empty — links just won't render */ }

  const rowsHtml = costs.map(c => {
    const nameHtml = (financeUrl && c.cost_id)
      ? `<a href="${_escAttr(financeUrl)}/costs/${_escAttr(c.cost_id)}" target="_blank" rel="noopener noreferrer" class="cost-row-link">${_escHtml(c.item_name)}</a>`
      : _escHtml(c.item_name);
    return `
    <div class="cost-row">
      <div class="cost-row-main">
        <span class="cost-row-name">${nameHtml}</span>
        <span class="cost-row-amount">$${parseFloat(c.total_cost).toFixed(2)}</span>
      </div>
      <div class="cost-row-meta">${_escHtml(c.vendor)} · ${_escHtml(c.cost_date)} · ${_escHtml(c.category)}</div>
    </div>
  `}).join('');

  costsContent.innerHTML = summaryHtml + `<div class="cost-rows">${rowsHtml}</div>`;
}

export function getCostModalHtml(todayIso) {
  const typeOptions = COST_TYPES.map(t => `<option value="${t}"${t === 'build' ? ' selected' : ''}>${t}</option>`).join('');
  const catOptions  = COST_CATEGORIES.map(c => `<option value="${c}"${c === 'materials' ? ' selected' : ''}>${c}</option>`).join('');
  return `
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
              <select class="form-select" id="lc-cost-type" required>${typeOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label" for="lc-category">Category <span class="required">*</span></label>
              <select class="form-select" id="lc-category" required>${catOptions}</select>
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
    </div>`;
}

export function wireCostModal(container, idea) {
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

  const receiptFile   = container.querySelector('#lc-receipt-file');
  const receiptName   = container.querySelector('#lc-receipt-name');
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
    await handleLogCost(container, idea, () => loadCosts(container, idea.id));
  });

  loadCosts(container, idea.id);
}

export async function handleLogCost(container, idea, onSuccess) {
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

function _escHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function _escAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
