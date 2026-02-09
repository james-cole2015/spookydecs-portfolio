// Images Configuration
export const IMAGES_CONFIG = {
  API_BASE: '/admin/images',
  
  // Category definitions with required fields
  CATEGORIES: {
    item_catalog: {
      label: 'Item Catalog',
      requiredFields: ['item_id'],
      s3Path: 'item_catalog/',
      photoType: 'catalog'
    },
    ideas: {
      label: 'Ideas',
      requiredFields: ['idea_id'],
      s3Path: 'ideas/',
      photoType: 'inspiration'
    },
    builds: {
      label: 'Builds',
      requiredFields: ['idea_id'],
      s3Path: 'builds/',
      photoType: 'build'
    },
    maintenance: {
      label: 'Maintenance',
      requiredFields: ['item_id'],
      s3Path: 'maintenance/',
      photoType: 'repair'
    },
    storage: {
      label: 'Storage',
      requiredFields: ['storage_id'],
      s3Path: 'storage/',
      photoType: 'catalog'
    },
    receipts: {
      label: 'Receipts',
      requiredFields: ['cost_record_id'],
      s3Path: 'receipts/',
      photoType: 'receipt'
    },
    deployments: {
      label: 'Deployments',
      requiredFields: ['deployment_id'],
      s3Path: 'deployments/',
      photoType: 'deployment'
    },
    gallery_showcase: {
      label: 'Gallery - Showcase',
      requiredFields: [],
      s3Path: 'gallery/showcase/',
      photoType: 'gallery_showcase',
      gallerySection: 'showcase'
    },
    gallery_progress: {
      label: 'Gallery - Progress', 
      requiredFields: [],
      s3Path: 'gallery/progress/',
      photoType: 'build',
      gallerySection: 'progress'
    },
    gallery_community: {
      label: 'Gallery - Community',
      requiredFields: [],
      s3Path: 'gallery/community/',
      photoType: 'gallery_community',
      gallerySection: 'community'
    },
    misc: {
      label: 'Miscellaneous',
      requiredFields: [],
      s3Path: 'misc/',
      photoType: 'catalog'
    }
  },
  
  SEASONS: [
    { value: 'halloween', label: 'Halloween' },
    { value: 'christmas', label: 'Christmas' },
    { value: 'shared', label: 'Shared' }
  ],
  
  // Filter options
  FILTER_OPTIONS: {
    season: [
      { value: '', label: 'All Seasons' },
      { value: 'halloween', label: 'Halloween' },
      { value: 'christmas', label: 'Christmas' },
      { value: 'shared', label: 'Shared' }
    ],
    category: [
      { value: '', label: 'All Categories' },
      { value: 'item_catalog', label: 'Item Catalog' },
      { value: 'ideas', label: 'Ideas' },
      { value: 'builds', label: 'Builds' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'storage', label: 'Storage' },
      { value: 'receipts', label: 'Receipts' },
      { value: 'deployment', label: 'Deployments' },
      { value: 'gallery_showcase', label: 'Gallery - Showcase' },
      { value: 'gallery_progress', label: 'Gallery - Progress' },
      { value: 'gallery_community', label: 'Gallery - Community' },
      { value: 'misc', label: 'Misc' }
    ],
    isPublic: [
      { value: '', label: 'All' },
      { value: 'true', label: 'Public' },
      { value: 'false', label: 'Private' }
    ],
    hasReferences: [
      { value: '', label: 'All' },
      { value: 'true', label: 'Linked' },
      { value: 'false', label: 'Orphaned' }
    ]
  }
};

// Validation helper
export function validateCategory(category, data) {
  const config = IMAGES_CONFIG.CATEGORIES[category];
  if (!config) {
    return { valid: false, errors: ['Invalid category'] };
  }
  
  const errors = [];
  config.requiredFields.forEach(field => {
    // Handle different field name patterns
    let value;
    if (field === 'item_id') {
      value = data.item_ids && data.item_ids.length > 0 ? data.item_ids[0] : null;
    } else {
      value = data[field];
    }
    
    if (!value) {
      errors.push(`${field} is required for ${config.label}`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

// Get photo type from category
export function getPhotoType(category) {
  return IMAGES_CONFIG.CATEGORIES[category]?.photoType || 'catalog';
}

// Check if category is a gallery category
export function isGalleryCategory(category) {
  return category && category.startsWith('gallery_');
}

// Get gallery section from category
export function getGallerySection(category) {
  return IMAGES_CONFIG.CATEGORIES[category]?.gallerySection || null;
}

// Check if photo is orphaned (no references)
export function isOrphaned(photo) {
  const hasItemIds = photo.item_ids && photo.item_ids.length > 0;
  const hasIdeaId = !!photo.idea_id;
  const hasDeploymentId = !!photo.deployment_id;
  const hasStorageId = !!photo.storage_id;
  
  return !hasItemIds && !hasIdeaId && !hasDeploymentId && !hasStorageId;
}