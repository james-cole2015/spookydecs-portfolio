// New Cost Record Page - Updated for Multi-Item Support

import { CostFormFields } from '../components/CostFormFields.js';
import { CostReviewModal } from '../components/CostReviewModal.js';
import { PackPurchaseForm } from '../components/PackPurchaseForm.js';
import { createCost, updateImageAfterCostCreation } from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';
import {
  COST_TYPES,
  CATEGORIES_BY_COST_TYPE,
  SUBCATEGORIES,
  RELATED_ID_CONFIG
} from '../utils/finance-config.js';

export async function renderNewCostRecord(container) {
  console.log('📄 renderNewCostRecord called');
  
  try {
    // Get URL parameters for pre-filling
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('item_id');
    const recordId = urlParams.get('record_id');
    
    // Read initial mode from URL (?mode=pack)
    const initialMode = urlParams.get('mode') === 'pack' ? 'pack' : 'single';

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
            <button class="btn-primary" id="btn-extract-ai" title="Upload receipt to extract cost data" style="${initialMode === 'pack' ? 'display:none;' : ''}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Extract with AI
            </button>
          </div>
        </div>

        <!-- Mode Toggle -->
        <div class="pack-mode-toggle">
          <button class="pack-mode-btn ${initialMode === 'single' ? 'active' : ''}" data-mode="single">Single Item</button>
          <button class="pack-mode-btn ${initialMode === 'pack' ? 'active' : ''}" data-mode="pack">Pack Purchase</button>
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

    // Finance costConfig for ReceiptExtractorWidget
    const financeCostConfig = {
      costTypes: COST_TYPES,
      categoriesByCostType: CATEGORIES_BY_COST_TYPE,
      subcategories: Object.fromEntries(
        Object.entries(SUBCATEGORIES).map(([k, v]) => [k, v])
      ),
      relatedIdConfig: RELATED_ID_CONFIG
    };

    // Track current mode
    let currentMode = initialMode;
    let formFields = null;

    async function renderMode(mode) {
      currentMode = mode;
      const extractBtn = document.getElementById('btn-extract-ai');

      // Update toggle button states
      document.querySelectorAll('.pack-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
      });

      if (mode === 'pack') {
        if (extractBtn) extractBtn.style.display = 'none';
        const packForm = new PackPurchaseForm('cost-form-container');
        await packForm.render();
      } else {
        if (extractBtn) extractBtn.style.display = '';
        formFields = new CostFormFields('cost-form-container', {
          itemId: itemId,
          recordId: recordId
        });
        formFields.onSubmit = (formData, extractionId, imageId) => {
          handleManualFormSubmit(formData, extractionId, imageId);
        };
        formFields.render();
      }
    }

    // Render initial mode
    await renderMode(initialMode);
    console.log('✅ Form rendered');

    // Mode toggle listeners
    document.querySelectorAll('.pack-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.mode !== currentMode) {
          renderMode(btn.dataset.mode);
        }
      });
    });

    // Attach event listeners
    attachExtractButton(() => formFields, financeCostConfig);
    console.log('✅ Event listeners attached');

    // Auto-open AI extraction modal when ?extract=true
    if (urlParams.get('extract') === 'true' && initialMode === 'single') {
      openReceiptWidget({}, financeCostConfig);
    }

    // Auto-resume an abandoned session when ?resumeSession=<id>
    const resumeSessionId = urlParams.get('resumeSession');
    if (resumeSessionId && initialMode === 'single') {
      resumeReceiptWidget(resumeSessionId, financeCostConfig);
    }
    
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

function attachExtractButton(getFormFields, costConfig) {
  const extractBtn = document.getElementById('btn-extract-ai');
  if (!extractBtn) return;
  // Clone to strip any stale listeners from prior renderMode calls
  const btn = extractBtn.cloneNode(true);
  extractBtn.replaceWith(btn);
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    const formFields = typeof getFormFields === 'function' ? getFormFields() : getFormFields;
    const urlParams = new URLSearchParams(window.location.search);
    const contextData = {
      item_id:   urlParams.get('item_id')   || formFields?.formData?.related_item_id   || null,
      record_id: urlParams.get('record_id') || formFields?.formData?.related_record_id || null,
      cost_type: urlParams.get('cost_type') || formFields?.formData?.cost_type         || null,
      category:  urlParams.get('category')  || formFields?.formData?.category          || null
    };
    btn.disabled = true;
    try {
      await openReceiptWidget(contextData, costConfig);
    } finally {
      btn.disabled = false;
    }
  });
}

async function loadWidgetDeps() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  const headers = window.SpookyAuth.buildHeaders();

  const [itemsRes, recordsRes, ideasRes] = await Promise.allSettled([
    fetch(`${API_ENDPOINT}/items`, { headers }),
    fetch(`${API_ENDPOINT}/admin/maintenance-records`, { headers }),
    fetch(`${API_ENDPOINT}/ideas`, { headers })
  ]);

  const toArray = (res, key) => {
    if (res.status !== 'fulfilled' || !res.value.ok) return [];
    return res.value.json().then(j => {
      const d = j?.data ?? j;
      const arr = d[key] ?? d;
      return Array.isArray(arr) ? arr : [];
    });
  };

  const [items, records, ideas] = await Promise.all([
    toArray(itemsRes, 'items'),
    toArray(recordsRes, 'records'),
    toArray(ideasRes, 'ideas')
  ]);

  return { API_ENDPOINT, items, records, ideas };
}

function onWidgetComplete(confirmedItems) {
  if (!confirmedItems.length) return;
  const costRecords = confirmedItems.map(item => ({
    ...item,
    value:     item.total_cost,
    cost_date: item.purchase_date,
    currency:  'USD'
  }));
  handleBatchCostRecordCreation(costRecords, confirmedItems[0].extraction_id, confirmedItems[0].image_id);
}

async function openReceiptWidget(contextData, costConfig) {
  const { API_ENDPOINT, items, records, ideas } = await loadWidgetDeps();
  window.ReceiptExtractorWidget.open({
    apiEndpoint: API_ENDPOINT,
    extractEndpoint: '/finance/costs/ai-extract',
    sessionEndpoint: API_ENDPOINT,
    sourceSub: 'finance',
    contextData,
    costConfig,
    caches: { items, records, ideas },
    onComplete: onWidgetComplete,
    onCancel: () => {}
  });
}

async function resumeReceiptWidget(sessionId, costConfig) {
  const { API_ENDPOINT, items, records, ideas } = await loadWidgetDeps();
  window.ReceiptExtractorWidget.resume(sessionId, {
    apiEndpoint: API_ENDPOINT,
    sessionEndpoint: API_ENDPOINT,
    extractEndpoint: '/finance/costs/ai-extract',
    costConfig,
    caches: { items, records, ideas },
    onComplete: onWidgetComplete,
    onCancel: () => {}
  });
}

// NEW: Batch create multiple cost records
async function handleBatchCostRecordCreation(costRecords, extractionId, imageId) {
  console.log(`🔄 Creating ${costRecords.length} cost records...`, costRecords);
  
  const totalRecords = costRecords.length;
  let successCount = 0;
  let failCount = 0;
  const createdCostIds = [];

  // Show progress toast
  toast.info(`Creating ${totalRecords} cost record${totalRecords > 1 ? 's' : ''}...`);

  // Create records sequentially to avoid overwhelming API
  for (let i = 0; i < costRecords.length; i++) {
    const record = costRecords[i];
    
    try {
      console.log(`Creating record ${i + 1}/${totalRecords}:`, record);
      
      const result = await createCost(record);
      createdCostIds.push(result.cost_id);
      successCount++;
      
      console.log(`✅ Created record ${i + 1}/${totalRecords}: ${result.cost_id}`);
      
    } catch (error) {
      console.error(`❌ Failed to create record ${i + 1}/${totalRecords}:`, error);
      failCount++;
    }
  }

  // Update image record to associate with all created cost records
  if (imageId && createdCostIds.length > 0) {
    console.log('📸 Updating image record with cost IDs:', createdCostIds);
    try {
      await updateImageAfterCostCreation(imageId, createdCostIds);
      console.log('✅ Image record updated');
    } catch (imageError) {
      // Log but don't fail - image update is not critical
      console.error('⚠️ Failed to update image:', imageError);
    }
  }

  if (failCount === 0) {
    toast.success(`Successfully created ${successCount} cost record${successCount > 1 ? 's' : ''}`);
    setTimeout(() => { window.location.href = '/'; }, 2000);
  } else {
    toast.warning(`Created ${successCount} record${successCount > 1 ? 's' : ''}, ${failCount} failed — check console for details`);
    // No redirect on partial failure so the error stays visible
  }
}

// EXISTING: Handle manual form submission (single record)
async function handleManualFormSubmit(formData, extractionId, imageId) {
  console.log('Handling manual form submission...', formData);
  
  // Add extraction metadata if present
  if (extractionId) {
    formData.extraction_id = extractionId;
  }
  if (imageId) {
    formData.image_id = imageId;
  }
  
  // Show review modal for single record
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