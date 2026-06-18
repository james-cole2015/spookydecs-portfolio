/**
 * Finance API client — typed port of the vanilla finance-api.js.
 *
 * Framework-agnostic: calls `window.SpookyConfig`/`window.SpookyAuth` directly
 * (SpookyConfig.get() is cached, and ConfigProvider warms it at boot). The
 * `success/data` response-unwrapping and the 3-step receipt upload flow are
 * preserved exactly from the original. (#333)
 */
import type { CostRecord } from '../config/financeConfig';

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  return window.SpookyAuth.buildHeaders(extra);
}

async function getEndpoint(): Promise<string> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

async function handleResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type');

  if (response.status === 401) {
    await window.SpookyAuth.redirectToLogin();
    return null;
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    }
    throw new Error(errorMessage);
  }

  if (contentType?.includes('application/json')) {
    const json = await response.json();
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data;
    }
    return json;
  }

  return null;
}

export interface GetCostsFilters {
  cost_type?: string;
  category?: string;
  vendor?: string;
  startDate?: string;
  endDate?: string;
  related_item_id?: string;
  no_receipt?: boolean | string;
}

// GET all cost records with optional filters
export async function getAllCosts(filters: GetCostsFilters = {}): Promise<any> {
  const API_ENDPOINT = await getEndpoint();

  const params = new URLSearchParams();
  if (filters.cost_type) params.append('cost_type', filters.cost_type);
  if (filters.category) params.append('category', filters.category);
  if (filters.vendor) params.append('vendor', filters.vendor);
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.related_item_id) params.append('related_item_id', filters.related_item_id);
  if (filters.no_receipt !== undefined && filters.no_receipt !== null) {
    params.append('no_receipt', String(filters.no_receipt));
  }

  const queryString = params.toString();
  const url = `${API_ENDPOINT}/finance/costs${queryString ? '?' + queryString : ''}`;
  const response = await fetch(url, { method: 'GET', headers: buildHeaders() });
  return await handleResponse(response);
}

// GET single cost record by ID
export async function getCostById(costId: string): Promise<any> {
  const API_ENDPOINT = await getEndpoint();
  const response = await fetch(`${API_ENDPOINT}/finance/costs/${costId}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return await handleResponse(response);
}

// GET all costs for a specific item
export async function getItemCosts(itemId: string): Promise<any> {
  const API_ENDPOINT = await getEndpoint();
  const response = await fetch(`${API_ENDPOINT}/finance/costs/item/${itemId}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return await handleResponse(response);
}

// GET receipt image data by photo_id
export async function getReceiptImage(photoId: string): Promise<any> {
  const API_ENDPOINT = await getEndpoint();
  const response = await fetch(`${API_ENDPOINT}/images/${photoId}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return await handleResponse(response);
}

// POST create new cost record
export async function createCost(costData: Record<string, any>): Promise<any> {
  const API_ENDPOINT = await getEndpoint();
  const response = await fetch(`${API_ENDPOINT}/finance/costs`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(costData),
  });
  return await handleResponse(response);
}

// PUT update existing cost record
export async function updateCost(costId: string, costData: Record<string, any>): Promise<any> {
  const API_ENDPOINT = await getEndpoint();
  const response = await fetch(`${API_ENDPOINT}/finance/costs/${costId}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(costData),
  });
  return await handleResponse(response);
}

// DELETE cost record
export async function deleteCost(costId: string): Promise<any> {
  const API_ENDPOINT = await getEndpoint();
  const response = await fetch(`${API_ENDPOINT}/finance/costs/${costId}/delete`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });
  return await handleResponse(response);
}

export interface GetItemsFilters {
  season?: string;
  class?: string;
  status?: string;
}

// GET items for dropdown
export async function getItems(filters: GetItemsFilters = {}): Promise<any> {
  const API_ENDPOINT = await getEndpoint();

  const params = new URLSearchParams();
  if (filters.season) params.append('season', filters.season);
  if (filters.class) params.append('class', filters.class);
  if (filters.status) params.append('status', filters.status || 'Active');

  const queryString = params.toString();
  const url = `${API_ENDPOINT}/items${queryString ? '?' + queryString : ''}`;
  const response = await fetch(url, { method: 'GET', headers: buildHeaders() });
  return await handleResponse(response);
}

export interface CostStats {
  total_records: number;
  total_amount: number;
  by_type: Record<string, { count: number; amount: number }>;
  by_category: Record<string, { count: number; amount: number }>;
  by_vendor: Record<string, { count: number; amount: number }>;
  by_month: Record<string, { count: number; amount: number }>;
}

// GET cost statistics (client-side calculation)
export async function getCostStats(filters: GetCostsFilters = {}): Promise<CostStats> {
  const response = await getAllCosts(filters);
  const costs: CostRecord[] = Array.isArray(response) ? response : response.costs || [];

  const stats: CostStats = {
    total_records: costs.length,
    total_amount: costs.reduce((sum, cost) => sum + (parseFloat(cost.total_cost as any) || 0), 0),
    by_type: {},
    by_category: {},
    by_vendor: {},
    by_month: {},
  };

  costs.forEach((cost) => {
    const type = cost.cost_type as string;
    if (!stats.by_type[type]) stats.by_type[type] = { count: 0, amount: 0 };
    stats.by_type[type].count++;
    stats.by_type[type].amount += parseFloat(cost.total_cost as any) || 0;

    const category = cost.category as string;
    if (!stats.by_category[category]) stats.by_category[category] = { count: 0, amount: 0 };
    stats.by_category[category].count++;
    stats.by_category[category].amount += parseFloat(cost.total_cost as any) || 0;

    if (cost.vendor) {
      if (!stats.by_vendor[cost.vendor]) stats.by_vendor[cost.vendor] = { count: 0, amount: 0 };
      stats.by_vendor[cost.vendor].count++;
      stats.by_vendor[cost.vendor].amount += parseFloat(cost.total_cost as any) || 0;
    }

    const date = new Date(cost.cost_date as string);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!stats.by_month[monthKey]) stats.by_month[monthKey] = { count: 0, amount: 0 };
    stats.by_month[monthKey].count++;
    stats.by_month[monthKey].amount += parseFloat(cost.total_cost as any) || 0;
  });

  return stats;
}

// GET unique vendors for filter dropdown
export async function getVendors(): Promise<string[]> {
  try {
    const response = await getAllCosts();
    const costs: CostRecord[] = Array.isArray(response) ? response : response.costs || [];
    const vendors = [...new Set(costs.map((cost) => cost.vendor).filter(Boolean))] as string[];
    return vendors.sort();
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
}

export interface ReceiptContextData {
  item_id?: string | null;
  record_id?: string | null;
  cost_type?: string | null;
  category?: string | null;
}

// Upload and process receipt with AI extraction (3-step flow)
export async function uploadAndProcessReceipt(
  file: File,
  contextData: ReceiptContextData = {},
  onProgress: ((stage: string) => void) | null = null,
): Promise<any> {
  const API_ENDPOINT = await getEndpoint();

  // STEP 1: Get presigned URL
  if (onProgress) onProgress('requesting_presign');

  let presignResponse: Response;
  try {
    presignResponse = await fetch(`${API_ENDPOINT}/admin/images/presign`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        context: 'receipt',
        photo_type: 'receipt',
        season: 'shared',
        files: [{ filename: file.name, content_type: file.type, file_size: file.size }],
      }),
    });
  } catch (fetchError) {
    console.error('❌ Network error during presign request:', fetchError);
    throw new Error(
      `Network error: Unable to reach ${API_ENDPOINT}/admin/images/presign. Check CORS and API Gateway configuration.`,
    );
  }

  const presignData = await handleResponse(presignResponse);
  const upload = presignData.uploads[0];

  // STEP 2: Upload directly to S3
  if (onProgress) onProgress('uploading_to_s3');

  const uploadResponse = await fetch(upload.presigned_url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
  }

  // STEP 3: Trigger AI processing
  if (onProgress) onProgress('processing_with_ai');

  const processResponse = await fetch(`${API_ENDPOINT}/finance/costs/ai-extract`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      s3_key: upload.s3_key,
      extraction_id: upload.extraction_id,
      file_name: file.name,
      file_type: file.type,
      item_id: contextData.item_id || null,
      record_id: contextData.record_id || null,
      cost_type: contextData.cost_type || null,
      category: contextData.category || null,
    }),
  });

  return await handleResponse(processResponse);
}

// Update audit log with user modifications
export async function updateAuditLog(
  extractionId: string,
  finalData: Record<string, any>,
  modifications: Record<string, any>,
): Promise<any> {
  const API_ENDPOINT = await getEndpoint();

  try {
    const response = await fetch(`${API_ENDPOINT}/audit/ai-audit/finance/${extractionId}`, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify({
        final_data: finalData,
        modifications: modifications,
        user_modified: Object.keys(modifications).length > 0,
      }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating audit log:', error);
    return null;
  }
}

// Update image record after cost is created
export async function updateImageAfterCostCreation(
  imageId: string,
  costId: string | string[],
): Promise<any> {
  const API_ENDPOINT = await getEndpoint();

  try {
    const costIds = Array.isArray(costId) ? costId : [costId];
    const response = await fetch(`${API_ENDPOINT}/finance/images/update`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ image_id: imageId, cost_ids: costIds }),
    });
    return await handleResponse(response);
  } catch (error) {
    console.error('Error updating image:', error);
    return null;
  }
}
