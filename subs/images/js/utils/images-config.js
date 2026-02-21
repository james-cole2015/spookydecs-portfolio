// Images Configuration
export const IMAGES_CONFIG = {
  API_BASE: '/admin/images',

  // Category definitions — used by gallery-manager for photo_type lookup
  CATEGORIES: {
    gallery_showcase: {
      label: 'Gallery - Showcase',
      photoType: 'gallery_showcase',
      gallerySection: 'showcase'
    },
    gallery_progress: {
      label: 'Gallery - Progress',
      photoType: 'build',
      gallerySection: 'progress'
    },
    gallery_community: {
      label: 'Gallery - Community',
      photoType: 'gallery_community',
      gallerySection: 'community'
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

// Check if photo is orphaned (no references)
export function isOrphaned(photo) {
  const hasItemIds = photo.item_ids && photo.item_ids.length > 0;
  const hasIdeaId = !!photo.idea_id;
  const hasDeploymentId = !!photo.deployment_id;
  const hasStorageId = !!photo.storage_id;
  const hasCostRecordId = !!photo.cost_record_id;

  return !hasItemIds && !hasIdeaId && !hasDeploymentId && !hasStorageId && !hasCostRecordId;
}
