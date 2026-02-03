/**
 * Gallery Configuration
 * 
 * Constants and helpers for gallery app
 */

export const GALLERY_CONFIG = {
  // Sections
  SECTIONS: {
    SHOWCASE: 'showcase',
    PROGRESS: 'progress',
    COMMUNITY: 'community'
  },

  // Section labels
  SECTION_LABELS: {
    showcase: 'SpookyDecs Displays',
    progress: 'Custom Builds',
    community: 'Community Displays'
  },

  // Seasons
  SEASONS: {
    HALLOWEEN: 'halloween',
    CHRISTMAS: 'christmas',
    SHARED: 'shared'
  },

  // Season labels
  SEASON_LABELS: {
    halloween: 'Halloween',
    christmas: 'Christmas',
    shared: 'All Seasons'
  },

  // Season emojis
  SEASON_EMOJIS: {
    halloween: '🎃',
    christmas: '🎄',
    shared: '🌟'
  },

  // Photo types
  PHOTO_TYPES: {
    GALLERY_SHOWCASE: 'gallery_showcase',
    BUILD: 'build',
    GALLERY_COMMUNITY: 'gallery_community'
  },

  // Infinite scroll
  BATCH_SIZE: 20,
  SCROLL_THRESHOLD: 200,

  // Carousel
  CAROUSEL_AUTOPLAY_DELAY: 5000,

  // API
  API_TIMEOUT: 10000
};

/**
 * Get section label
 */
export function getSectionLabel(section) {
  return GALLERY_CONFIG.SECTION_LABELS[section] || section;
}

/**
 * Get season label
 */
export function getSeasonLabel(season) {
  return GALLERY_CONFIG.SEASON_LABELS[season.toLowerCase()] || season;
}

/**
 * Get season emoji
 */
export function getSeasonEmoji(season) {
  return GALLERY_CONFIG.SEASON_EMOJIS[season.toLowerCase()] || '🌟';
}

/**
 * Format date
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
}

/**
 * Truncate text
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Debounce function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
