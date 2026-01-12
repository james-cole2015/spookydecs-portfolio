/**
 * ViewSelector Component
 * Mobile-optimized dropdown selector to replace tab bar on small screens
 */

import { setActiveTab, getActiveTab } from '../utils/state.js';

export class ViewSelector {
  constructor(options = {}) {
    this.views = options.views || ['All', 'Halloween', 'Christmas', 'Shared'];
    this.activeView = options.activeView || getActiveTab();
    this.onChange = options.onChange || (() => {});
    this.container = null;
  }

  /**
   * Render the view selector
   */
  render(containerElement) {
    this.container = containerElement;
    
    const selector = document.createElement('div');
    selector.className = 'view-selector';
    
    // Create label
    const label = document.createElement('label');
    label.className = 'view-selector-label';
    label.textContent = 'View:';
    label.setAttribute('for', 'view-select');
    
    // Create select dropdown
    const select = document.createElement('select');
    select.className = 'view-selector-dropdown';
    select.id = 'view-select';
    
    // Add options
    this.views.forEach(view => {
      const option = document.createElement('option');
      option.value = view;
      option.textContent = view;
      option.selected = this.activeView === view;
      select.appendChild(option);
    });
    
    // Add change listener
    select.addEventListener('change', (e) => this.handleViewChange(e.target.value));
    
    // Assemble
    selector.appendChild(label);
    selector.appendChild(select);
    
    this.container.innerHTML = '';
    this.container.appendChild(selector);
  }

  /**
   * Handle view change
   */
  handleViewChange(view) {
    if (view === this.activeView) return;
    
    this.activeView = view;
    setActiveTab(view);
    
    // Trigger callback
    this.onChange(view);
  }

  /**
   * Set active view programmatically
   */
  setActive(view) {
    this.activeView = view;
    setActiveTab(view);
    
    // Update UI
    if (this.container) {
      const select = this.container.querySelector('.view-selector-dropdown');
      if (select) {
        select.value = view;
      }
    }
  }

  /**
   * Get current active view
   */
  getActive() {
    return this.activeView;
  }
}

export default ViewSelector;