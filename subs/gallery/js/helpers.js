/**
 * Utility Helper Functions
 */

/**
 * Debounce function - delays execution until after wait period of inactivity
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeoutId = null;
  
  return function(...args) {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Set new timeout
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Format ISO date string to readable format
 * @param {string} isoDate - ISO date string
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string
 */
export function formatDate(isoDate, options = {}) {
  if (!isoDate) {
    return '';
  }

  try {
    const date = new Date(isoDate);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return isoDate;
    }

    const {
      includeTime = false,
      shortFormat = false,
      relative = false
    } = options;

    // Relative time format (e.g., "2 hours ago")
    if (relative) {
      return getRelativeTime(date);
    }

    // Short format (e.g., "12/09/2025")
    if (shortFormat) {
      return date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
      });
    }

    // Full format with optional time
    const dateOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    };

    if (includeTime) {
      dateOptions.hour = '2-digit';
      dateOptions.minute = '2-digit';
    }

    return date.toLocaleDateString('en-US', dateOptions);
    
  } catch (error) {
    console.error('formatDate error:', error);
    return isoDate;
  }
}

/**
 * Get relative time string (e.g., "2 hours ago", "3 days ago")
 * @param {Date} date - Date object
 * @returns {string} Relative time string
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}

/**
 * Get item names from item IDs using the items cache
 * @param {Array} item_ids - Array of item IDs
 * @param {Object} items_cache - Items cache object keyed by season
 * @returns {Array} Array of item names (or IDs if not found)
 */
export function getItemNames(item_ids, items_cache) {
  if (!item_ids || !Array.isArray(item_ids)) {
    return [];
  }

  if (!items_cache || typeof items_cache !== 'object') {
    return item_ids;
  }

  // Build a lookup map from all seasons
  const itemMap = new Map();
  
  Object.values(items_cache).forEach(seasonItems => {
    if (Array.isArray(seasonItems)) {
      seasonItems.forEach(item => {
        if (item.id && item.short_name) {
          itemMap.set(item.id, item.short_name);
        }
      });
    }
  });

  // Map IDs to names (fallback to ID if not found)
  return item_ids.map(id => itemMap.get(id) || id);
}

/**
 * Get full item objects from item IDs
 * @param {Array} item_ids - Array of item IDs
 * @param {Object} items_cache - Items cache object keyed by season
 * @returns {Array} Array of item objects
 */
export function getItems(item_ids, items_cache) {
  if (!item_ids || !Array.isArray(item_ids)) {
    return [];
  }

  if (!items_cache || typeof items_cache !== 'object') {
    return [];
  }

  // Build a lookup map from all seasons
  const itemMap = new Map();
  
  Object.values(items_cache).forEach(seasonItems => {
    if (Array.isArray(seasonItems)) {
      seasonItems.forEach(item => {
        if (item.id) {
          itemMap.set(item.id, item);
        }
      });
    }
  });

  // Map IDs to full objects
  return item_ids
    .map(id => itemMap.get(id))
    .filter(Boolean);
}

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) {
    return text || '';
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
}

/**
 * Check if two objects are equal (shallow comparison)
 * @param {Object} obj1 - First object
 * @param {Object} obj2 - Second object
 * @returns {boolean} True if equal
 */
export function shallowEqual(obj1, obj2) {
  if (obj1 === obj2) {
    return true;
  }

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  return keys1.every(key => obj1[key] === obj2[key]);
}

/**
 * Build query string from object
 * @param {Object} params - Parameters object
 * @returns {string} Query string (without ?)
 */
export function buildQueryString(params) {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        searchParams.append(key, value.join(','));
      } else {
        searchParams.append(key, value);
      }
    }
  });
  
  return searchParams.toString();
}

/**
 * Parse query string to object
 * @param {string} queryString - Query string (with or without ?)
 * @returns {Object} Parameters object
 */
export function parseQueryString(queryString) {
  const params = {};
  const searchParams = new URLSearchParams(queryString.replace(/^\?/, ''));
  
  for (const [key, value] of searchParams) {
    // Handle comma-separated values as arrays
    if (value.includes(',')) {
      params[key] = value.split(',');
    } else {
      params[key] = value;
    }
  }
  
  return params;
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size (e.g., "1.5 MB")
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
