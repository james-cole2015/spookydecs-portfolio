/**
 * Images Configuration
 * 
 * Constants, enums, and validation rules for the images subdomain
 */

/**
 * Photo type enumeration
 */
export const PHOTO_TYPES = {
  GALLERY: 'gallery',
  MAINTENANCE: 'maintenance',
  STORAGE: 'storage',
  IDEA: 'idea',
  BUILD: 'build',
  DEPLOYMENT: 'deployment',
  CATALOG: 'catalog'
};

/**
 * Human-readable labels for photo types
 */
export const PHOTO_TYPE_LABELS = {
  gallery: 'Gallery',
  maintenance: 'Maintenance',
  storage: 'Storage',
  idea: 'Idea',
  build: 'Build',
  deployment: 'Deployment',
  catalog: 'Item Catalog'
};

/**
 * Icons for photo types (emoji or icon class)
 */
export const PHOTO_TYPE_ICONS = {
  gallery: '🖼️',
  maintenance: '🔧',
  storage: '📦',
  idea: '💡',
  build: '🔨',
  deployment: '🚀',
  catalog: '📸'
};

/**
 * Mapping of photo_type to upload context
 * Used by presign API
 */
export const CONTEXT_MAPPING = {
  gallery: 'gallery',
  maintenance: 'item',
  storage: 'storage',
  idea: 'idea',
  build: 'idea',
  deployment: 'deployment',
  catalog: 'item'
};

/**
 * Photo types that require item selection
 */
export const PHOTO_TYPES_WITH_ITEMS = [
  PHOTO_TYPES.GALLERY,
  PHOTO_TYPES.CATALOG,
  PHOTO_TYPES.MAINTENANCE
];

/**
 * Photo types that require storage selection
 */
export const PHOTO_TYPES_WITH_STORAGE = [
  PHOTO_TYPES.STORAGE
];

/**
 * Photo types that require deployment selection
 */
export const PHOTO_TYPES_WITH_DEPLOYMENT = [
  PHOTO_TYPES.DEPLOYMENT
];

/**
 * Photo types that require idea selection
 */
export const PHOTO_TYPES_WITH_IDEA = [
  PHOTO_TYPES.IDEA,
  PHOTO_TYPES.BUILD
];

/**
 * Season options
 */
export const SEASONS = {
  HALLOWEEN: 'halloween',
  CHRISTMAS: 'christmas',
  SHARED: 'shared'
};

/**
 * Season labels
 */
export const SEASON_LABELS = {
  halloween: 'Halloween',
  christmas: 'Christmas',
  shared: 'Shared'
};

/**
 * Season colors (for badges)
 */
export const SEASON_COLORS = {
  halloween: '#ff6b35',
  christmas: '#00a676',
  shared: '#6c757d'
};

/**
 * Allowed image file types
 */
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif'
];

/**
 * Maximum file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100
};

/**
 * Table column definitions
 */
export const TABLE_COLUMNS = [
  { id: 'thumbnail', label: '', width: '80px', sortable: false },
  { id: 'photo_id', label: 'Photo ID', width: '200px', sortable: true },
  { id: 'caption', label: 'Caption', width: 'auto', sortable: false },
  { id: 'photo_type', label: 'Type', width: '120px', sortable: true },
  { id: 'season', label: 'Season', width: '120px', sortable: true },
  { id: 'upload_date', label: 'Upload Date', width: '150px', sortable: true },
  { id: 'actions', label: '', width: '50px', sortable: false }
];

/**
 * Validate photo type
 * @param {string} photoType 
 * @returns {boolean}
 */
export function isValidPhotoType(photoType) {
  return Object.values(PHOTO_TYPES).includes(photoType);
}

/**
 * Validate season
 * @param {string} season 
 * @returns {boolean}
 */
export function isValidSeason(season) {
  return Object.values(SEASONS).includes(season);
}

/**
 * Validate file type
 * @param {string} contentType 
 * @returns {boolean}
 */
export function isValidFileType(contentType) {
  return ALLOWED_FILE_TYPES.includes(contentType);
}

/**
 * Validate file size
 * @param {number} size 
 * @returns {boolean}
 */
export function isValidFileSize(size) {
  return size <= MAX_FILE_SIZE;
}

/**
 * Get photo type label
 * @param {string} photoType 
 * @returns {string}
 */
export function getPhotoTypeLabel(photoType) {
  return PHOTO_TYPE_LABELS[photoType] || photoType;
}

/**
 * Get photo type icon
 * @param {string} photoType 
 * @returns {string}
 */
export function getPhotoTypeIcon(photoType) {
  return PHOTO_TYPE_ICONS[photoType] || '📷';
}

/**
 * Get season label
 * @param {string} season 
 * @returns {string}
 */
export function getSeasonLabel(season) {
  return SEASON_LABELS[season] || season;
}

/**
 * Get season color
 * @param {string} season 
 * @returns {string}
 */
export function getSeasonColor(season) {
  return SEASON_COLORS[season] || '#6c757d';
}

/**
 * Get upload context for photo type
 * @param {string} photoType 
 * @returns {string}
 */
export function getContextForPhotoType(photoType) {
  return CONTEXT_MAPPING[photoType] || 'misc';
}

/**
 * Check if photo type requires item selection
 * @param {string} photoType 
 * @returns {boolean}
 */
export function requiresItemSelection(photoType) {
  return PHOTO_TYPES_WITH_ITEMS.includes(photoType);
}

/**
 * Check if photo type requires storage selection
 * @param {string} photoType 
 * @returns {boolean}
 */
export function requiresStorageSelection(photoType) {
  return PHOTO_TYPES_WITH_STORAGE.includes(photoType);
}

/**
 * Check if photo type requires deployment selection
 * @param {string} photoType 
 * @returns {boolean}
 */
export function requiresDeploymentSelection(photoType) {
  return PHOTO_TYPES_WITH_DEPLOYMENT.includes(photoType);
}

/**
 * Check if photo type requires idea selection
 * @param {string} photoType 
 * @returns {boolean}
 */
export function requiresIdeaSelection(photoType) {
  return PHOTO_TYPES_WITH_IDEA.includes(photoType);
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string}
 */
export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format file size for display
 * @param {number} bytes 
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes) return 'N/A';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
