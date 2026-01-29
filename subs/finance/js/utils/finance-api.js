// Finance API Client - Updated with presigned URL upload flow and success_response wrapper handling

let API_ENDPOINT = '';
let configLoaded = false;

// Load configuration
export async function loadConfig() {
  if (configLoaded) return;
  
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    API_ENDPOINT = config.API_ENDPOINT;
    configLoaded = true;
    console.log('Config loaded:', config);
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    API_ENDPOINT = 'https://api.spookydecs.com';
    configLoaded = true;
    return { API_ENDPOINT };
  }
}

// Get API endpoint (ensures config is loaded)
export async function getApiEndpoint() {
  await ensureConfigLoaded();
  return API_ENDPOINT;
}

// Helper to ensure config is loaded before API calls
async function ensureConfigLoaded() {
  if (!configLoaded) {
    await loadConfig();
  }
}

// Helper function to handle API responses with success_response wrapper
async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      // Handle both old and new error formats
      errorMessage = errorData.error || errorData.message || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  if (contentType?.includes('application/json')) {
    const json = await response.json();
    
    // Unwrap success_response structure if present
    // New format: { success: true, data: {...}, timestamp: "..." }
    // Old format: { items: [...] } or direct data
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data; // Return unwrapped data
    }
    
    // Return as-is for old format or non-wrapped responses
    return json;
  }
  
  return null;
}

// GET all cost records with optional filters
export async function getAllCosts(filters = {}) {
  await ensureConfigLoaded();
  
  try {
    const params = new URLSearchParams();
    
    if (filters.cost_type) params.append('cost_type', filters.cost_type);
    if (filters.category) params.append('category', filters.category);
    if (filters.vendor) params.append('vendor', filters.vendor);
    if (filters.startDate) params.append('start_date', filters.startDate);
    if (filters.endDate) params.append('end_date', filters.endDate);
    if (filters.related_item_id) params.append('related_item_id', filters.related_item_id);

    const queryString = params.toString();
    const url = `${API_ENDPOINT}/finance/costs${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching costs:', error);
    throw error;
  }
}

// GET single cost record by ID
export async function getCostById(costId) {
  await ensureConfigLoaded();
  
  try {
    const response = await fetch(`${API_ENDPOINT}/finance/costs/${costId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching cost:', error);
    throw error;
  }
}

// GET all costs for a specific item
export async function getItemCosts(itemId) {
  await ensureConfigLoaded();
  
  try {
    const response = await fetch(`${API_ENDPOINT}/finance/costs/item/${itemId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching item costs:', error);
    throw error;
  }
}

// GET receipt image data by photo_id
export async function getReceiptImage(photoId) {
  await ensureConfigLoaded();
  
  try {
    console.log('📸 Fetching receipt image from API:', photoId);
    const response = await fetch(`${API_ENDPOINT}/images/${photoId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await handleResponse(response);
    console.log('✅ Receipt image data received:', data);
    return data;
  } catch (error) {
    console.error('❌ Error fetching receipt image:', error);
    throw error;
  }
}

// POST create new cost record
export async function createCost(costData) {
  await ensureConfigLoaded();
  
  try {
    const response = await fetch(`${API_ENDPOINT}/finance/costs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(costData)
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error creating cost:', error);
    throw error;
  }
}

// PUT update existing cost record
export async function updateCost(costId, costData) {
  await ensureConfigLoaded();
  
  try {
    const response = await fetch(`${API_ENDPOINT}/finance/costs/${costId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(costData)
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating cost:', error);
    throw error;
  }
}

// DELETE cost record
export async function deleteCost(costId) {
  await ensureConfigLoaded();
  
  try {
    const response = await fetch(`${API_ENDPOINT}/finance/costs/${costId}/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error deleting cost:', error);
    throw error;
  }
}

// GET items for dropdown (from items table)
export async function getItems(filters = {}) {
  await ensureConfigLoaded();
  
  try {
    const params = new URLSearchParams();
    
    if (filters.season) params.append('season', filters.season);
    if (filters.class) params.append('class', filters.class);
    if (filters.status) params.append('status', filters.status || 'Active');

    const queryString = params.toString();
    const url = `${API_ENDPOINT}/items${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return await handleResponse(response);
  } catch (error) {
    console.error('Error fetching items:', error);
    throw error;
  }
}

// GET cost statistics
export async function getCostStats(filters = {}) {
  try {
    const response = await getAllCosts(filters);
    
    // Handle both array and object response formats
    const costs = Array.isArray(response) ? response : (response.costs || []);
    
    const stats = {
      total_records: costs.length,
      total_amount: costs.reduce((sum, cost) => sum + (parseFloat(cost.total_cost) || 0), 0),
      by_type: {},
      by_category: {},
      by_vendor: {},
      by_month: {}
    };

    costs.forEach(cost => {
      // By type
      if (!stats.by_type[cost.cost_type]) {
        stats.by_type[cost.cost_type] = { count: 0, amount: 0 };
      }
      stats.by_type[cost.cost_type].count++;
      stats.by_type[cost.cost_type].amount += parseFloat(cost.total_cost) || 0;

      // By category
      if (!stats.by_category[cost.category]) {
        stats.by_category[cost.category] = { count: 0, amount: 0 };
      }
      stats.by_category[cost.category].count++;
      stats.by_category[cost.category].amount += parseFloat(cost.total_cost) || 0;

      // By vendor
      if (cost.vendor) {
        if (!stats.by_vendor[cost.vendor]) {
          stats.by_vendor[cost.vendor] = { count: 0, amount: 0 };
        }
        stats.by_vendor[cost.vendor].count++;
        stats.by_vendor[cost.vendor].amount += parseFloat(cost.total_cost) || 0;
      }

      // By month
      const date = new Date(cost.cost_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!stats.by_month[monthKey]) {
        stats.by_month[monthKey] = { count: 0, amount: 0 };
      }
      stats.by_month[monthKey].count++;
      stats.by_month[monthKey].amount += parseFloat(cost.total_cost) || 0;
    });

    return stats;
  } catch (error) {
    console.error('Error calculating stats:', error);
    throw error;
  }
}

// Get unique vendors for filter dropdown
export async function getVendors() {
  try {
    const response = await getAllCosts();
    // Handle both array and wrapped object formats
    const costs = Array.isArray(response) ? response : (response.costs || []);
    const vendors = [...new Set(costs.map(cost => cost.vendor).filter(Boolean))];
    return vendors.sort();
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
}

// Upload and process receipt with AI extraction (3-step flow)
export async function uploadAndProcessReceipt(file, contextData = {}, onProgress = null) {
  await ensureConfigLoaded();
  
  console.log('=== uploadAndProcessReceipt called ===');
  console.log('File:', file);
  
  try {
    // STEP 1: Get presigned URL
    if (onProgress) onProgress('requesting_presign');
    
    console.log('📤 Requesting presigned URL from:', `${API_ENDPOINT}/admin/images/presign`);
    console.log('📤 Request body:', {
      context: 'receipt',
      photo_type: 'receipt',
      season: 'shared',
      files: [{
        filename: file.name,
        content_type: file.type
      }]
    });
    
    let presignResponse;
    try {
      presignResponse = await fetch(`${API_ENDPOINT}/admin/images/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          context: 'receipt',
          photo_type: 'receipt',
          season: 'shared',
          files: [{
            filename: file.name,
            content_type: file.type
          }]
        })
      });
    } catch (fetchError) {
      console.error('❌ Network error during presign request:', fetchError);
      throw new Error(`Network error: Unable to reach ${API_ENDPOINT}/admin/images/presign. Check CORS and API Gateway configuration.`);
    }
    
    console.log('📥 Presign response status:', presignResponse.status);
    console.log('📥 Presign response ok:', presignResponse.ok);
    
    const presignData = await handleResponse(presignResponse);
    const upload = presignData.uploads[0]; // Extract first upload
    
    console.log('✅ Presigned URL received:', upload);
    
    // STEP 2: Upload directly to S3
    if (onProgress) onProgress('uploading_to_s3');
    
    const uploadResponse = await fetch(upload.presigned_url, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type
      },
      body: file
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    console.log('✅ File uploaded to S3');
    
    // STEP 3: Trigger AI processing
    if (onProgress) onProgress('processing_with_ai');
    
    const processResponse = await fetch(`${API_ENDPOINT}/finance/costs/ai-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        s3_key: upload.s3_key,
        extraction_id: upload.extraction_id,
        file_name: file.name,
        file_type: file.type,
        item_id: contextData.item_id || null,
        record_id: contextData.record_id || null,
        cost_type: contextData.cost_type || null,
        category: contextData.category || null
      })
    });
    
    const result = await handleResponse(processResponse);
    
    console.log('✅ Processing complete:', result);
    
    return result;
    
  } catch (error) {
    console.error('Error processing receipt:', error);
    throw error;
  }
}

// Update audit log with user modifications
export async function updateAuditLog(extractionId, finalData, modifications) {
  await ensureConfigLoaded();
  
  try {
    const response = await fetch(`${API_ENDPOINT}/audit/ai-audit/finance/${extractionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        final_data: finalData,
        modifications: modifications,
        user_modified: Object.keys(modifications).length > 0
      })
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating audit log:', error);
    return null;
  }
}

// Update image record after cost is created
// costId can be a single string or an array of strings for batch operations
export async function updateImageAfterCostCreation(imageId, costId) {
  await ensureConfigLoaded();
  
  try {
    // Support both single and multiple cost IDs
    const costIds = Array.isArray(costId) ? costId : [costId];
    
    const response = await fetch(`${API_ENDPOINT}/finance/images/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_id: imageId,
        cost_ids: costIds  // Changed to cost_ids array
      })
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating image:', error);
    return null;
  }
}