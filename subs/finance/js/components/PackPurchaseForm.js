// Pack Purchase Form Component
// Handles the pack purchase creation flow: multi-item picker, derived fields, submit.

import { createCost, getItems, updateImageAfterCostCreation } from '../utils/finance-api.js';
import { formatCurrency } from '../utils/finance-config.js';
import { toast } from '../shared/toast.js';

export class PackPurchaseForm {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.allItems = [];
    this.selectedItems = []; // array of full item objects
    this.pendingReceiptFile = null;

    const today = new Date().toISOString().split('T')[0];
    this.formData = {
      item_name: 'Pack Purchase',
      cost_date: today,
      vendor: '',
      manufacturer: '',
      total_cost: '',
      description: '',
      notes: ''
    };
  }

  async render() {
    this.container.innerHTML = `<div class="pack-form-loading">Loading items...</div>`;

    try {
      const result = await getItems();
      // Handle both { items: [...] } and array responses
      this.allItems = Array.isArray(result) ? result : (result.items || []);
    } catch (e) {
      console.error('Failed to load items for pack picker:', e);
      this.allItems = [];
    }

    this._renderForm();
    this._attachListeners();
  }

  _renderForm() {
    this.container.innerHTML = `
      <form class="pack-purchase-form" id="pack-purchase-form" novalidate>
        <div class="pack-form-section">
          <h3 class="pack-form-section-title">Pack Details</h3>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="pack-item-name">Pack Name</label>
              <input
                type="text"
                id="pack-item-name"
                class="form-input"
                value="${this._escape(this.formData.item_name)}"
                placeholder="e.g. Halloween Spotlight Pack"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="pack-vendor">Vendor / Store <span class="required">*</span></label>
              <input
                type="text"
                id="pack-vendor"
                class="form-input"
                value="${this._escape(this.formData.vendor)}"
                placeholder="e.g. Home Depot"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="pack-manufacturer">Manufacturer / Brand</label>
              <input
                type="text"
                id="pack-manufacturer"
                class="form-input"
                value="${this._escape(this.formData.manufacturer)}"
                placeholder="e.g. Gemmy"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="pack-cost-date">Purchase Date <span class="required">*</span></label>
              <input
                type="date"
                id="pack-cost-date"
                class="form-input"
                value="${this.formData.cost_date}"
              />
            </div>
            <div class="form-group">
              <label class="form-label" for="pack-total-cost">Total Cost ($) <span class="required">*</span></label>
              <input
                type="number"
                id="pack-total-cost"
                class="form-input"
                value="${this.formData.total_cost}"
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div class="form-group full-width">
            <label class="form-label" for="pack-description">Description (optional)</label>
            <textarea
              id="pack-description"
              class="form-input"
              rows="2"
              placeholder="Add any notes about this pack purchase..."
            >${this._escape(this.formData.description)}</textarea>
          </div>
        </div>

        <div class="pack-form-section">
          <h3 class="pack-form-section-title">Receipt</h3>
          <p class="pack-form-hint">Optionally attach a receipt image or PDF for this purchase.</p>
          <div class="receipt-attach-zone" id="receipt-attach-zone">
            <input type="file" id="pack-receipt-input" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" style="display:none" />
            <div id="receipt-attach-idle">
              <button type="button" class="btn-secondary btn-sm" id="btn-attach-receipt">Attach Receipt</button>
              <span class="receipt-attach-hint">JPEG, PNG, WebP, or PDF · Max 10 MB</span>
            </div>
            <div class="receipt-attach-preview" id="receipt-attach-preview" style="display:none">
              <span class="receipt-file-icon">📄</span>
              <span class="receipt-preview-name" id="receipt-preview-name"></span>
              <button type="button" class="receipt-remove-btn" id="btn-remove-receipt">Remove</button>
            </div>
          </div>
        </div>

        <div class="pack-form-section">
          <h3 class="pack-form-section-title">Items in Pack <span class="required">*</span></h3>
          <p class="pack-form-hint">Search for items and add them to this pack. Each item will receive the per-item cost.</p>

          <div class="item-picker" id="item-picker">
            <div class="item-picker-search-wrap">
              <input
                type="text"
                id="item-picker-search"
                class="form-input item-picker-search"
                placeholder="Search by name or ID..."
                autocomplete="off"
              />
            </div>
            <div class="item-picker-results" id="item-picker-results" style="display:none;"></div>
          </div>

          <div class="selected-items-chips" id="selected-items-chips">
            <span class="no-items-hint" id="no-items-hint">No items selected yet.</span>
          </div>
        </div>

        <div class="pack-derived-fields" id="pack-derived-fields">
          <h3 class="pack-form-section-title">Summary</h3>
          <div class="pack-derived-grid">
            <div class="pack-derived-item">
              <span class="pack-derived-label">Items Selected</span>
              <span class="pack-derived-value" id="derived-item-count">0</span>
            </div>
            <div class="pack-derived-item">
              <span class="pack-derived-label">Total Cost</span>
              <span class="pack-derived-value" id="derived-total-cost">$0.00</span>
            </div>
            <div class="pack-derived-item highlight">
              <span class="pack-derived-label">Cost Per Item</span>
              <span class="pack-derived-value" id="derived-cost-per-item">$0.00</span>
            </div>
            <div class="pack-derived-item highlight">
              <span class="pack-derived-label">Value Per Item</span>
              <span class="pack-derived-value" id="derived-value-per-item">$0.00</span>
            </div>
          </div>
        </div>

        <div class="pack-form-actions">
          <button type="submit" class="btn-primary" id="btn-pack-submit">Review & Save Pack</button>
          <a href="/" class="btn-secondary">Cancel</a>
        </div>
      </form>
    `;
  }

  _attachListeners() {
    const form = document.getElementById('pack-purchase-form');
    const searchInput = document.getElementById('item-picker-search');
    const resultsEl = document.getElementById('item-picker-results');

    // Live field sync
    document.getElementById('pack-item-name').addEventListener('input', (e) => {
      this.formData.item_name = e.target.value;
    });
    document.getElementById('pack-vendor').addEventListener('input', (e) => {
      this.formData.vendor = e.target.value;
    });
    document.getElementById('pack-manufacturer').addEventListener('input', (e) => {
      this.formData.manufacturer = e.target.value;
    });
    document.getElementById('pack-cost-date').addEventListener('change', (e) => {
      this.formData.cost_date = e.target.value;
    });
    document.getElementById('pack-total-cost').addEventListener('input', (e) => {
      this.formData.total_cost = e.target.value;
      this._updateDerivedFields();
    });
    document.getElementById('pack-description').addEventListener('input', (e) => {
      this.formData.description = e.target.value;
    });

    // Receipt attach
    const receiptInput = document.getElementById('pack-receipt-input');
    const attachBtn = document.getElementById('btn-attach-receipt');
    const removeBtn = document.getElementById('btn-remove-receipt');

    if (attachBtn) {
      attachBtn.addEventListener('click', () => receiptInput.click());
    }
    if (receiptInput) {
      receiptInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        let processedFile = file;
        if (file.type === 'application/pdf') {
          try {
            processedFile = await this._convertPdfToImage(file);
          } catch (err) {
            console.error('PDF conversion failed:', err);
            toast.error('Failed to convert PDF to image. Please use JPEG or PNG instead.');
            receiptInput.value = '';
            return;
          }
        }

        this.pendingReceiptFile = processedFile;
        document.getElementById('receipt-preview-name').textContent = processedFile.name;
        document.getElementById('receipt-attach-idle').style.display = 'none';
        document.getElementById('receipt-attach-preview').style.display = 'flex';
      });
    }
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        this.pendingReceiptFile = null;
        receiptInput.value = '';
        document.getElementById('receipt-attach-idle').style.display = '';
        document.getElementById('receipt-attach-preview').style.display = 'none';
      });
    }

    // Item picker search
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) {
        resultsEl.style.display = 'none';
        return;
      }
      this._renderPickerResults(query, resultsEl);
    });

    // Close picker dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#item-picker')) {
        resultsEl.style.display = 'none';
      }
    });

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._handleSubmit();
    });
  }

  _renderPickerResults(query, resultsEl) {
    const alreadySelectedIds = new Set(this.selectedItems.map(i => i.id));
    const matches = this.allItems.filter(item => {
      if (alreadySelectedIds.has(item.id)) return false;
      const name = (item.short_name || item.shortName || '').toLowerCase();
      const id = (item.id || '').toLowerCase();
      return name.includes(query) || id.includes(query);
    }).slice(0, 10);

    if (matches.length === 0) {
      resultsEl.innerHTML = '<div class="item-picker-no-results">No items found</div>';
    } else {
      resultsEl.innerHTML = matches.map(item => {
        const name = item.short_name || item.shortName || item.id;
        const cls = item.class || item.type || '';
        return `
          <div class="item-picker-result" data-item-id="${this._escape(item.id)}">
            <span class="item-picker-result-name">${this._escape(name)}</span>
            <span class="item-picker-result-meta">${this._escape(item.id)} · ${this._escape(cls)}</span>
          </div>
        `;
      }).join('');

      resultsEl.querySelectorAll('.item-picker-result').forEach(el => {
        el.addEventListener('click', () => {
          const itemId = el.dataset.itemId;
          const item = this.allItems.find(i => i.id === itemId);
          if (item) this._addItem(item);
          document.getElementById('item-picker-search').value = '';
          resultsEl.style.display = 'none';
        });
      });
    }

    resultsEl.style.display = 'block';
  }

  _addItem(item) {
    this.selectedItems.push(item);
    this._renderChips();
    this._updateDerivedFields();
  }

  _removeItem(itemId) {
    this.selectedItems = this.selectedItems.filter(i => i.id !== itemId);
    this._renderChips();
    this._updateDerivedFields();
  }

  _renderChips() {
    const chipsEl = document.getElementById('selected-items-chips');
    const hintEl = document.getElementById('no-items-hint');

    if (this.selectedItems.length === 0) {
      chipsEl.innerHTML = '<span class="no-items-hint" id="no-items-hint">No items selected yet.</span>';
      return;
    }

    chipsEl.innerHTML = this.selectedItems.map(item => {
      const name = item.short_name || item.shortName || item.id;
      return `
        <div class="item-chip" data-item-id="${this._escape(item.id)}">
          <span class="item-chip-name">${this._escape(name)}</span>
          <span class="item-chip-id">${this._escape(item.id)}</span>
          <button type="button" class="item-chip-remove" data-item-id="${this._escape(item.id)}" title="Remove">×</button>
        </div>
      `;
    }).join('');

    chipsEl.querySelectorAll('.item-chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        this._removeItem(btn.dataset.itemId);
      });
    });
  }

  _updateDerivedFields() {
    const count = this.selectedItems.length;
    const total = parseFloat(this.formData.total_cost) || 0;
    const perItem = count > 0 ? total / count : 0;

    const countEl = document.getElementById('derived-item-count');
    const totalEl = document.getElementById('derived-total-cost');
    const perItemCostEl = document.getElementById('derived-cost-per-item');
    const perItemValEl = document.getElementById('derived-value-per-item');

    if (countEl) countEl.textContent = count;
    if (totalEl) totalEl.textContent = formatCurrency(total);
    if (perItemCostEl) perItemCostEl.textContent = formatCurrency(perItem);
    if (perItemValEl) perItemValEl.textContent = formatCurrency(perItem);
  }

  _validate() {
    const errors = [];
    if (!this.formData.vendor.trim()) errors.push('Vendor is required');
    if (!this.formData.cost_date) errors.push('Purchase date is required');
    const total = parseFloat(this.formData.total_cost);
    if (!total || total <= 0) errors.push('Total cost must be greater than $0');
    if (this.selectedItems.length === 0) errors.push('At least one item must be selected');
    return errors;
  }

  async _handleSubmit() {
    const errors = this._validate();
    if (errors.length > 0) {
      toast.error(errors.join(' · '));
      return;
    }

    const total = parseFloat(this.formData.total_cost);
    const perItem = total / this.selectedItems.length;

    // Show a simple confirmation
    const itemList = this.selectedItems.map(i => (i.short_name || i.shortName || i.id)).join(', ');
    const confirmed = window.confirm(
      `Create pack purchase?\n\n` +
      `Items: ${itemList}\n` +
      `Total: ${formatCurrency(total)}\n` +
      `Cost per item: ${formatCurrency(perItem)}\n` +
      `Vendor: ${this.formData.vendor}`
    );
    if (!confirmed) return;

    const submitBtn = document.getElementById('btn-pack-submit');
    if (submitBtn) submitBtn.disabled = true;

    // Upload receipt first if one was attached
    let receiptData = null;
    if (this.pendingReceiptFile) {
      try {
        toast.info('Uploading receipt...');
        const service = document.createElement('photo-upload-service');
        const uploadResult = await service.upload([this.pendingReceiptFile], {
          context: 'receipt',
          photo_type: 'receipt',
          season: 'shared'
        });
        const photo = uploadResult.photos[0];
        receiptData = {
          image_id: uploadResult.photo_ids[0],
          s3_key: photo.s3_key,
          cloudfront_url: photo.cloudfront_url,
          file_name: this.pendingReceiptFile.name,
          file_type: this.pendingReceiptFile.type,
          file_size: this.pendingReceiptFile.size
        };
      } catch (err) {
        console.error('Failed to upload receipt:', err);
        toast.error(`Receipt upload failed: ${err.message}`);
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
    }

    const payload = {
      class_type: 'pack',
      cost_type: 'acquisition',
      category: 'other',
      item_name: this.formData.item_name.trim() || 'Pack Purchase',
      cost_date: this.formData.cost_date,
      vendor: this.formData.vendor.trim(),
      total_cost: total,
      pack_item_ids: this.selectedItems.map(i => i.id),
      no_receipt: receiptData === null,
      quantity: this.selectedItems.length,
      unit_cost: perItem,
      ...(receiptData ? { receipt_data: receiptData, image_id: receiptData.image_id } : {}),
      ...(this.formData.manufacturer.trim() ? { manufacturer: this.formData.manufacturer.trim() } : {}),
      ...(this.formData.description.trim() ? { description: this.formData.description.trim() } : {})
    };

    try {
      toast.info('Saving pack purchase...');
      const newCost = await createCost(payload);

      // Finalize receipt: move pending → processed and link to cost record
      if (receiptData?.image_id && newCost?.cost_id) {
        try {
          await updateImageAfterCostCreation(receiptData.image_id, newCost.cost_id);
        } catch (err) {
          console.warn('Receipt finalization failed (non-fatal):', err);
        }
      }

      toast.success('Pack purchase saved successfully');
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (err) {
      console.error('Failed to save pack purchase:', err);
      toast.error(`Failed to save: ${err.message}`);
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  async _convertPdfToImage(file) {
    if (!window.pdfjsLib) {
      throw new Error('PDF conversion library not loaded');
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas conversion failed'));
        const name = file.name.replace(/\.pdf$/i, '.jpg');
        resolve(new File([blob], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    });
  }

  _escape(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
