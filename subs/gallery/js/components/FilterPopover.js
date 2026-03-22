/**
 * FilterPopover Component
 * 
 * Dropdown popover for selecting filters
 * Appears below filter button
 */

export class FilterPopover {
  constructor(container, triggerBtn) {
    this.container = container;
    this.triggerBtn = triggerBtn;
    this.isOpen = false;
    this.filters = {};
    this.onApplyFilters = null;
    this.popover = null;
    this.selectedTags = [];
  }

  /**
   * Initialize popover
   */
  init(currentFilters, onApplyFilters) {
    this.filters = { ...currentFilters };
    this.onApplyFilters = onApplyFilters;
    this.createPopover();
    this.attachEventListeners();
  }

  /**
   * Create popover element
   */
  createPopover() {
    const popover = document.createElement('div');
    popover.className = 'filter-popover';
    popover.style.cssText = `
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 280px;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: var(--spacing-lg);
      z-index: var(--z-dropdown);
      opacity: 0;
      pointer-events: none;
      transform: translateY(-8px);
      transition: all var(--transition-base);
    `;

    popover.innerHTML = `
      <div class="filter-popover-header">
        <h3 style="font-size: var(--text-base); font-weight: var(--font-semibold); margin-bottom: var(--spacing-lg); color: var(--text-primary);">
          Filter Displays
        </h3>
      </div>

      <div class="filter-popover-body">
        <div class="filter-group" style="margin-bottom: var(--spacing-md);">
          <label style="display: block; font-size: var(--text-sm); font-weight: var(--font-medium); margin-bottom: var(--spacing-xs); color: var(--text-primary);">
            Season
          </label>
          <select 
            class="filter-select-season" 
            style="
              width: 100%;
              padding: var(--spacing-sm) var(--spacing-md);
              border: 1px solid var(--border);
              border-radius: var(--radius-md);
              font-size: var(--text-sm);
              background: var(--surface);
              color: var(--text-primary);
              cursor: pointer;
            "
          >
            <option value="">All Seasons</option>
            <option value="halloween">🎃 Halloween</option>
            <option value="christmas">🎄 Christmas</option>
            <option value="shared">🌟 Shared</option>
          </select>
        </div>

        <div class="filter-group" style="margin-bottom: var(--spacing-lg);">
          <label style="display: block; font-size: var(--text-sm); font-weight: var(--font-medium); margin-bottom: var(--spacing-xs); color: var(--text-primary);">
            Year
          </label>
          <select 
            class="filter-select-year"
            style="
              width: 100%;
              padding: var(--spacing-sm) var(--spacing-md);
              border: 1px solid var(--border);
              border-radius: var(--radius-md);
              font-size: var(--text-sm);
              background: var(--surface);
              color: var(--text-primary);
              cursor: pointer;
            "
          >
            <option value="">All Years</option>
            ${this.generateYearOptions()}
          </select>
        </div>

        <div class="filter-group" style="margin-bottom: var(--spacing-lg);">
          <label style="display: block; font-size: var(--text-sm); font-weight: var(--font-medium); margin-bottom: var(--spacing-xs); color: var(--text-primary);">
            Tags
          </label>
          <div style="display: flex; gap: var(--spacing-xs); margin-bottom: var(--spacing-xs);">
            <input
              class="filter-tag-input"
              type="text"
              placeholder="Type a tag + Enter"
              style="
                flex: 1;
                padding: var(--spacing-sm) var(--spacing-md);
                border: 1px solid var(--border);
                border-radius: var(--radius-md);
                font-size: var(--text-sm);
                background: var(--surface);
                color: var(--text-primary);
              "
            />
          </div>
          <div class="filter-tag-chips" style="display: flex; flex-wrap: wrap; gap: var(--spacing-xs); min-height: 24px;"></div>
        </div>

        <div class="filter-popover-actions" style="display: flex; gap: var(--spacing-sm);">
          <button 
            class="btn-clear-filters"
            style="
              flex: 1;
              padding: var(--spacing-sm) var(--spacing-md);
              font-size: var(--text-sm);
              font-weight: var(--font-medium);
              background: var(--gray-100);
              color: var(--text-primary);
              border: none;
              border-radius: var(--radius-md);
              cursor: pointer;
              transition: background var(--transition-base);
            "
          >
            Clear
          </button>
          <button 
            class="btn-apply-filters"
            style="
              flex: 1;
              padding: var(--spacing-sm) var(--spacing-md);
              font-size: var(--text-sm);
              font-weight: var(--font-medium);
              background: var(--primary-orange);
              color: white;
              border: none;
              border-radius: var(--radius-md);
              cursor: pointer;
              transition: background var(--transition-base);
            "
          >
            Apply
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(popover);
    this.popover = popover;

    // Set initial values
    const seasonSelect = popover.querySelector('.filter-select-season');
    const yearSelect = popover.querySelector('.filter-select-year');
    if (this.filters.season) seasonSelect.value = this.filters.season;
    if (this.filters.year) yearSelect.value = this.filters.year;

    // Initialize tag chips from current filters
    this.selectedTags = this.filters.tags
      ? this.filters.tags.split(',').filter(Boolean)
      : [];
    this.renderTagChips();
  }

  /**
   * Render tag chips inside the popover
   */
  renderTagChips() {
    const chipsContainer = this.popover.querySelector('.filter-tag-chips');
    if (!chipsContainer) return;

    chipsContainer.innerHTML = this.selectedTags.map(tag => `
      <span class="popover-tag-chip" data-tag="${tag}" style="
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px var(--spacing-sm);
        background: var(--primary-orange);
        color: white;
        border-radius: var(--radius-sm);
        font-size: var(--text-xs);
        cursor: default;
      ">
        ${tag}
        <button data-remove-tag="${tag}" style="
          background: none; border: none; color: white; cursor: pointer;
          padding: 0; font-size: var(--text-sm); line-height: 1;
        ">×</button>
      </span>
    `).join('');

    chipsContainer.querySelectorAll('[data-remove-tag]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.dataset.removeTag;
        this.selectedTags = this.selectedTags.filter(t => t !== tag);
        this.renderTagChips();
      });
    });
  }

  /**
   * Generate year options (current year back to 2020)
   */
  generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const years = [];

    for (let year = currentYear; year >= startYear; year--) {
      years.push(`<option value="${year}">${year}</option>`);
    }

    return years.join('');
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Toggle popover on trigger button click
    this.triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.isOpen && !this.popover.contains(e.target) && e.target !== this.triggerBtn) {
        this.close();
      }
    });

    // Apply button
    const applyBtn = this.popover.querySelector('.btn-apply-filters');
    applyBtn.addEventListener('click', () => {
      this.applyFilters();
    });

    // Clear button
    const clearBtn = this.popover.querySelector('.btn-clear-filters');
    clearBtn.addEventListener('click', () => {
      this.clearFilters();
    });

    // Apply on Enter key
    const seasonSelect = this.popover.querySelector('.filter-select-season');
    const yearSelect = this.popover.querySelector('.filter-select-year');

    seasonSelect.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.applyFilters();
      }
    });

    yearSelect.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.applyFilters();
      }
    });

    // Tag chip input
    const tagInput = this.popover.querySelector('.filter-tag-input');
    tagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const value = tagInput.value.trim().toLowerCase();
        if (value && !this.selectedTags.includes(value)) {
          this.selectedTags.push(value);
          this.renderTagChips();
        }
        tagInput.value = '';
      }
    });

    // Hover styles
    applyBtn.addEventListener('mouseenter', () => {
      applyBtn.style.background = 'var(--primary-orange-hover)';
    });
    applyBtn.addEventListener('mouseleave', () => {
      applyBtn.style.background = 'var(--primary-orange)';
    });

    clearBtn.addEventListener('mouseenter', () => {
      clearBtn.style.background = 'var(--gray-200)';
    });
    clearBtn.addEventListener('mouseleave', () => {
      clearBtn.style.background = 'var(--gray-100)';
    });
  }

  /**
   * Toggle popover
   */
  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Open popover
   */
  open() {
    this.isOpen = true;
    this.popover.style.opacity = '1';
    this.popover.style.pointerEvents = 'all';
    this.popover.style.transform = 'translateY(0)';
    this.triggerBtn.classList.add('active');
  }

  /**
   * Close popover
   */
  close() {
    this.isOpen = false;
    this.popover.style.opacity = '0';
    this.popover.style.pointerEvents = 'none';
    this.popover.style.transform = 'translateY(-8px)';
    this.triggerBtn.classList.remove('active');
  }

  /**
   * Apply filters
   */
  applyFilters() {
    const seasonSelect = this.popover.querySelector('.filter-select-season');
    const yearSelect = this.popover.querySelector('.filter-select-year');

    const filters = {
      season: seasonSelect.value || null,
      year: yearSelect.value || null,
      tags: this.selectedTags.length ? this.selectedTags.join(',') : null,
    };

    if (this.onApplyFilters) {
      this.onApplyFilters(filters);
    }

    this.close();
  }

  /**
   * Clear filters
   */
  clearFilters() {
    const seasonSelect = this.popover.querySelector('.filter-select-season');
    const yearSelect = this.popover.querySelector('.filter-select-year');

    seasonSelect.value = '';
    yearSelect.value = '';
    this.selectedTags = [];
    this.renderTagChips();

    if (this.onApplyFilters) {
      this.onApplyFilters({ season: null, year: null, tags: null });
    }

    this.close();
  }

  /**
   * Update current filters
   */
  updateFilters(filters) {
    this.filters = { ...filters };
    const seasonSelect = this.popover.querySelector('.filter-select-season');
    const yearSelect = this.popover.querySelector('.filter-select-year');
    if (seasonSelect) seasonSelect.value = filters.season || '';
    if (yearSelect) yearSelect.value = filters.year || '';
    this.selectedTags = filters.tags ? filters.tags.split(',').filter(Boolean) : [];
    this.renderTagChips();
  }

  /**
   * Destroy popover
   */
  destroy() {
    if (this.popover) {
      this.popover.remove();
    }
  }
}