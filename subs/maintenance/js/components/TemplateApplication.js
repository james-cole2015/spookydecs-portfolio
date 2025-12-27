// Template Application Wizard - Apply templates to items

import { fetchSchedules } from '../scheduleApi.js';
import { fetchAllItems } from '../api.js';
import { applyTemplateToItems } from '../scheduleApi.js';
import { navigateTo } from '../router.js';
import { Toast } from '../utils/toast.js';
import { formatTaskType } from '../utils/formatters.js';

// Get formatScheduleFrequency from scheduleHelpers or create inline
function formatScheduleFrequency(frequency, season) {
  const labels = {
    'annual': 'Annual',
    'seasonal': season ? `Seasonal (${season})` : 'Seasonal',
    'quarterly': 'Quarterly',
    'monthly': 'Monthly',
    'pre_season': season ? `Pre-season (${season})` : 'Pre-season',
    'post_season': season ? `Post-season (${season})` : 'Post-season'
  };
  return labels[frequency] || frequency;
}

export class TemplateApplicationView {
  constructor(preSelectedTemplateId = null) {
    this.currentStep = preSelectedTemplateId ? 2 : 1;
    this.selectedTemplate = null;
    this.preSelectedTemplateId = preSelectedTemplateId;
    this.selectedItems = [];
    this.allItems = [];
    this.startDate = null;
    this.applyResult = null;
  }
  
  async render(container) {
    container.innerHTML = `
      <div class="template-application-view">
        ${this.renderHeader()}
        <div class="wizard-container">
          ${this.renderStepIndicator()}
          <div id="wizard-content"></div>
        </div>
      </div>
    `;
    
    await this.renderCurrentStep(container);
  }
  
  renderHeader() {
    return `
      <div class="view-header">
        <div class="header-left">
          <button class="btn-back" onclick="window.location.href='/schedules'">
            ← Back to Templates
          </button>
          <h1>Apply Template to Items</h1>
        </div>
      </div>
    `;
  }
  
  renderStepIndicator() {
    const steps = this.preSelectedTemplateId 
      ? ['Select Items', 'Configure', 'Results']
      : ['Select Template', 'Select Items', 'Configure', 'Results'];
    
    const currentIndex = this.currentStep - 1;
    
    return `
      <div class="step-indicator">
        ${steps.map((step, index) => `
          <div class="step ${index === currentIndex ? 'active' : ''} ${index < currentIndex ? 'completed' : ''}">
            <div class="step-number">${index + 1}</div>
            <div class="step-label">${step}</div>
          </div>
          ${index < steps.length - 1 ? '<div class="step-connector"></div>' : ''}
        `).join('')}
      </div>
    `;
  }
  
  async renderCurrentStep(container) {
    const wizardContent = container.querySelector('#wizard-content');
    
    if (!wizardContent) return;
    
    // Load template if pre-selected
    if (this.preSelectedTemplateId && !this.selectedTemplate) {
      await this.loadPreselectedTemplate();
    }
    
    switch(this.currentStep) {
      case 1:
        wizardContent.innerHTML = await this.renderStep1();
        this.attachStep1Listeners(container);
        break;
      case 2:
        wizardContent.innerHTML = await this.renderStep2();
        this.attachStep2Listeners(container);
        break;
      case 3:
        wizardContent.innerHTML = this.renderStep3();
        this.attachStep3Listeners(container);
        break;
      case 4:
        wizardContent.innerHTML = this.renderStep4();
        this.attachStep4Listeners(container);
        break;
    }
  }
  
  async loadPreselectedTemplate() {
    try {
      const templates = await fetchSchedules();
      this.selectedTemplate = templates.find(t => t.schedule_id === this.preSelectedTemplateId);
      
      if (!this.selectedTemplate) {
        Toast.show('error', 'Error', 'Template not found');
        navigateTo('/schedules');
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      Toast.show('error', 'Error', 'Failed to load template');
      navigateTo('/schedules');
    }
  }
  
  // ==================== STEP 1: Select Template ====================
  
  async renderStep1() {
    try {
      const templates = await fetchSchedules({ enabled: 'true' });
      
      if (templates.length === 0) {
        return `
          <div class="wizard-step">
            <h2>No Templates Available</h2>
            <p>There are no enabled templates to apply. Please create a template first.</p>
            <div class="wizard-actions">
              <button class="btn-secondary" onclick="window.location.href='/schedules/new'">Create Template</button>
              <button class="btn-secondary" onclick="window.location.href='/schedules'">Cancel</button>
            </div>
          </div>
        `;
      }
      
      // Group by class_type
      const byClass = {};
      templates.forEach(t => {
        const cls = t.class_type || 'Other';
        if (!byClass[cls]) byClass[cls] = [];
        byClass[cls].push(t);
      });
      
      return `
        <div class="wizard-step">
          <h2>Step 1: Select a Template</h2>
          <p>Choose which template you want to apply to items</p>
          
          <div class="template-selection">
            ${Object.keys(byClass).sort().map(classType => `
              <div class="template-group">
                <h3>${classType}</h3>
                ${byClass[classType].map(template => `
                  <label class="template-option">
                    <input type="radio" name="template" value="${template.schedule_id}">
                    <div class="template-info">
                      <div class="template-title">
                        ${template.title}
                        ${template.is_default ? '<span class="badge-default">Default</span>' : ''}
                      </div>
                      <div class="template-meta">
                        ${formatTaskType(template.task_type)} • 
                        ${formatScheduleFrequency(template.frequency, template.season)}
                      </div>
                    </div>
                  </label>
                `).join('')}
              </div>
            `).join('')}
          </div>
          
          <div class="wizard-actions">
            <button class="btn-secondary" onclick="window.location.href='/schedules'">Cancel</button>
            <button class="btn-primary" id="btn-next-step" disabled>Next Step →</button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load templates:', error);
      return `
        <div class="wizard-step">
          <h2>Error Loading Templates</h2>
          <p>Failed to load templates. Please try again.</p>
          <div class="wizard-actions">
            <button class="btn-secondary" onclick="window.location.href='/schedules'">Back to Templates</button>
          </div>
        </div>
      `;
    }
  }
  
  attachStep1Listeners(container) {
    const radios = container.querySelectorAll('input[name="template"]');
    const nextBtn = container.querySelector('#btn-next-step');
    
    radios.forEach(radio => {
      radio.addEventListener('change', async (e) => {
        if (e.target.checked) {
          nextBtn.disabled = false;
          
          // Load selected template
          const templates = await fetchSchedules();
          this.selectedTemplate = templates.find(t => t.schedule_id === e.target.value);
        }
      });
    });
    
    nextBtn?.addEventListener('click', () => {
      this.currentStep = 2;
      this.render(container.closest('.template-application-view').parentElement);
    });
  }
  
  // ==================== STEP 2: Select Items ====================
  
  async renderStep2() {
    try {
      // Load all items for this class type
      this.allItems = await fetchAllItems({
        class_type: this.selectedTemplate.class_type
      });
      
      // Filter to items that don't have this template
      const itemsWithoutTemplate = this.allItems.filter(item => 
        !item.maintenance?.applied_templates?.includes(this.selectedTemplate.schedule_id)
      );
      
      const itemsWithTemplate = this.allItems.filter(item =>
        item.maintenance?.applied_templates?.includes(this.selectedTemplate.schedule_id)
      );
      
      return `
        <div class="wizard-step">
          <h2>Step 2: Select Items</h2>
          <div class="selected-template-info">
            <strong>Template:</strong> ${this.selectedTemplate.title} 
            <span class="class-type-badge">${this.selectedTemplate.class_type}</span>
          </div>
          
          <div class="item-search">
            <input type="text" id="item-search" placeholder="Search items..." class="form-input">
          </div>
          
          <div class="item-selection-actions">
            <button class="btn-small" id="btn-select-all">Select All</button>
            <button class="btn-small" id="btn-deselect-all">Deselect All</button>
          </div>
          
          ${itemsWithoutTemplate.length === 0 ? `
            <div class="info-message">
              <p>⚠️ All ${this.selectedTemplate.class_type} items already have this template applied.</p>
            </div>
          ` : `
            <div class="items-list" id="items-list">
              <p class="items-count">Found ${itemsWithoutTemplate.length} items without this template</p>
              ${itemsWithoutTemplate.map(item => this.renderItemCheckbox(item)).join('')}
            </div>
          `}
          
          ${itemsWithTemplate.length > 0 ? `
            <details class="items-with-template">
              <summary>${itemsWithTemplate.length} items already have this template</summary>
              <div class="items-list-readonly">
                ${itemsWithTemplate.map(item => `
                  <div class="item-row">
                    <code>${item.id}</code>
                    <span>${item.name || 'Unnamed'}</span>
                    <span class="badge-info">Already applied</span>
                  </div>
                `).join('')}
              </div>
            </details>
          ` : ''}
          
          <div class="selection-summary" id="selection-summary">
            Selected: <strong>0</strong> items
          </div>
          
          <div class="wizard-actions">
            <button class="btn-secondary" id="btn-back">← Back</button>
            <button class="btn-secondary" onclick="window.location.href='/schedules'">Cancel</button>
            <button class="btn-primary" id="btn-next-step" disabled>Next Step →</button>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load items:', error);
      return `
        <div class="wizard-step">
          <h2>Error Loading Items</h2>
          <p>Failed to load items. Please try again.</p>
          <div class="wizard-actions">
            <button class="btn-secondary" id="btn-back">← Back</button>
            <button class="btn-secondary" onclick="window.location.href='/schedules'">Cancel</button>
          </div>
        </div>
      `;
    }
  }
  
  renderItemCheckbox(item) {
    const hasOtherTemplates = item.maintenance?.applied_templates?.length > 0;
    
    return `
      <label class="item-checkbox">
        <input type="checkbox" name="item" value="${item.id}">
        <div class="item-info">
          <div class="item-id"><code>${item.id}</code></div>
          <div class="item-name">${item.name || 'Unnamed Item'}</div>
          ${hasOtherTemplates ? `
            <div class="item-note">Has ${item.maintenance.applied_templates.length} other template(s)</div>
          ` : '<div class="item-note">No templates yet</div>'}
        </div>
      </label>
    `;
  }
  
  attachStep2Listeners(container) {
    const checkboxes = container.querySelectorAll('input[name="item"]');
    const nextBtn = container.querySelector('#btn-next-step');
    const backBtn = container.querySelector('#btn-back');
    const selectAllBtn = container.querySelector('#btn-select-all');
    const deselectAllBtn = container.querySelector('#btn-deselect-all');
    const summary = container.querySelector('#selection-summary');
    const searchInput = container.querySelector('#item-search');
    
    const updateSelection = () => {
      this.selectedItems = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
      
      summary.innerHTML = `Selected: <strong>${this.selectedItems.length}</strong> items`;
      nextBtn.disabled = this.selectedItems.length === 0;
    };
    
    checkboxes.forEach(cb => {
      cb.addEventListener('change', updateSelection);
    });
    
    selectAllBtn?.addEventListener('click', () => {
      checkboxes.forEach(cb => {
        if (cb.closest('.item-checkbox').style.display !== 'none') {
          cb.checked = true;
        }
      });
      updateSelection();
    });
    
    deselectAllBtn?.addEventListener('click', () => {
      checkboxes.forEach(cb => cb.checked = false);
      updateSelection();
    });
    
    searchInput?.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      checkboxes.forEach(cb => {
        const label = cb.closest('.item-checkbox');
        const itemId = cb.value.toLowerCase();
        const itemName = label.querySelector('.item-name')?.textContent.toLowerCase() || '';
        
        if (itemId.includes(query) || itemName.includes(query)) {
          label.style.display = '';
        } else {
          label.style.display = 'none';
        }
      });
    });
    
    backBtn?.addEventListener('click', () => {
      this.currentStep = this.preSelectedTemplateId ? 1 : 1; // Can't go back if template pre-selected
      if (this.preSelectedTemplateId) {
        navigateTo('/schedules');
      } else {
        this.render(container.closest('.template-application-view').parentElement);
      }
    });
    
    nextBtn?.addEventListener('click', () => {
      this.currentStep = 3;
      this.render(container.closest('.template-application-view').parentElement);
    });
  }
  
  // ==================== STEP 3: Configure & Confirm ====================
  
  renderStep3() {
    const itemDetails = this.selectedItems.map(itemId => {
      const item = this.allItems.find(i => i.id === itemId);
      return item || { id: itemId, name: 'Unknown' };
    });
    
    return `
      <div class="wizard-step">
        <h2>Step 3: Review & Confirm</h2>
        
        <div class="review-section">
          <h3>Template</h3>
          <div class="review-item">
            <strong>${this.selectedTemplate.title}</strong><br>
            ${formatTaskType(this.selectedTemplate.task_type)} • 
            ${formatScheduleFrequency(this.selectedTemplate.frequency, this.selectedTemplate.season)}
          </div>
        </div>
        
        <div class="review-section">
          <h3>Configuration</h3>
          <div class="form-group">
            <label for="start-date">Start Date (optional)</label>
            <input type="date" id="start-date" class="form-input">
            <small class="form-help">Leave blank to start immediately</small>
          </div>
        </div>
        
        <div class="review-section">
          <h3>What Will Happen</h3>
          <ul class="action-list">
            <li>✓ Template will be added to ${this.selectedItems.length} item(s)</li>
            <li>✓ ${this.selectedItems.length * 2} maintenance records will be created (2 per item)</li>
            <li>✓ Records will follow work window rules</li>
          </ul>
        </div>
        
        <div class="review-section">
          <h3>Items to Update (${itemDetails.length})</h3>
          <div class="items-review">
            ${itemDetails.map((item, index) => `
              <div class="review-item">
                ${index + 1}. <code>${item.id}</code> - ${item.name || 'Unnamed'}
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="wizard-actions">
          <button class="btn-secondary" id="btn-back">← Back</button>
          <button class="btn-secondary" onclick="window.location.href='/schedules'">Cancel</button>
          <button class="btn-primary" id="btn-apply">Apply Template</button>
        </div>
      </div>
    `;
  }
  
  attachStep3Listeners(container) {
    const backBtn = container.querySelector('#btn-back');
    const applyBtn = container.querySelector('#btn-apply');
    const startDateInput = container.querySelector('#start-date');
    
    startDateInput?.addEventListener('change', (e) => {
      this.startDate = e.target.value || null;
    });
    
    backBtn?.addEventListener('click', () => {
      this.currentStep = 2;
      this.render(container.closest('.template-application-view').parentElement);
    });
    
    applyBtn?.addEventListener('click', async () => {
      await this.applyTemplate(container);
    });
  }
  
  async applyTemplate(container) {
    const applyBtn = container.querySelector('#btn-apply');
    applyBtn.disabled = true;
    applyBtn.textContent = 'Applying...';
    
    try {
      const data = {
        item_ids: this.selectedItems,
        start_date: this.startDate
      };
      
      this.applyResult = await applyTemplateToItems(this.selectedTemplate.schedule_id, data);
      
      this.currentStep = 4;
      this.render(container.closest('.template-application-view').parentElement);
      
    } catch (error) {
      console.error('Failed to apply template:', error);
      Toast.show('error', 'Error', error.message || 'Failed to apply template');
      applyBtn.disabled = false;
      applyBtn.textContent = 'Apply Template';
    }
  }
  
  // ==================== STEP 4: Results ====================
  
  renderStep4() {
    const result = this.applyResult;
    
    return `
      <div class="wizard-step">
        <div class="success-header">
          <div class="success-icon">✓</div>
          <h2>Template Applied Successfully!</h2>
        </div>
        
        <div class="result-summary">
          <h3>Summary</h3>
          <ul class="result-stats">
            <li><strong>${result.items_updated}</strong> items updated</li>
            <li><strong>${result.records_created}</strong> maintenance records created</li>
          </ul>
        </div>
        
        ${result.warnings && result.warnings.length > 0 ? `
          <div class="result-warnings">
            <h3>⚠️ Warnings</h3>
            <ul>
              ${result.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${result.errors && result.errors.length > 0 ? `
          <div class="result-errors">
            <h3>❌ Errors</h3>
            <ul>
              ${result.errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <div class="result-details">
          <h3>Details</h3>
          ${result.details.map(detail => `
            <div class="detail-row ${detail.status}">
              <span class="status-icon">${detail.status === 'success' ? '✓' : detail.status === 'error' ? '✗' : '−'}</span>
              <code>${detail.item_id}</code>
              <span>${detail.status === 'success' ? `Created ${detail.records_created} records` : detail.error || detail.reason}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="wizard-actions">
          <button class="btn-secondary" onclick="window.location.href='/schedules/${this.selectedTemplate.schedule_id}'">
            View Template Detail
          </button>
          <button class="btn-secondary" onclick="window.location.href='/schedules/apply'">
            Apply to More Items
          </button>
          <button class="btn-primary" onclick="window.location.href='/schedules'">Done</button>
        </div>
      </div>
    `;
  }
  
  attachStep4Listeners(container) {
    // No interactive elements in step 4
  }
}