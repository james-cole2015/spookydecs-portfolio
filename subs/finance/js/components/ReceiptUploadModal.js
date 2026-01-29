// Receipt Upload Modal Component

import { uploadAndProcessReceipt } from '../utils/finance-api.js';

export class ReceiptUploadModal {
  constructor() {
    this.modal = null;
    this.state = 'upload'; // upload | uploading | processing | review | error
    this.extractedData = null;
    this.extractionId = null;
    this.imageId = null;
    this.onUseData = null;
    this.contextData = {}; // item_id, record_id, cost_type, category
    this.uploadProgress = 0;
    this.currentStep = '';
  }

  open(contextData = {}, onUseDataCallback) {
    this.contextData = contextData;
    this.onUseData = onUseDataCallback;
    this.state = 'upload';
    this.extractedData = null;
    this.extractionId = null;
    this.imageId = null;
    this.uploadProgress = 0;
    this.currentStep = '';
    
    this.render();
    this.attachListeners();
  }

  close() {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  render() {
    // Remove existing modal if present
    if (this.modal) {
      this.modal.remove();
    }

    const modalHTML = `
      <div class="modal-overlay" id="receipt-upload-modal">
        <div class="modal-container receipt-modal">
          <div class="modal-header">
            <h2>Upload Receipt</h2>
            <button class="close-btn" id="close-modal-btn">&times;</button>
          </div>
          
          <div class="modal-body">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('receipt-upload-modal');
  }

  renderContent() {
    switch (this.state) {
      case 'upload':
        return this.renderUploadState();
      case 'uploading':
        return this.renderUploadingState();
      case 'processing':
        return this.renderProcessingState();
      case 'review':
        return this.renderReviewState();
      case 'error':
        return this.renderErrorState();
      default:
        return this.renderUploadState();
    }
  }

  renderUploadState() {
    return `
      <div class="upload-zone">
        <input 
          type="file" 
          id="receipt-file-input" 
          accept="image/*,.pdf"
          style="display: none;"
        />
        
        <div class="upload-area" id="upload-drop-zone">
          <svg class="upload-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          
          <h3>Upload Receipt</h3>
          <p>Drag and drop your receipt here, or click to browse</p>
          <p class="file-types">Supports: Images (JPG, PNG) and PDFs</p>
          
          <button class="btn btn-primary" id="browse-btn">
            Browse Files
          </button>
        </div>

        <div class="selected-file" id="selected-file-display" style="display: none;">
          <div class="file-info">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
              <polyline points="13 2 13 9 20 9"></polyline>
            </svg>
            <span id="file-name"></span>
            <span id="file-size"></span>
          </div>
          <button class="btn btn-secondary" id="change-file-btn">Change File</button>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" id="cancel-upload-btn">Cancel</button>
          <button class="btn btn-primary" id="process-receipt-btn" disabled>
            Process Receipt
          </button>
        </div>
      </div>
    `;
  }

  renderUploadingState() {
    return `
      <div class="uploading-state">
        <div class="progress-container">
          <div class="progress-circle">
            <svg class="progress-ring" width="120" height="120">
              <circle class="progress-ring-circle" stroke="#e2e8f0" stroke-width="8" fill="transparent" r="52" cx="60" cy="60"/>
              <circle class="progress-ring-progress" stroke="#3b82f6" stroke-width="8" fill="transparent" r="52" cx="60" cy="60"
                style="stroke-dasharray: 326.73; stroke-dashoffset: ${326.73 - (326.73 * this.uploadProgress / 100)}; transition: stroke-dashoffset 0.3s;"/>
            </svg>
            <div class="progress-text">${Math.round(this.uploadProgress)}%</div>
          </div>
        </div>
        <h3>Uploading Receipt...</h3>
        <p class="progress-step">${this.currentStep}</p>
      </div>
    `;
  }

  renderProcessingState() {
    return `
      <div class="processing-state">
        <div class="spinner-container">
          <div class="spinner"></div>
        </div>
        <h3>Processing Receipt...</h3>
        <p>AI is extracting data from your receipt. This may take a few seconds.</p>
      </div>
    `;
  }

  renderReviewState() {
    const data = this.extractedData || {};
    
    return `
      <div class="review-state">
        <div class="review-header">
          <h3>Review Extracted Data</h3>
          <p>Please review the extracted information and make any necessary corrections.</p>
        </div>

        <div class="extracted-fields">
          ${this.renderField('Vendor', data.vendor)}
          ${this.renderField('Purchase Date', data.purchase_date)}
          ${this.renderField('Cost Type', data.cost_type)}
          ${this.renderField('Category', data.category)}
          ${this.renderField('Subcategory', data.subcategory)}
          ${this.renderField('Description', data.description, true)}
          ${this.renderField('Item Name', data.item_name)}
          ${this.renderField('Quantity', data.quantity)}
          ${this.renderField('Unit Cost', `$${data.unit_cost || '0.00'}`)}
          ${this.renderField('Total Cost', `$${data.total_cost || '0.00'}`)}
        </div>

        ${this.renderConfidenceIndicator()}

        <div class="modal-actions">
          <button class="btn btn-secondary" id="retry-btn">Try Again</button>
          <button class="btn btn-primary" id="use-data-btn">Use This Data</button>
        </div>
      </div>
    `;
  }

  renderField(label, value, isTextarea = false) {
    const displayValue = value || 'Not found';
    const hasValue = value && value !== 'Not found';
    const fieldClass = hasValue ? 'has-value' : 'no-value';

    return `
      <div class="field-row ${fieldClass}">
        <label>${label}</label>
        <div class="field-value">${displayValue}</div>
      </div>
    `;
  }

  renderConfidenceIndicator() {
    const data = this.extractedData || {};
    const missingFields = [];
    
    if (!data.vendor) missingFields.push('vendor');
    if (!data.total_cost) missingFields.push('total cost');
    if (!data.purchase_date) missingFields.push('purchase date');

    if (missingFields.length === 0) {
      return `
        <div class="confidence-indicator high">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          High confidence extraction
        </div>
      `;
    } else {
      return `
        <div class="confidence-indicator low">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Some fields could not be extracted: ${missingFields.join(', ')}
        </div>
      `;
    }
  }

  renderErrorState() {
    return `
      <div class="error-state">
        <svg class="error-icon" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>Processing Failed</h3>
        <p id="error-message">An error occurred while processing your receipt. Please try again.</p>
        
        <div class="modal-actions">
          <button class="btn btn-secondary" id="close-error-btn">Cancel</button>
          <button class="btn btn-primary" id="retry-upload-btn">Try Again</button>
        </div>
      </div>
    `;
  }

  attachListeners() {
    if (!this.modal) return;

    // Close modal
    const closeBtn = this.modal.querySelector('#close-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Cancel button
    const cancelBtn = this.modal.querySelector('#cancel-upload-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    // Upload state listeners
    if (this.state === 'upload') {
      this.attachUploadListeners();
    }

    // Review state listeners
    if (this.state === 'review') {
      this.attachReviewListeners();
    }

    // Error state listeners
    if (this.state === 'error') {
      this.attachErrorListeners();
    }

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  attachUploadListeners() {
    const fileInput = this.modal.querySelector('#receipt-file-input');
    const dropZone = this.modal.querySelector('#upload-drop-zone');
    const browseBtn = this.modal.querySelector('#browse-btn');
    const changeFileBtn = this.modal.querySelector('#change-file-btn');
    const processBtn = this.modal.querySelector('#process-receipt-btn');

    // Browse button
    if (browseBtn) {
      browseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    // Change file button
    if (changeFileBtn) {
      changeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    // File input change
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.handleFileSelected(e.target.files[0]);
        }
      });
    }

    // Drag and drop
    if (dropZone) {
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        
        if (e.dataTransfer.files.length > 0) {
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      });

      dropZone.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }

    // Process button
    if (processBtn) {
      processBtn.addEventListener('click', () => this.processReceipt());
    }
  }

  attachReviewListeners() {
    const useDataBtn = this.modal.querySelector('#use-data-btn');
    const retryBtn = this.modal.querySelector('#retry-btn');

    if (useDataBtn) {
      useDataBtn.addEventListener('click', () => this.useExtractedData());
    }

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.state = 'upload';
        this.render();
        this.attachListeners();
      });
    }
  }

  attachErrorListeners() {
    const retryBtn = this.modal.querySelector('#retry-upload-btn');
    const closeBtn = this.modal.querySelector('#close-error-btn');

    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.state = 'upload';
        this.render();
        this.attachListeners();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
  }

  handleFileSelected(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image (JPG, PNG) or PDF file.');
      return;
    }

    // Validate file size (50MB limit for S3 direct upload)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 50MB.');
      return;
    }

    this.selectedFile = file;

    // Update UI
    const fileDisplay = this.modal.querySelector('#selected-file-display');
    const fileName = this.modal.querySelector('#file-name');
    const fileSize = this.modal.querySelector('#file-size');
    const processBtn = this.modal.querySelector('#process-receipt-btn');

    if (fileDisplay && fileName && fileSize && processBtn) {
      fileDisplay.style.display = 'flex';
      fileName.textContent = file.name;
      fileSize.textContent = this.formatFileSize(file.size);
      processBtn.disabled = false;
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async processReceipt() {
    if (!this.selectedFile) return;

    this.state = 'uploading';
    this.uploadProgress = 0;
    this.currentStep = 'Preparing upload...';
    this.render();
    this.attachListeners();

    try {
      const result = await uploadAndProcessReceipt(
        this.selectedFile, 
        this.contextData,
        (step) => this.handleProgress(step)
      );
      
      console.log('✅ Processing complete:', result);
      
      // Store the ENTIRE result (contains items array + metadata)
      this.extractedData = result;
      this.extractionId = result.extraction_id;
      this.imageId = result.image_id;
      
      // Check if we got multi-item or single-item response
      if (result.items && Array.isArray(result.items)) {
        console.log(`📦 Multi-item extraction: ${result.items.length} items detected`);
        // Pass entire result to callback (new flow)
        if (this.onUseData) {
          this.onUseData(result, this.extractionId, this.imageId);
        }
        this.close();
      } else {
        // Fallback for old single-item format (shouldn't happen with new backend)
        console.warn('⚠️ Single-item format detected (legacy)');
        this.state = 'review';
        this.render();
        this.attachListeners();
      }
      
    } catch (error) {
      console.error('Receipt processing error:', error);
      this.state = 'error';
      this.render();
      this.attachListeners();
      
      const errorMsg = this.modal.querySelector('#error-message');
      if (errorMsg) {
        errorMsg.textContent = error.message || 'An error occurred while processing your receipt.';
      }
    }
  }

  handleProgress(step) {
    switch (step) {
      case 'requesting_presign':
        this.uploadProgress = 10;
        this.currentStep = 'Getting upload URL...';
        break;
      case 'uploading_to_s3':
        this.uploadProgress = 30;
        this.currentStep = 'Uploading to cloud storage...';
        this.state = 'uploading';
        break;
      case 'processing_with_ai':
        this.uploadProgress = 70;
        this.currentStep = 'Extracting data with AI...';
        this.state = 'processing';
        break;
    }
    
    // Update UI if we're still in uploading/processing state
    if (this.state === 'uploading' || this.state === 'processing') {
      this.render();
      this.attachListeners();
    }
  }

  useExtractedData() {
    // Legacy method - no longer used
    // Multi-item flow bypasses this and closes modal directly after extraction
    console.warn('⚠️ useExtractedData called - this should not happen in multi-item flow');
    if (this.onUseData && this.extractedData) {
      this.onUseData(this.extractedData, this.extractionId, this.imageId);
    }
    this.close();
  }
}