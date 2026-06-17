/**
 * Images configuration — typed port of js/utils/images-config.js (#336).
 * Logic preserved verbatim: CATEGORIES, SEASONS, FILTER_OPTIONS, validateCategory,
 * isOrphaned.
 */

export interface CategoryConfig {
  label: string;
  photoType: string;
  gallerySection?: string;
  requiredFields: string[];
}

export interface FilterOption {
  value: string;
  label: string;
}

/** Nested gallery curation metadata (kept as an object, not flattened). */
export interface GalleryData {
  display_name?: string;
  location?: string;
  is_featured?: boolean;
  sort_order?: number;
}

/** Photo record as returned by GET /admin/images. */
export interface Photo {
  photo_id: string;
  cloudfront_url: string;
  thumb_cloudfront_url?: string;
  s3_key?: string;
  caption?: string;
  season?: string;
  year?: number;
  photo_type?: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
  is_visible?: boolean;
  is_primary?: boolean;
  upload_date?: string;
  created_at?: string;
  // Entity references (a photo may carry several)
  item_ids?: string[];
  item_id?: string; // denormalized item_ids[0]; always dual-written with item_ids
  item_class?: string;
  storage_id?: string;
  deployment_id?: string;
  cost_ids?: string[];
  idea_id?: string;
  record_id?: string; // maintenance record
  gallery_data?: GalleryData;
  [key: string]: unknown;
}

export const IMAGES_CONFIG = {
  API_BASE: '/admin/images',

  // Category definitions — used by gallery-manager for photo_type lookup
  CATEGORIES: {
    gallery_showcase: {
      label: 'Gallery - Showcase',
      photoType: 'gallery_showcase',
      gallerySection: 'showcase',
      requiredFields: [],
    },
    gallery_progress: {
      label: 'Gallery - Progress',
      photoType: 'build',
      gallerySection: 'progress',
      requiredFields: [],
    },
    gallery_community: {
      label: 'Gallery - Community',
      photoType: 'gallery_community',
      gallerySection: 'community',
      requiredFields: [],
    },
    item_catalog: { label: 'Item Catalog', photoType: 'catalog', requiredFields: [] },
    maintenance: { label: 'Maintenance', photoType: 'repair', requiredFields: [] },
    deployments: { label: 'Deployments', photoType: 'deployment', requiredFields: [] },
    storage: { label: 'Storage', photoType: 'storage', requiredFields: [] },
    builds: { label: 'Builds / Progress', photoType: 'build', requiredFields: [] },
    ideas: { label: 'Ideas', photoType: 'inspiration', requiredFields: [] },
    receipts: { label: 'Receipts', photoType: 'receipt', requiredFields: [] },
    gallery: { label: 'Gallery', photoType: 'gallery', requiredFields: [] },
    misc: { label: 'Miscellaneous', photoType: '', requiredFields: [] },
  } as Record<string, CategoryConfig>,

  SEASONS: [
    { value: 'halloween', label: 'Halloween' },
    { value: 'christmas', label: 'Christmas' },
    { value: 'shared', label: 'Shared' },
  ] as FilterOption[],

  // Filter options — keyed to actual stored photo_type values
  FILTER_OPTIONS: {
    season: [
      { value: '', label: 'All Seasons' },
      { value: 'halloween', label: 'Halloween' },
      { value: 'christmas', label: 'Christmas' },
      { value: 'shared', label: 'Shared' },
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
      { value: 'gallery_community', label: 'Gallery - Community' },
    ],
    isPublic: [
      { value: '', label: 'All' },
      { value: 'true', label: 'Public' },
      { value: 'false', label: 'Private' },
    ],
    hasReferences: [
      { value: '', label: 'All' },
      { value: 'true', label: 'Linked' },
      { value: 'false', label: 'Orphaned' },
    ],
  } as Record<string, FilterOption[]>,
} as const;

export type ChipColor = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';

/**
 * Season pill color — single source of truth, matching the storage sub
 * (Halloween=orange/warning, Christmas=green/success, Shared=violet/secondary).
 * Case-insensitive since images stores lowercase season values.
 */
export function seasonChipColor(season?: string): ChipColor {
  switch ((season || '').toLowerCase()) {
    case 'halloween':
      return 'warning';
    case 'christmas':
      return 'success';
    case 'shared':
      return 'secondary';
    default:
      return 'default';
  }
}

/** Validate category and its required fields. */
export function validateCategory(
  category: string,
  updates: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!category || !IMAGES_CONFIG.CATEGORIES[category]) {
    errors.push('Invalid or missing category');
  } else {
    const categoryConfig = IMAGES_CONFIG.CATEGORIES[category];
    const requiredFields = categoryConfig.requiredFields || [];
    requiredFields.forEach((field) => {
      if (!updates[field]) {
        errors.push(`${field} is required for ${categoryConfig.label}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/** Check if a photo is orphaned (no entity references). */
export function isOrphaned(photo: Photo): boolean {
  const hasItemIds = !!(photo.item_ids && photo.item_ids.length > 0);
  const hasIdeaId = !!photo.idea_id;
  const hasDeploymentId = !!photo.deployment_id;
  const hasStorageId = !!photo.storage_id;
  const hasCostIds = !!(photo.cost_ids && photo.cost_ids.length > 0);

  return !hasItemIds && !hasIdeaId && !hasDeploymentId && !hasStorageId && !hasCostIds;
}
