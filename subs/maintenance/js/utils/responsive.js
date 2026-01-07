// Responsive utility functions for mobile detection and viewport management

export const MOBILE_BREAKPOINT = 768;

/**
 * Check if current viewport is mobile size
 * @returns {boolean} True if viewport width is below mobile breakpoint
 */
export function isMobile() {
  return window.innerWidth < MOBILE_BREAKPOINT;
}

/**
 * Check if current viewport is desktop size
 * @returns {boolean} True if viewport width is at or above mobile breakpoint
 */
export function isDesktop() {
  return window.innerWidth >= MOBILE_BREAKPOINT;
}

/**
 * Setup responsive listener that calls callback on viewport resize
 * Includes debouncing to avoid excessive calls
 * @param {Function} callback - Function to call when viewport changes
 * @param {number} delay - Debounce delay in milliseconds (default: 150)
 * @returns {Function} Cleanup function to remove listener
 */
export function setupResponsiveListener(callback, delay = 150) {
  let timeoutId;
  let previousIsMobile = isMobile();
  
  const handleResize = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      const currentIsMobile = isMobile();
      // Only call callback if mobile/desktop state actually changed
      if (currentIsMobile !== previousIsMobile) {
        previousIsMobile = currentIsMobile;
        callback(currentIsMobile);
      }
    }, delay);
  };
  
  window.addEventListener('resize', handleResize);
  
  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
    window.removeEventListener('resize', handleResize);
  };
}

/**
 * Get current viewport dimensions
 * @returns {Object} Object with width and height properties
 */
export function getViewportSize() {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

/**
 * Check if device is in portrait orientation
 * @returns {boolean} True if portrait, false if landscape
 */
export function isPortrait() {
  return window.innerHeight > window.innerWidth;
}

/**
 * Check if device is in landscape orientation
 * @returns {boolean} True if landscape, false if portrait
 */
export function isLandscape() {
  return window.innerWidth > window.innerHeight;
}