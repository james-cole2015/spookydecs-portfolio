// Images Configuration
export const IMAGES_CONFIG = {
  API_BASE: '/admin/images',

  // Category definitions — used by gallery-manager for photo_type lookup
  CATEGORIES: {
    gallery_showcase: {
      label: 'Gallery - Showcase',
      photoType: 'gallery_showcase',
      gallerySection: 'showcase',
      requiredFields: []
    },
    gallery_progress: {
      label: 'Gallery - Progress',
      photoType: 'build',
      gallerySection: 'progress',
      requiredFields: []
    },
    gallery_community: {
      label: 'Gallery - Community',
      photoType: 'gallery_community',
      gallerySection: 'community',
      requiredFields: []
    },
    item_catalog: {
      label: 'Item Catalog',
      photoType: 'catalog',
      requiredFields: []
    },
    maintenance: {
      label: 'Maintenance',
      photoType: 'repair',
      requiredFields: []
    },
    deployments: {
      label: 'Deployments',
      photoType: 'deployment',
      requiredFields: []
    },
    storage: {
      label: 'Storage',
      photoType: 'storage',
      requiredFields: []
    },
    builds: {
      label: 'Builds / Progress',
      photoType: 'build',
      requiredFields: []
    },
    ideas: {
      label: 'Ideas',
      photoType: 'inspiration',
      requiredFields: []
    },
    receipts: {
      label: 'Receipts',
      photoType: 'receipt',
      requiredFields: []
    },
    gallery: {
      label: 'Gallery',
      photoType: 'gallery',
      requiredFields: []
    },
    misc: {
      label: 'Miscellaneous',
      photoType: '',
      requiredFields: []
    }
  },

  SEASONS: [
    { value: 'halloween', label: 'Halloween' },
    { value: 'christmas', label: 'Christmas' },
    { value: 'shared', label: 'Shared' }
  ],

  // Filter options — keyed to actual stored photo_type values
  FILTER_OPTIONS: {
    season: [
      { value: '', label: 'All Seasons' },
      { value: 'halloween', label: 'Halloween' },
      { value: 'christmas', label: 'Christmas' },
      { value: 'shared', label: 'Shared' }
    ],
    photo_type: [
      { value: '', label: 'All Types' },
      { value: 'catalog', label: 'Item Catalog' },
      { value: 'deployment', label: 'Deployments' },
      { value: 'inspiration', label: 'Ideas' },
      { value: 'build', label: 'Builds / Progress' },
      { value: 'repair', label: 'Maintenance' },
      { value: 'receipt', label: 'Receipts' },
      { value: 'gallery_showcase', label: 'Gallery - Showcase' },
      { value: 'gallery_community', label: 'Gallery - Community' }
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

// Validate category and its required fields
export function validateCategory(category, updates) {
  const errors = [];

  if (!category || !IMAGES_CONFIG.CATEGORIES[category]) {
    errors.push('Invalid or missing category');
  } else {
    const categoryConfig = IMAGES_CONFIG.CATEGORIES[category];
    const requiredFields = categoryConfig.requiredFields || [];
    requiredFields.forEach(field => {
      if (!updates[field]) {
        errors.push(`${field} is required for ${categoryConfig.label}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

// Check if photo is orphaned (no references)
export function isOrphaned(photo) {
  const hasItemIds = photo.item_ids && photo.item_ids.length > 0;
  const hasIdeaId = !!photo.idea_id;
  const hasDeploymentId = !!photo.deployment_id;
  const hasStorageId = !!photo.storage_id;
  const hasCostRecordId = !!photo.cost_record_id;

  return !hasItemIds && !hasIdeaId && !hasDeploymentId && !hasStorageId && !hasCostRecordId;
}
