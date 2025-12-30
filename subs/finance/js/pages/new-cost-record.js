// New Cost Record Page

import { CostFormFields } from '../components/CostFormFields.js';
import { CostReviewModal } from '../components/CostReviewModal.js';
import { createCost } from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';

export class NewCostRecordPage {
  constructor() {
    this.formFields = null;
    this.reviewModal = null;
    this.init();
  }
  
  init() {
    console.log('Initializing NewCostRecordPage');
    this.render();
    this.attachEventListeners();
  }
  
  render() {
    const appContainer = document.getElementById('app-container');
    if (!appContainer) {
      console.error('App container not found');
      return;
    }
    
    // Get URL parameters for pre-filling
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('item_id');
    const recordId = urlParams.get('record_id');
    
    appContainer.innerHTML = `
      <div class="new-cost-record-page">
        <!-- Breadcrumbs -->
        <nav class="breadcrumbs">
          <a href="/finance" class="breadcrumb-link">Finance</a>
          <span class="breadcrumb-separator">/</span>
          <a href="/finance" class="breadcrumb-link">Cost Records</a>
          <span class="breadcrumb-separator">/</span>
          <span class="breadcrumb-current">New Record</span>
        </nav>
        
        <!-- Page Header -->
        <div class="page-header">
          <div class="header-left">
            <h1>Create Cost Record</h1>
            <p class="page-subtitle">Track expenses for maintenance, repairs, and equipment</p>
          </div>
          <div class="header-actions">
            <button class="btn-primary" id="btn-extract-ai">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Extract with AI
            </button>
          </div>
        </div>
        
        <!-- Form Container -->
        <div class="form-card">
          <div id="cost-form-container">
            <!-- Form fields will be rendered here -->
          </div>
        </div>
      </div>
    `;
    
    // Render form fields
    this.formFields = new CostFormFields('cost-form-container', {
      itemId: itemId,
      recordId: recordId
    });
    
    // Set up form submit callback
    this.formFields.onSubmit = (formData) => {
      this.handleFormSubmit(formData);
    };
    
    this.formFields.render();
  }
  
  attachEventListeners() {
    // Extract with AI button
    const extractBtn = document.getElementById('btn-extract-ai');
    if (extractBtn) {
      extractBtn.addEventListener('click', () => {
        // TODO: Open AI Extract modal in future implementation
        alert('AI Receipt Extract feature coming soon!');
      });
    }
  }
  
  async handleFormSubmit(formData) {
    console.log('Handling form submission...', formData);
    
    // Show review modal
    this.reviewModal = new CostReviewModal();
    
    this.reviewModal.show(formData, {
      onConfirm: async () => {
        try {
          toast.info('Saving cost record...');
          
          const result = await createCost(formData);
          
          toast.success('Cost record created successfully');
          
          // Redirect to finance page after short delay
          setTimeout(() => {
            window.location.href = '/finance';
          }, 1500);
          
        } catch (error) {
          console.error('Failed to save cost record:', error);
          toast.error(`Failed to save cost record: ${error.message}`);
        }
      },
      onCancel: () => {
        console.log('User cancelled review');
      }
    });
  }
}