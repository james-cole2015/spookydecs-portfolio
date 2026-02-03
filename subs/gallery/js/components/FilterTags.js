/**
 * FilterTags Component
 * 
 * Displays active filters as pill-shaped badges
 * Click to remove individual filters
 */

export class FilterTags {
  constructor(container) {
    this.container = container;
    this.filters = {};
    this.onFilterRemove = null;
  }

  /**
   * Initialize with filters and callback
   */
  init(filters, onFilterRemove) {
    this.filters = filters;
    this.onFilterRemove = onFilterRemove;
    this.render();
  }

  /**
   * Update filters and re-render
   */
  update(filters) {
    this.filters = filters;
    this.render();
  }

  /**
   * Render filter tags
   */
  render() {
    const { season, year } = this.filters;
    
    // Check if any filters are active
    const hasFilters = season || year;

    if (!hasFilters) {
      this.container.innerHTML = `
        <div class="filter-tags">
          <span class="filter-tags-empty">No filters applied</span>
        </div>
      `;
      return;
    }

    const tags = [];

    // Season tag
    if (season) {
      const seasonEmoji = this.getSeasonEmoji(season);
      const seasonLabel = this.getSeasonLabel(season);
      tags.push(`
        <button class="filter-tag" data-filter="season" data-value="${season}">
          <span class="filter-tag-icon">${seasonEmoji}</span>
          <span>${seasonLabel}</span>
          <span class="filter-tag-remove">×</span>
        </button>
      `);
    }

    // Year tag
    if (year) {
      tags.push(`
        <button class="filter-tag" data-filter="year" data-value="${year}">
          <span class="filter-tag-icon">📅</span>
          <span>${year}</span>
          <span class="filter-tag-remove">×</span>
        </button>
      `);
    }

    this.container.innerHTML = `
      <div class="filter-tags">
        ${tags.join('')}
        <a href="#" class="browse-all-link">Browse all</a>
      </div>
    `;

    this.attachEventListeners();
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Filter tag remove buttons
    const tags = this.container.querySelectorAll('.filter-tag');
    tags.forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = tag.dataset.filter;
        if (this.onFilterRemove) {
          this.onFilterRemove(filter);
        }
      });
    });

    // Browse all link
    const browseAllLink = this.container.querySelector('.browse-all-link');
    if (browseAllLink) {
      browseAllLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.onFilterRemove) {
          this.onFilterRemove('all');
        }
      });
    }
  }

  /**
   * Get emoji for season
   */
  getSeasonEmoji(season) {
    const emojis = {
      'halloween': '🎃',
      'christmas': '🎄',
      'shared': '🌟'
    };
    return emojis[season.toLowerCase()] || '🌟';
  }

  /**
   * Get label for season
   */
  getSeasonLabel(season) {
    const labels = {
      'halloween': 'Halloween',
      'christmas': 'Christmas',
      'shared': 'All Seasons'
    };
    return labels[season.toLowerCase()] || season;
  }

  /**
   * Get active filter count
   */
  getFilterCount() {
    let count = 0;
    if (this.filters.season) count++;
    if (this.filters.year) count++;
    return count;
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters() {
    return this.getFilterCount() > 0;
  }

  /**
   * Clear all filters
   */
  clearAll() {
    this.filters = {};
    this.render();
  }

  /**
   * Destroy component
   */
  destroy() {
    this.container.innerHTML = '';
  }
}
