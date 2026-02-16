/**
 * PageHeader Component - With Stats Drawer
 * Displays page title with action buttons and a stats drawer that slides from right
 */

export class PageHeader {
  constructor(options = {}) {
    this.title = options.title || 'Storage Units';
    this.icon = options.icon || '📦';
    this.stats = options.stats || null;
    this.container = null;
    this.drawerOpen = false;
  }

  /**
   * Render the header
   */
  render(containerElement) {
    this.container = containerElement;
    
    const header = document.createElement('div');
    header.className = 'page-header';
    
    header.innerHTML = `
      <h1 class="page-title">
        <span class="page-icon">${this.icon}</span>
        ${this.title}
      </h1>
      
      <div class="page-actions" id="page-actions">
        <!-- Action buttons will be inserted here by parent -->
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(header);
    
    // Create stats drawer (outside of page-header)
    if (this.stats) {
      this.createStatsDrawer();
    }
  }

  /**
   * Create stats drawer overlay
   */
  createStatsDrawer() {
    // Remove existing drawer if any
    const existingDrawer = document.getElementById('stats-drawer-overlay');
    if (existingDrawer) {
      existingDrawer.remove();
    }
    
    const drawer = document.createElement('div');
    drawer.id = 'stats-drawer-overlay';
    drawer.className = 'stats-drawer-overlay';
    
    drawer.innerHTML = `
      <div class="stats-drawer-backdrop" id="stats-drawer-backdrop"></div>
      <div class="stats-drawer" id="stats-drawer">
        <div class="stats-drawer-header">
          <h2 class="stats-drawer-title">Storage Statistics</h2>
          <button class="stats-drawer-close" id="stats-drawer-close" aria-label="Close stats">
            ✕
          </button>
        </div>
        
        <div class="stats-drawer-content">
          ${this.renderStatsContent()}
        </div>
      </div>
    `;
    
    document.body.appendChild(drawer);
    
    // Attach event listeners
    this.attachDrawerListeners();
  }

  /**
   * Render stats content
   */
  renderStatsContent() {
    if (!this.stats) return '<p>No statistics available</p>';
    
    return `
      <div class="stats-section">
        <h3 class="stats-section-title">Overview</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">📦</div>
            <div class="stat-content">
              <div class="stat-value">${this.stats.total_storage || 0}</div>
              <div class="stat-label">Storage Units</div>
            </div>
          </div>
          
          ${this.stats.unpacked_storage > 0 ? `
            <div class="stat-card stat-warning">
              <div class="stat-icon">⚪</div>
              <div class="stat-content">
                <div class="stat-value">${this.stats.unpacked_storage}</div>
                <div class="stat-label">Unpacked Storage</div>
              </div>
            </div>
          ` : ''}
          
          <div class="stat-card">
            <div class="stat-icon">🎃</div>
            <div class="stat-content">
              <div class="stat-value">${this.stats.total_items || 0}</div>
              <div class="stat-label">Total Items</div>
            </div>
          </div>
          
          ${this.stats.unpacked_items > 0 ? `
            <div class="stat-card stat-alert">
              <div class="stat-icon">📋</div>
              <div class="stat-content">
                <div class="stat-value">${this.stats.unpacked_items}</div>
                <div class="stat-label">Need Packing</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      
      ${this.stats.by_season && Object.keys(this.stats.by_season).length > 0 ? `
        <div class="stats-section">
          <h3 class="stats-section-title">By Season</h3>
          <div class="season-stats-list">
            ${Object.entries(this.stats.by_season).map(([season, data]) => `
              <div class="season-stat-item">
                <div class="season-stat-header">
                  <span class="season-icon">${this.getSeasonIcon(season)}</span>
                  <span class="season-name">${season}</span>
                </div>
                <div class="season-stat-values">
                  <div class="season-stat-value">
                    <span class="season-stat-number">${data.storage || 0}</span>
                    <span class="season-stat-label">storage</span>
                  </div>
                  <div class="season-stat-value">
                    <span class="season-stat-number">${data.items || 0}</span>
                    <span class="season-stat-label">items</span>
                  </div>
                  ${data.unpacked_items > 0 ? `
                    <div class="season-stat-value season-stat-warning">
                      <span class="season-stat-number">${data.unpacked_items}</span>
                      <span class="season-stat-label">unpacked</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  }

  /**
   * Get season icon
   */
  getSeasonIcon(season) {
    const icons = {
      'Halloween': '🎃',
      'Christmas': '🎄',
      'Shared': '🔧'
    };
    return icons[season] || '📦';
  }

  /**
   * Attach drawer event listeners
   */
  attachDrawerListeners() {
    const backdrop = document.getElementById('stats-drawer-backdrop');
    const closeBtn = document.getElementById('stats-drawer-close');
    
    if (backdrop) {
      backdrop.addEventListener('click', () => this.closeDrawer());
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDrawer());
    }
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.drawerOpen) {
        this.closeDrawer();
      }
    });
  }

  /**
   * Open stats drawer
   */
  openDrawer() {
    const overlay = document.getElementById('stats-drawer-overlay');
    const drawer = document.getElementById('stats-drawer');
    
    if (overlay && drawer) {
      this.drawerOpen = true;
      overlay.classList.add('active');
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Animate in
      setTimeout(() => {
        drawer.classList.add('open');
      }, 10);
    }
  }

  /**
   * Close stats drawer
   */
  closeDrawer() {
    const overlay = document.getElementById('stats-drawer-overlay');
    const drawer = document.getElementById('stats-drawer');
    
    if (overlay && drawer) {
      this.drawerOpen = false;
      drawer.classList.remove('open');
      
      // Allow body scroll
      document.body.style.overflow = '';
      
      // Remove overlay after animation
      setTimeout(() => {
        overlay.classList.remove('active');
      }, 300);
    }
  }

  /**
   * Update stats data
   */
  updateStats(newStats) {
    this.stats = newStats;
    
    // Update drawer content if it exists
    const drawerContent = document.querySelector('.stats-drawer-content');
    if (drawerContent) {
      drawerContent.innerHTML = this.renderStatsContent();
    } else {
      // Create drawer if it doesn't exist
      this.createStatsDrawer();
    }
  }

  /**
   * Get actions container for inserting buttons
   */
  getActionsContainer() {
    return this.container.querySelector('#page-actions');
  }
}

export default PageHeader;