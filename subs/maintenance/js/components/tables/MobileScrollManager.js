// Mobile infinite scroll manager for maintenance records and items

export class MobileScrollManager {
  constructor(onLoadMore) {
    this.onLoadMore = onLoadMore;
    this.mobileLoadedCount = 20; // Initial load
    this.mobileLoadIncrement = 20; // Load 20 more at a time
    this.isLoadingMore = false;
    this.infiniteScrollObserver = null;
  }
  
  resetLoadCount() {
    this.mobileLoadedCount = this.mobileLoadIncrement;
  }
  
  getLoadedCount() {
    return this.mobileLoadedCount;
  }
  
  renderRecordCount(total, showing) {
    return `
      <div class="mobile-record-count">
        Showing ${showing} of ${total} ${total === 1 ? 'record' : 'records'}
      </div>
    `;
  }
  
  renderItemCount(total, showing) {
    return `
      <div class="mobile-record-count">
        Showing ${showing} of ${total} ${total === 1 ? 'item' : 'items'}
      </div>
    `;
  }
  
  renderLoadingTrigger() {
    return `
      <div class="infinite-scroll-trigger" id="infinite-scroll-trigger">
        <div class="loading-spinner">
          <div class="spinner-dot"></div>
          <div class="spinner-dot"></div>
          <div class="spinner-dot"></div>
        </div>
      </div>
    `;
  }
  
  renderEndOfResults() {
    return `
      <div class="end-of-results">
        <div class="end-icon">✓</div>
        <p>End of results</p>
      </div>
    `;
  }
  
  renderScrollToTop() {
    return `
      <button class="scroll-to-top-btn hidden" id="scroll-to-top-btn" title="Scroll to top">
        ↑
      </button>
    `;
  }
  
  setupInfiniteScroll(container, totalCount) {
    // Clean up existing observer
    if (this.infiniteScrollObserver) {
      this.infiniteScrollObserver.disconnect();
    }
    
    const trigger = container.querySelector('#infinite-scroll-trigger');
    if (!trigger) return;
    
    // Create intersection observer
    this.infiniteScrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.isLoadingMore && this.mobileLoadedCount < totalCount) {
            this.loadMore();
          }
        });
      },
      {
        root: null,
        rootMargin: '100px', // Trigger 100px before reaching the element
        threshold: 0.1
      }
    );
    
    this.infiniteScrollObserver.observe(trigger);
  }
  
  loadMore() {
    this.isLoadingMore = true;
    
    // Simulate slight delay for better UX (shows loading state)
    setTimeout(() => {
      this.mobileLoadedCount += this.mobileLoadIncrement;
      this.isLoadingMore = false;
      
      if (this.onLoadMore) {
        this.onLoadMore();
      }
    }, 300);
  }
  
  setupScrollToTop(container) {
    const scrollBtn = container.querySelector('#scroll-to-top-btn');
    if (!scrollBtn) return;
    
    // Remove existing listener if any
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      if (scrollTop > 400) {
        scrollBtn.classList.remove('hidden');
      } else {
        scrollBtn.classList.add('hidden');
      }
    };
    
    // Scroll to top when clicked
    scrollBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
    
    // Attach scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Store handler for cleanup
    this.scrollHandler = handleScroll;
  }
  
  cleanup() {
    // Disconnect observer
    if (this.infiniteScrollObserver) {
      this.infiniteScrollObserver.disconnect();
      this.infiniteScrollObserver = null;
    }
    
    // Remove scroll listener
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
  }
}