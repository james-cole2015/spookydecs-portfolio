// Items API Client

const HEADERS = { 'Content-Type': 'application/json' };
const ALLOWED_CLASSES = ['Decoration', 'Light', 'Accessory'];

async function getEndpoint() {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

export async function getStorageUrl() {
  const { STR_ADM_URL } = await window.SpookyConfig.get();
  if (!STR_ADM_URL) throw new Error('Storage URL not configured');
  return STR_ADM_URL;
}

export async function getDeploymentUrl() {
  const { DEPLOY_ADMIN } = await window.SpookyConfig.get();
  if (!DEPLOY_ADMIN) throw new Error('Deployment URL not configured');
  return DEPLOY_ADMIN;
}

export async function getMaintenanceUrl() {
  const { MAINT_URL } = await window.SpookyConfig.get();
  if (!MAINT_URL) throw new Error('Maintenance URL not configured');
  return MAINT_URL;
}

export async function getFinanceUrl() {
  const { NEW_COST_URL } = await window.SpookyConfig.get();
  if (!NEW_COST_URL) throw new Error('Finance URL not configured');
  return NEW_COST_URL;
}

export async function fetchAllItems(bustCache = false) {
  const apiEndpoint = await getEndpoint();
  const url = bustCache
    ? `${apiEndpoint}/items?_t=${Date.now()}`
    : `${apiEndpoint}/items`;

  const response = await fetch(url, {
    method: 'GET',
    headers: HEADERS,
    ...(bustCache && { cache: 'no-cache' })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  let items = [];
  if (data.success && data.data?.items && Array.isArray(data.data.items)) {
    items = data.data.items;
  } else if (Array.isArray(data)) {
    items = data;
  } else if (data.items && Array.isArray(data.items)) {
    items = data.items;
  } else {
    console.error('Unexpected response format:', data);
    return [];
  }

  const filteredItems = items.filter(item => ALLOWED_CLASSES.includes(item.class));
  return await resolveItemsPhotoUrls(filteredItems);
}

export async function fetchItemById(itemId, bustCache = false) {
  const apiEndpoint = await getEndpoint();
  const url = bustCache
    ? `${apiEndpoint}/items/${itemId}?_t=${Date.now()}`
    : `${apiEndpoint}/items/${itemId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: HEADERS,
    ...(bustCache && { cache: 'no-cache' })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch item ${itemId}: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  let item;
  if (data.success && data.data) {
    item = data.data;
  } else if (data.id) {
    item = data;
  } else {
    throw new Error('Invalid response format from API');
  }

  await resolveItemPhotoUrl(item);
  return item;
}

export async function createItem(itemData) {
  const apiEndpoint = await getEndpoint();

  const response = await fetch(`${apiEndpoint}/items`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(itemData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
    throw new Error(errorData.error || errorData.message || `Failed to create item: ${response.status}`);
  }

  const data = await response.json();
  if (data.success && data.data) return data.data;
  if (data.preview || data.confirmation) return data;
  throw new Error('Invalid response format from API');
}

export async function updateItem(itemId, itemData) {
  const apiEndpoint = await getEndpoint();

  const response = await fetch(`${apiEndpoint}/items/${itemId}`, {
    method: 'PUT',
    headers: HEADERS,
    body: JSON.stringify(itemData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
    throw new Error(errorData.error || errorData.message || `Failed to update item: ${response.status}`);
  }

  const data = await response.json();
  if (data.success && data.data?.item) return data.data.item;
  if (data.item) return data.item;
  if (data.id) return data;
  throw new Error('Invalid response format from API');
}

export async function deleteItem(itemId) {
  const apiEndpoint = await getEndpoint();

  const response = await fetch(`${apiEndpoint}/items/${itemId}`, {
    method: 'DELETE',
    headers: HEADERS
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
    throw new Error(errorData.error || errorData.message || `Failed to delete item: ${response.status}`);
  }

  return await response.json();
}

export async function retireItem(itemId) {
  return await updateItem(itemId, { status: 'Retired' });
}

export async function bulkRetireItems(itemIds) {
  return await Promise.all(itemIds.map(id => retireItem(id)));
}

export async function bulkDeleteItems(itemIds) {
  return await Promise.all(itemIds.map(id => deleteItem(id)));
}

export async function bulkStore(itemIds, location) {
  const apiEndpoint = await getEndpoint();

  const response = await fetch(`${apiEndpoint}/items/bulk`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ item_ids: itemIds, location })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
    throw new Error(errorData.error || errorData.message || `Failed to store items: ${response.status}`);
  }

  const data = await response.json();
  return data.success && data.data ? data.data : data;
}

export async function fetchImageById(imageId) {
  try {
    const apiEndpoint = await getEndpoint();
    const response = await fetch(`${apiEndpoint}/admin/images/${imageId}`, {
      method: 'GET',
      headers: HEADERS
    });

    if (!response.ok) {
      console.warn(`Failed to fetch image ${imageId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (data.success && data.data) return data.data;
    if (data.cloudfront_url) return data;
    return null;
  } catch (error) {
    console.warn(`Error fetching image ${imageId}:`, error);
    return null;
  }
}

async function resolveItemPhotoUrl(item) {
  if (item.images?.primary_photo_id) {
    const image = await fetchImageById(item.images.primary_photo_id);
    if (image?.cloudfront_url) {
      item.images.cloudfront_url = image.cloudfront_url;
    }
  }
  return item;
}

async function resolveItemsPhotoUrls(items) {
  const photoIds = [...new Set(
    items
      .filter(item => item.images?.primary_photo_id)
      .map(item => item.images.primary_photo_id)
  )];

  if (photoIds.length === 0) return items;

  const images = await Promise.all(photoIds.map(id => fetchImageById(id)));

  const imageMap = {};
  photoIds.forEach((id, index) => {
    if (images[index]?.cloudfront_url) {
      imageMap[id] = images[index].cloudfront_url;
    }
  });

  items.forEach(item => {
    if (item.images?.primary_photo_id && imageMap[item.images.primary_photo_id]) {
      item.images.cloudfront_url = imageMap[item.images.primary_photo_id];
    }
  });

  return items;
}

export const itemsAPI = {
  getAll: fetchAllItems,
  getById: fetchItemById,
  create: createItem,
  update: updateItem,
  delete: deleteItem,
  retire: retireItem,
  bulkRetire: bulkRetireItems,
  bulkDelete: bulkDeleteItems,
  bulkStore
};