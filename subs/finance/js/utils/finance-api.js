// Finance API Client

let API_ENDPOINT = '';

// Load configuration
export async function loadConfig() {
  try {
    const response = await fetch('/config.json');
    const config = await response.json();
    API_ENDPOINT = config.API_ENDPOINT;
    return config;
  } catch (error) {
    console.error('Failed to load config:', error);
    throw error;
  }
}

// Initialize config on module load
await loadConfig();

// Helper function to handle API responses
async function handleResponse(response) {
  const contentType = response.headers.get('content-type');
  
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    if (contentType?.includes('application/json')) {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    }
    
    throw new Error(errorMessage);
  }

  if (contentType?.includes('application/json')) {
    return await response.json();
  }
  
  return null;
}

// GET all cost records with optional filters
export async function getAllCosts(filters = {}) {
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

// POST create new cost record
export async function createCost(costData) {
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
    const costs = await getAllCosts(filters);
    
    // Calculate statistics
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
    const costs = await getAllCosts();
    const vendors = [...new Set(costs.map(cost => cost.vendor).filter(Boolean))];
    return vendors.sort();
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return [];
  }
}
