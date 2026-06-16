/**
 * Gallery configuration — typed port of js/utils/gallery-config.js (#337).
 *
 * Constants, the section → photo_type map, and the small formatting helpers are
 * carried over verbatim. The section identifiers and PHOTO_TYPES values are
 * backend filter values — do not rename them.
 */

export const GALLERY_CONFIG = {
  // Sections
  SECTIONS: {
    SHOWCASE: 'showcase',
    PROGRESS: 'progress',
    COMMUNITY: 'community',
  },

  // Section labels
  SECTION_LABELS: {
    showcase: 'SpookyDecs Displays',
    progress: 'Custom Builds',
    community: 'Community Displays',
  } as Record<string, string>,

  // Seasons
  SEASONS: {
    HALLOWEEN: 'halloween',
    CHRISTMAS: 'christmas',
    SHARED: 'shared',
  },

  // Season labels
  SEASON_LABELS: {
    halloween: 'Halloween',
    christmas: 'Christmas',
    shared: 'All Seasons',
  } as Record<string, string>,

  // Season emojis
  SEASON_EMOJIS: {
    halloween: '🎃',
    christmas: '🎄',
    shared: '🌟',
  } as Record<string, string>,

  // Photo types (backend `photo_type` values; section → photo_type mapping)
  PHOTO_TYPES: {
    GALLERY_SHOWCASE: 'gallery_showcase',
    BUILD: 'build',
    GALLERY_COMMUNITY: 'gallery_community',
  },

  // Infinite scroll
  BATCH_SIZE: 20,
  SCROLL_THRESHOLD: 200,

  // Carousel
  CAROUSEL_AUTOPLAY_DELAY: 5000,

  // API
  API_TIMEOUT: 10000,
} as const;

/** A gallery section discriminator. */
export type Section = 'showcase' | 'progress' | 'community';

/** Active browse filters — mirror the URL query params. */
export interface GalleryFilters {
  season: string | null;
  year: string | null;
  /** Comma-separated tag list (any-match / OR semantics on the backend). */
  tags: string | null;
}

/** A photo record as returned by `GET /gallery/images`. */
export interface GalleryPhoto {
  photo_id: string;
  cloudfront_url: string;
  thumb_cloudfront_url?: string;
  display_name?: string;
  location?: string;
  caption?: string;
  tags?: string[];
  season?: string;
  year?: string | number;
  is_featured?: boolean;
}

/** The three section tabs, in display order. */
export const SECTION_TABS: { id: Section; label: string; icon: string }[] = [
  { id: 'showcase', label: 'SpookyDecs Displays', icon: '🎃' },
  { id: 'progress', label: 'Custom Builds', icon: '🛠️' },
  { id: 'community', label: 'Community Displays', icon: '🌟' },
];

/** Get section label. */
export function getSectionLabel(section: string): string {
  return GALLERY_CONFIG.SECTION_LABELS[section] || section;
}

/** Get season label. */
export function getSeasonLabel(season: string): string {
  return GALLERY_CONFIG.SEASON_LABELS[season.toLowerCase()] || season;
}

/** Get season emoji. */
export function getSeasonEmoji(season: string): string {
  return GALLERY_CONFIG.SEASON_EMOJIS[season.toLowerCase()] || '🌟';
}

/** Format an ISO date string for display. */
export function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateString;
  }
}

/** Capitalize the first letter. */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Year options for the filter, current year back to 2020. */
export function yearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let y = currentYear; y >= 2020; y--) years.push(String(y));
  return years;
}
