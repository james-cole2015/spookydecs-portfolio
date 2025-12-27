/**
 * TableInfiniteScroll Component
 * 
 * Handles infinite scroll pagination for the images table
 */

let observer = null;
let sentinel = null;
let isLoading = false;
let hasMore = true;

/**
 * Initialize infinite scroll
 * @param {HTMLElement} container - Container element
 * @param {Function} onLoadMore - Callback to load more data
 */
export function initInfiniteScroll(container, onLoadMore) {
  // Clean up any existing observer
  cleanup();
  
  // Create sentinel element
  sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  sentinel.style.cssText = `
    height: 1px;
    width: 100%;
  `;
  
  container.appendChild(sentinel);
  
  // Create intersection observer
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      
      // If sentinel is visible and we're not already loading
      if (entry.isIntersecting && !isLoading && hasMore) {
        console.log('Sentinel visible - loading more photos');
        loadMore(onLoadMore);
      }
    },
    {
      root: null, // Use viewport
      rootMargin: '100px', // Start loading 100px before reaching sentinel
      threshold: 0.1
    }
  );
  
  observer.observe(sentinel);
  
  console.log('Infinite scroll initialized');
}

/**
 * Load more data
 * @param {Function} onLoadMore - Callback to load more data
 */
async function loadMore(onLoadMore) {
  if (isLoading || !hasMore) {
    return;
  }
  
  isLoading = true;
  showLoadingSpinner();
  
  try {
    const moreAvailable = await onLoadMore();
    hasMore = moreAvailable !== false;
    
    if (!hasMore) {
      showEndMessage();
    }
  } catch (error) {
    console.error('Error loading more photos:', error);
    showErrorMessage(error.message);
  } finally {
    isLoading = false;
    hideLoadingSpinner();
  }
}

/**
 * Show loading spinner
 */
function showLoadingSpinner() {
  if (!sentinel) return;
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.innerHTML = `
    <div class="spinner-container">
      <div class="spinner"></div>
      <p>Loading more photos...</p>
    </div>
  `;
  
  sentinel.parentNode.insertBefore(spinner, sentinel);
}

/**
 * Hide loading spinner
 */
function hideLoadingSpinner() {
  const spinner = document.querySelector('.loading-spinner');
  if (spinner) {
    spinner.remove();
  }
}

/**
 * Show end of results message
 */
function showEndMessage() {
  if (!sentinel) return;
  
  const message = document.createElement('div');
  message.className = 'end-message';
  message.innerHTML = `
    <p style="text-align: center; color: #666; padding: 20px;">
      📷 No more photos to load
    </p>
  `;
  
  sentinel.parentNode.insertBefore(message, sentinel);
}

/**
 * Show error message
 * @param {string} errorMessage - Error message to display
 */
function showErrorMessage(errorMessage) {
  if (!sentinel) return;
  
  const message = document.createElement('div');
  message.className = 'error-message';
  message.innerHTML = `
    <p style="text-align: center; color: #ff6b35; padding: 20px;">
      ⚠️ Error loading more photos: ${errorMessage}
    </p>
  `;
  
  sentinel.parentNode.insertBefore(message, sentinel);
  
  // Remove error message after 5 seconds
  setTimeout(() => message.remove(), 5000);
}

/**
 * Reset infinite scroll state
 */
export function resetInfiniteScroll() {
  isLoading = false;
  hasMore = true;
  
  // Remove any messages
  const messages = document.querySelectorAll('.end-message, .loading-spinner, .error-message');
  messages.forEach(msg => msg.remove());
}

/**
 * Clean up infinite scroll
 */
export function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  if (sentinel) {
    sentinel.remove();
    sentinel = null;
  }
  
  isLoading = false;
  hasMore = true;
  
  // Remove any messages
  const messages = document.querySelectorAll('.end-message, .loading-spinner, .error-message');
  messages.forEach(msg => msg.remove());
}

/**
 * Set loading state manually
 * @param {boolean} loading - Loading state
 */
export function setLoading(loading) {
  isLoading = loading;
  
  if (loading) {
    showLoadingSpinner();
  } else {
    hideLoadingSpinner();
  }
}

/**
 * Set hasMore state manually
 * @param {boolean} more - Has more state
 */
export function setHasMore(more) {
  hasMore = more;
  
  if (!more) {
    showEndMessage();
  }
}

/**
 * Get current loading state
 * @returns {boolean} Is loading
 */
export function isCurrentlyLoading() {
  return isLoading;
}

/**
 * Get hasMore state
 * @returns {boolean} Has more data
 */
export function hasMoreData() {
  return hasMore;
}
