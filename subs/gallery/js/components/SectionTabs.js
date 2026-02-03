/**
 * SectionTabs Component
 * 
 * Minimal tab navigation for gallery sections
 * Desktop: Horizontal tabs with underline
 * Mobile: Hamburger menu
 */

export class SectionTabs {
  constructor(container) {
    this.container = container;
    this.activeSection = 'showcase';
    this.onTabChange = null;
    this.isMobile = window.innerWidth <= 768;
    this.menuOpen = false;
  }

  /**
   * Initialize tabs
   */
  init(activeSection, onTabChange) {
    this.activeSection = activeSection;
    this.onTabChange = onTabChange;
    this.render();
    this.attachEventListeners();
    
    // Handle window resize
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 768;
      
      if (wasMobile !== this.isMobile) {
        this.render();
        this.attachEventListeners();
      }
    });
  }

  /**
   * Render tabs
   */
  render() {
    if (this.isMobile) {
      this.renderMobile();
    } else {
      this.renderDesktop();
    }
  }

  /**
   * Render desktop tabs
   */
  renderDesktop() {
    const tabs = [
      { id: 'showcase', label: 'SpookyDecs Displays', icon: '🎃' },
      { id: 'progress', label: 'Custom Builds', icon: '🛠️' },
      { id: 'community', label: 'Community Displays', icon: '🌟' }
    ];

    this.container.innerHTML = `
      <nav class="section-tabs-desktop">
        ${tabs.map(tab => `
          <button 
            class="section-tab ${tab.id === this.activeSection ? 'active' : ''}"
            data-section="${tab.id}"
          >
            <span class="section-tab-icon">${tab.icon}</span>
            <span class="section-tab-label">${tab.label}</span>
          </button>
        `).join('')}
      </nav>
    `;

    this.injectDesktopStyles();
  }

  /**
   * Render mobile hamburger menu
   */
  renderMobile() {
    const tabs = [
      { id: 'showcase', label: 'SpookyDecs Displays', icon: '🎃' },
      { id: 'progress', label: 'Custom Builds', icon: '🛠️' },
      { id: 'community', label: 'Community Displays', icon: '🌟' }
    ];

    const activeTab = tabs.find(t => t.id === this.activeSection);

    this.container.innerHTML = `
      <nav class="section-tabs-mobile">
        <button class="section-tabs-trigger">
          <span class="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span class="active-section-label">
            <span class="active-section-icon">${activeTab.icon}</span>
            ${activeTab.label}
          </span>
        </button>
        
        <div class="section-tabs-menu">
          ${tabs.map(tab => `
            <button 
              class="section-tab-mobile ${tab.id === this.activeSection ? 'active' : ''}"
              data-section="${tab.id}"
            >
              <span class="section-tab-icon">${tab.icon}</span>
              <span class="section-tab-label">${tab.label}</span>
            </button>
          `).join('')}
        </div>
      </nav>
    `;

    this.injectMobileStyles();
  }

  /**
   * Inject desktop styles
   */
  injectDesktopStyles() {
    if (document.getElementById('section-tabs-desktop-styles')) return;

    const style = document.createElement('style');
    style.id = 'section-tabs-desktop-styles';
    style.textContent = `
      .section-tabs-desktop {
        display: flex;
        gap: var(--spacing-xl);
        padding: var(--spacing-md) 0;
        border-bottom: 2px solid var(--border);
      }

      .section-tab {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        padding: var(--spacing-sm) 0;
        background: none;
        border: none;
        font-size: var(--text-base);
        font-weight: var(--font-medium);
        color: var(--text-secondary);
        cursor: pointer;
        position: relative;
        transition: color var(--transition-base);
      }

      .section-tab:hover {
        color: var(--text-primary);
      }

      .section-tab.active {
        color: var(--primary-orange);
      }

      .section-tab.active::after {
        content: '';
        position: absolute;
        bottom: calc(-1 * var(--spacing-md) - 2px);
        left: 0;
        right: 0;
        height: 3px;
        background: var(--primary-orange);
        border-radius: 3px 3px 0 0;
      }

      .section-tab-icon {
        font-size: var(--text-lg);
      }

      .section-tab-label {
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Inject mobile styles
   */
  injectMobileStyles() {
    if (document.getElementById('section-tabs-mobile-styles')) return;

    const style = document.createElement('style');
    style.id = 'section-tabs-mobile-styles';
    style.textContent = `
      .section-tabs-mobile {
        position: relative;
      }

      .section-tabs-trigger {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        width: 100%;
        padding: var(--spacing-md);
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        font-size: var(--text-base);
        font-weight: var(--font-medium);
        color: var(--text-primary);
        cursor: pointer;
        transition: all var(--transition-base);
      }

      .section-tabs-trigger:hover {
        background: var(--gray-50);
        border-color: var(--gray-300);
      }

      .hamburger-icon {
        display: flex;
        flex-direction: column;
        gap: 4px;
        width: 20px;
      }

      .hamburger-icon span {
        display: block;
        width: 100%;
        height: 2px;
        background: var(--text-primary);
        border-radius: 2px;
        transition: all var(--transition-base);
      }

      .section-tabs-trigger.open .hamburger-icon span:nth-child(1) {
        transform: rotate(45deg) translateY(7px);
      }

      .section-tabs-trigger.open .hamburger-icon span:nth-child(2) {
        opacity: 0;
      }

      .section-tabs-trigger.open .hamburger-icon span:nth-child(3) {
        transform: rotate(-45deg) translateY(-7px);
      }

      .active-section-label {
        display: flex;
        align-items: center;
        gap: var(--spacing-xs);
        flex: 1;
      }

      .active-section-icon {
        font-size: var(--text-lg);
      }

      .section-tabs-menu {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        right: 0;
        background: var(--background);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        opacity: 0;
        pointer-events: none;
        transform: translateY(-8px);
        transition: all var(--transition-base);
        z-index: var(--z-dropdown);
        overflow: hidden;
      }

      .section-tabs-menu.open {
        opacity: 1;
        pointer-events: all;
        transform: translateY(0);
      }

      .section-tab-mobile {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm);
        width: 100%;
        padding: var(--spacing-md);
        background: none;
        border: none;
        border-bottom: 1px solid var(--border);
        font-size: var(--text-base);
        font-weight: var(--font-medium);
        color: var(--text-secondary);
        cursor: pointer;
        text-align: left;
        transition: all var(--transition-base);
      }

      .section-tab-mobile:last-child {
        border-bottom: none;
      }

      .section-tab-mobile:hover {
        background: var(--gray-50);
        color: var(--text-primary);
      }

      .section-tab-mobile.active {
        background: var(--primary-orange-light);
        color: var(--primary-orange);
      }

      .section-tab-mobile .section-tab-icon {
        font-size: var(--text-lg);
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    if (this.isMobile) {
      this.attachMobileListeners();
    } else {
      this.attachDesktopListeners();
    }
  }

  /**
   * Attach desktop listeners
   */
  attachDesktopListeners() {
    //console.log('Attaching desktop listeners');
    const tabs = this.container.querySelectorAll('.section-tab');
    //console.log('Found tabs:', tabs.length);
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const section = tab.dataset.section;
        //console.log('Tab clicked:', section);
        this.setActiveTab(section);
        if (this.onTabChange) {
          //console.log('Calling onTabChange callback');
          this.onTabChange(section);
        }
      });
    });
  }

  /**
   * Attach mobile listeners
   */
  attachMobileListeners() {
    const trigger = this.container.querySelector('.section-tabs-trigger');
    const menu = this.container.querySelector('.section-tabs-menu');
    const tabs = this.container.querySelectorAll('.section-tab-mobile');

    // Toggle menu
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMenu();
    });

    // Tab clicks
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const section = tab.dataset.section;
        this.setActiveTab(section);
        this.closeMenu();
        if (this.onTabChange) {
          this.onTabChange(section);
        }
      });
    });

    // Close menu on outside click
    document.addEventListener('click', (e) => {
      if (this.menuOpen && !menu.contains(e.target) && e.target !== trigger) {
        this.closeMenu();
      }
    });
  }

  /**
   * Toggle mobile menu
   */
  toggleMenu() {
    const trigger = this.container.querySelector('.section-tabs-trigger');
    const menu = this.container.querySelector('.section-tabs-menu');
    
    this.menuOpen = !this.menuOpen;
    
    if (this.menuOpen) {
      trigger.classList.add('open');
      menu.classList.add('open');
    } else {
      trigger.classList.remove('open');
      menu.classList.remove('open');
    }
  }

  /**
   * Close mobile menu
   */
  closeMenu() {
    const trigger = this.container.querySelector('.section-tabs-trigger');
    const menu = this.container.querySelector('.section-tabs-menu');
    
    this.menuOpen = false;
    trigger.classList.remove('open');
    menu.classList.remove('open');
  }

  /**
   * Set active tab
   */
  setActiveTab(section) {
    this.activeSection = section;
    this.render();
    this.attachEventListeners(); // FIXED: Re-attach listeners after re-render
  }

  /**
   * Get active section
   */
  getActiveSection() {
    return this.activeSection;
  }

  /**
   * Destroy component
   */
  destroy() {
    this.container.innerHTML = '';
  }
}