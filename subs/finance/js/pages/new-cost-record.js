// New Cost Record Page

import { CostFormFields } from '../components/CostFormFields.js';
import { CostReviewModal } from '../components/CostReviewModal.js';
import { ReceiptUploadModal } from '../components/ReceiptUploadModal.js';
import { createCost, updateImageAfterCostCreation } from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';

export async function renderNewCostRecord(container) {
  console.log('📄 renderNewCostRecord called');
  
  try {
    // Get URL parameters for pre-filling
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('item_id');
    const recordId = urlParams.get('record_id');
    
    // Render the page structure
    container.innerHTML = `
      <div class="new-cost-record-page">
        <!-- Breadcrumbs -->
        <nav class="breadcrumbs">
          <a href="/" class="breadcrumb-link">Finance</a>
          <span class="breadcrumb-separator">/</span>
          <a href="/" class="breadcrumb-link">Cost Records</a>
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
    
    console.log('✅ Page structure rendered');
    
    // Initialize receipt modal
    const receiptModal = new ReceiptUploadModal();
    
    // Render form fields
    const formFields = new CostFormFields('cost-form-container', {
      itemId: itemId,
      recordId: recordId
    });
    
    // Set up form submit callback
    formFields.onSubmit = (formData, extractionId, imageId) => {
      handleFormSubmit(formData, extractionId, imageId);
    };
    
    formFields.render();
    console.log('✅ Form fields rendered');
    
    // Attach event listeners
    attachEventListeners(receiptModal, formFields);
    console.log('✅ Event listeners attached');
    
  } catch (error) {
    console.error('❌ Error rendering new cost record page:', error);
    
    // Show error in container
    container.innerHTML = `
      <div class="error-container">
        <div class="error-content">
          <h1>Error Loading Form</h1>
          <p>${error.message}</p>
          <button onclick="window.location.href='/'" class="btn-secondary">Back to Finance</button>
        </div>
      </div>
    `;
  }
}

function attachEventListeners(receiptModal, formFields) {
  // Extract with AI button
  const extractBtn = document.getElementById('btn-extract-ai');
  if (extractBtn) {
    extractBtn.addEventListener('click', () => {
      // Get context from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const contextData = {
        item_id: urlParams.get('item_id') || formFields.formData.related_item_id || null,
        record_id: urlParams.get('record_id') || formFields.formData.related_record_id || null,
        cost_type: urlParams.get('cost_type') || formFields.formData.cost_type || null,
        category: urlParams.get('category') || formFields.formData.category || null
      };
      
      // Open modal with context and callback
      receiptModal.open(contextData, (extractedData, extractionId, imageId) => {
        formFields.handleReceiptData(extractedData, extractionId, imageId);
      });
    });
  }
}

async function handleFormSubmit(formData, extractionId, imageId) {
  console.log('Handling form submission...', formData);
  
  // Add extraction metadata if present
  if (extractionId) {
    formData.extraction_id = extractionId;
  }
  if (imageId) {
    formData.image_id = imageId;
  }
  
  // Show review modal
  const reviewModal = new CostReviewModal();
  
  reviewModal.show(formData, {
    onConfirm: async () => {
      try {
        toast.info('Saving cost record...');
        
        const result = await createCost(formData);
        
        // If we have an image_id, update the image record to move it to processed folder
        if (imageId && result.cost_id) {
          console.log('Moving receipt to processed folder...');
          try {
            await updateImageAfterCostCreation(imageId, result.cost_id);
            console.log('Receipt moved successfully');
          } catch (imageError) {
            // Log but don't fail - image update is not critical
            console.error('Failed to update image:', imageError);
          }
        }
        
        toast.success('Cost record created successfully');
        
        // Redirect to finance page after short delay
        setTimeout(() => {
          window.location.href = '/';
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