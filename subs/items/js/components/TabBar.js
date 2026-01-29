// TabBar Component
// Sticky tab navigation with scroll indicators

export class TabBar {
  constructor(containerId, tabs, onTabChange) {
    this.container = document.getElementById(containerId);
    this.tabs = tabs;
    this.onTabChange = onTabChange;
    this.activeTab = tabs[0]?.id || null;
    this.scrollContainer = null;
  }
  
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="tab-bar-wrapper">
        <div class="tab-bar-container" id="tab-bar-container">
          <button class="tab-scroll-arrow tab-scroll-left hidden" id="scroll-left">
            ←
          </button>
          
          <div class="tab-bar-scroll" id="tab-bar-scroll">
            <div class="tab-bar">
              ${this.tabs.map(tab => `
                <button 
                  class="tab-item ${tab.id === this.activeTab ? 'active' : ''}"
                  data-tab="${tab.id}"
                  onclick="tabBar.setActiveTab('${tab.id}')"
                >
                  ${tab.label}
                </button>
              `).join('')}
            </div>
          </div>
          
          <button class="tab-scroll-arrow tab-scroll-right hidden" id="scroll-right">
            →
          </button>
        </div>
      </div>
    `;
    
    this.scrollContainer = document.getElementById('tab-bar-scroll');
    this.updateScrollIndicators();
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    if (!this.scrollContainer) return;
    
    // Scroll event listener
    this.scrollContainer.addEventListener('scroll', () => {
      this.updateScrollIndicators();
    });
    
    // Arrow click handlers
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');
    
    if (leftArrow) {
      leftArrow.addEventListener('click', () => {
        this.scrollContainer.scrollBy({ left: -200, behavior: 'smooth' });
      });
    }
    
    if (rightArrow) {
      rightArrow.addEventListener('click', () => {
        this.scrollContainer.scrollBy({ left: 200, behavior: 'smooth' });
      });
    }
    
    // Window resize handler
    window.addEventListener('resize', () => {
      this.updateScrollIndicators();
    });
  }
  
  updateScrollIndicators() {
    if (!this.scrollContainer) return;
    
    const container = document.getElementById('tab-bar-container');
    const leftArrow = document.getElementById('scroll-left');
    const rightArrow = document.getElementById('scroll-right');
    
    if (!container || !leftArrow || !rightArrow) return;
    
    const scrollLeft = this.scrollContainer.scrollLeft;
    const scrollWidth = this.scrollContainer.scrollWidth;
    const clientWidth = this.scrollContainer.clientWidth;
    
    // Check if content overflows
    const hasOverflow = scrollWidth > clientWidth;
    
    if (!hasOverflow) {
      // No overflow, hide everything
      leftArrow.classList.add('hidden');
      rightArrow.classList.add('hidden');
      container.classList.remove('show-left-fade', 'show-right-fade');
      return;
    }
    
    // Show/hide left arrow and fade
    if (scrollLeft > 10) {
      leftArrow.classList.remove('hidden');
      container.classList.add('show-left-fade');
    } else {
      leftArrow.classList.add('hidden');
      container.classList.remove('show-left-fade');
    }
    
    // Show/hide right arrow and fade
    const maxScroll = scrollWidth - clientWidth;
    if (scrollLeft < maxScroll - 10) {
      rightArrow.classList.remove('hidden');
      container.classList.add('show-right-fade');
    } else {
      rightArrow.classList.add('hidden');
      container.classList.remove('show-right-fade');
    }
  }
  
  setActiveTab(tabId) {
    if (this.activeTab === tabId) return;
    
    this.activeTab = tabId;
    
    // Update active state
    const tabs = this.container.querySelectorAll('.tab-item');
    tabs.forEach(tab => {
      if (tab.dataset.tab === tabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Notify parent
    if (this.onTabChange) {
      this.onTabChange(tabId);
    }
  }
  
  getActiveTab() {
    return this.activeTab;
  }
}

// Global instance for onclick handlers
let tabBar = null;

export function initTabBar(containerId, tabs, onTabChange) {
  tabBar = new TabBar(containerId, tabs, onTabChange);
  tabBar.render();
  
  // Make available globally
  if (typeof window !== 'undefined') {
    window.tabBar = tabBar;
  }
  
  return tabBar;
}