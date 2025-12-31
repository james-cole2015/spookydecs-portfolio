/**
 * TabBar Component
 * Season tabs for filtering storage units
 */

import { setActiveTab, getActiveTab } from '../utils/state.js';

export class TabBar {
  constructor(options = {}) {
    this.tabs = options.tabs || ['All', 'Halloween', 'Christmas', 'Shared'];
    this.activeTab = options.activeTab || getActiveTab();
    this.onChange = options.onChange || (() => {});
    this.container = null;
  }

  /**
   * Render the tab bar
   */
  render(containerElement) {
    this.container = containerElement;
    
    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    
    // Create tabs
    this.tabs.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.className = `tab-button ${this.activeTab === tab ? 'tab-active' : ''}`;
      tabButton.textContent = tab;
      tabButton.dataset.tab = tab;
      
      tabButton.addEventListener('click', () => this.handleTabClick(tab));
      
      tabBar.appendChild(tabButton);
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(tabBar);
  }

  /**
   * Handle tab click
   */
  handleTabClick(tab) {
    if (tab === this.activeTab) return;
    
    this.activeTab = tab;
    setActiveTab(tab);
    
    // Update UI
    this.updateActiveTab();
    
    // Trigger callback
    this.onChange(tab);
  }

  /**
   * Update active tab styling
   */
  updateActiveTab() {
    if (!this.container) return;
    
    const buttons = this.container.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
      if (btn.dataset.tab === this.activeTab) {
        btn.classList.add('tab-active');
      } else {
        btn.classList.remove('tab-active');
      }
    });
  }

  /**
   * Set active tab programmatically
   */
  setActive(tab) {
    this.activeTab = tab;
    setActiveTab(tab);
    this.updateActiveTab();
  }

  /**
   * Get current active tab
   */
  getActive() {
    return this.activeTab;
  }
}

export default TabBar;
