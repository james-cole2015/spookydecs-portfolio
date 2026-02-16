/**
 * BackToTop Component
 * Shows a floating button when user scrolls down
 */

export class BackToTop {
  constructor() {
    this.button = null;
    this.scrollThreshold = 300; // Show after scrolling 300px
    this.isVisible = false;
  }

  /**
   * Initialize and render the button
   */
  init() {
    // Create button element
    this.button = document.createElement('button');
    this.button.className = 'back-to-top';
    this.button.setAttribute('aria-label', 'Back to top');
    this.button.innerHTML = '↑';
    
    // Append to body
    document.body.appendChild(this.button);
    
    // Attach event listeners
    this.attachListeners();
  }

  /**
   * Attach scroll and click listeners
   */
  attachListeners() {
    // Handle scroll to show/hide button
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        this.handleScroll();
      }, 100); // Debounce scroll events
    });
    
    // Handle click to scroll to top
    this.button.addEventListener('click', () => {
      this.scrollToTop();
    });
  }

  /**
   * Handle scroll event - show/hide button
   */
  handleScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollPosition > this.scrollThreshold && !this.isVisible) {
      this.show();
    } else if (scrollPosition <= this.scrollThreshold && this.isVisible) {
      this.hide();
    }
  }

  /**
   * Show the button
   */
  show() {
    this.isVisible = true;
    this.button.classList.add('visible');
  }

  /**
   * Hide the button
   */
  hide() {
    this.isVisible = false;
    this.button.classList.remove('visible');
  }

  /**
   * Scroll smoothly to top
   */
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Destroy the component
   */
  destroy() {
    if (this.button) {
      this.button.remove();
      this.button = null;
    }
  }
}

export default BackToTop;