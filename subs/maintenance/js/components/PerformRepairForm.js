// Perform Repair Form component

import { fetchRecord, performRepair } from '../api.js';
import { appState } from '../state.js';
import { formatDate, formatRecordType, formatCriticality } from '../utils/formatters.js';
import { MaterialsList } from './form/MaterialsList.js';

export class PerformRepairForm {
  constructor(recordId, itemId) {
    this.recordId = recordId;
    this.itemId = itemId;
    this.record = null;
    this.item = null;
    this.materials = [];
    this.materialsList = new MaterialsList();
  }

  async render(container) {
    try {
      this.record = await fetchRecord(this.recordId);
      this.item = appState.getItem(this.itemId);

      if (this.record.record_type !== 'repair') {
        container.innerHTML = this.renderError('This is not a repair record.');
        return;
      }

      if (this.record.status === 'completed') {
        container.innerHTML = this.renderError('This repair has already been completed.');
        return;
      }

      this.materials = this.record.materials_used ? [...this.record.materials_used] : [];

      container.innerHTML = this.renderForm();
      this.materialsList.attachEventListeners(container, this.materials);
      this.attachEventListeners(container);

    } catch (error) {
      console.error('Failed to load repair record:', error);
      container.innerHTML = this.renderError('Failed to load repair record.');
    }
  }

  renderForm() {
    const today = new Date().toISOString().split('T')[0];

    return `
      <div class="form-container">
        <div class="form-header">
          <button class="btn-back" onclick="history.back()">← Back</button>
          <h1>Perform Repair</h1>
        </div>

        <div class="form-section">
          <h2>Repair Details</h2>
          <div class="detail-grid readonly">
            <div class="detail-row">
              <span class="detail-label">Title</span>
              <span class="detail-value">${this.record.title}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type</span>
              <span class="detail-value">${formatRecordType(this.record.record_type)}</span>
            </div>
            ${this.record.criticality ? `
            <div class="detail-row">
              <span class="detail-label">Criticality</span>
              <span class="detail-value">${formatCriticality(this.record.criticality)}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Item</span>
              <span class="detail-value">${this.item?.short_name || this.itemId}</span>
            </div>
            ${this.record.description ? `
            <div class="detail-row full-width">
              <span class="detail-label">Description</span>
              <span class="detail-value">${this.record.description}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <form id="repair-form" class="form-section">
          <h2>Repair Results</h2>

          <div class="form-group">
            <label for="performed-by">Performed By *</label>
            <input
              type="text"
              id="performed-by"
              name="performed_by"
              value="SpookyDecs Ent"
              required
            >
          </div>

          <div class="form-group">
            <label for="date-performed">Date Performed *</label>
            <input
              type="date"
              id="date-performed"
              name="date_performed"
              value="${today}"
              required
            >
          </div>

          <div class="form-group">
            <label for="repair-notes">Repair Notes</label>
            <textarea
              id="repair-notes"
              name="repair_notes"
              rows="4"
              placeholder="Describe what was repaired..."
            ></textarea>
          </div>

          ${this.materialsList.render(this.materials)}

          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="history.back()">
              Cancel
            </button>
            <button type="submit" class="btn-primary" id="submit-btn">
              Complete Repair
            </button>
          </div>

          <div id="form-error" class="form-error" style="display: none;"></div>
        </form>
      </div>
    `;
  }

  renderError(message) {
    return `
      <div class="error-container">
        <h1>Unable to Perform Repair</h1>
        <p>${message}</p>
        <button onclick="history.back()" class="btn-secondary">Go Back</button>
      </div>
    `;
  }

  attachEventListeners(container) {
    const form = container.querySelector('#repair-form');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleFormSubmit(container, form);
    });
  }

  async handleFormSubmit(container, form) {
    const formData = new FormData(form);
    const submitBtn = form.querySelector('#submit-btn');
    const errorDiv = form.querySelector('#form-error');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';
    errorDiv.style.display = 'none';

    try {
      const payload = {
        performed_by: formData.get('performed_by'),
        date_performed: formData.get('date_performed'),
        repair_notes: formData.get('repair_notes') || '',
        materials_used: this.materials.filter(m => m.item)
      };

      const result = await performRepair(this.recordId, payload);

      if (result?.record) {
        appState.updateRecord(result.record);
      }

      container.innerHTML = this.renderSuccessView();

    } catch (error) {
      console.error('Failed to complete repair:', error);
      errorDiv.textContent = error.message;
      errorDiv.style.display = 'block';

      submitBtn.disabled = false;
      submitBtn.textContent = 'Complete Repair';
    }
  }

  renderSuccessView() {
    return `
      <div class="success-container">
        <div class="success-icon">✓</div>
        <h1>Repair Completed Successfully</h1>
        <p>The repair record has been closed and the item's repair status has been cleared.</p>

        <div class="success-actions">
          <a href="/${this.itemId}/${this.recordId}" class="btn-primary">
            View Repair Record
          </a>
          <a href="/${this.itemId}" class="btn-secondary">
            Back to Item
          </a>
        </div>
      </div>
    `;
  }
}
