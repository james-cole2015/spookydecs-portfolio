// Tab navigation component with mobile dropdown support

import { appState } from '../state.js';
import { isMobile } from '../utils/responsive.js';

export class Tabs {
  constructor(onTabChange) {
    this.onTabChange = onTabChange;
    this.tabs = [
      { id: 'all', label: 'All', icon: '📋' },
      { id: 'repairs', label: 'Repairs', icon: '🔧' },
      { id: 'maintenance', label: 'Maintenance', icon: '🔨' },
      { id: 'inspections', label: 'Inspections', icon: '🔍' },
      { id: 'items', label: 'Items', icon: '📦' }
    ];
  }
  
  render() {
    const activeTab = appState.getState().activeTab;
    
    if (isMobile()) {
      return this.renderMobileDropdown(activeTab);
    } else {
      return this.renderDesktopTabs(activeTab);
    }
  }
  
  renderDesktopTabs(activeTab) {
    const tabsHtml = this.tabs.map(tab => `
      <button 
        class="tab-button ${tab.id === activeTab ? 'active' : ''}" 
        data-tab="${tab.id}"
      >
        <span class="tab-icon">${tab.icon}</span>
        <span class="tab-label">${tab.label}</span>
        ${this.getTabCount(tab.id)}
      </button>
    `).join('');
    
    return `
      <div class="tabs-container">
        ${tabsHtml}
      </div>
    `;
  }
  
  renderMobileDropdown(activeTab) {
    const options = this.tabs.map(tab => {
      const count = this.getTabCountValue(tab.id);
      return `
        <option value="${tab.id}" ${tab.id === activeTab ? 'selected' : ''}>
          ${tab.icon} ${tab.label} (${count})
        </option>
      `;
    }).join('');
    
    return `
      <div class="tabs-container">
        <select class="tabs-mobile-select" id="tabs-mobile-select">
          ${options}
        </select>
      </div>
    `;
  }
  
  getTabCount(tabId) {
    const count = this.getTabCountValue(tabId);
    return `<span class="tab-count">${count}</span>`;
  }
  
  getTabCountValue(tabId) {
    const state = appState.getState();
    let count = 0;
    
    switch (tabId) {
      case 'all':
        count = state.filteredRecords.length;
        break;
      case 'repairs':
        count = state.filteredRecords.filter(r => r.record_type === 'repair').length;
        break;
      case 'maintenance':
        count = state.filteredRecords.filter(r => r.record_type === 'maintenance').length;
        break;
      case 'inspections':
        count = state.filteredRecords.filter(r => r.record_type === 'inspection').length;
        break;
      case 'items':
        const itemIds = new Set(state.filteredRecords.map(r => r.item_id));
        count = itemIds.size;
        break;
    }
    
    return count;
  }
  
  attachEventListeners(container) {
    if (isMobile()) {
      this.attachMobileListeners(container);
    } else {
      this.attachDesktopListeners(container);
    }
  }
  
  attachDesktopListeners(container) {
    const buttons = container.querySelectorAll('.tab-button');
    
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        appState.setActiveTab(tabId);
        
        if (this.onTabChange) {
          this.onTabChange(tabId);
        }
      });
    });
  }
  
  attachMobileListeners(container) {
    const select = container.querySelector('#tabs-mobile-select');
    
    if (select) {
      select.addEventListener('change', (e) => {
        const tabId = e.target.value;
        appState.setActiveTab(tabId);
        
        if (this.onTabChange) {
          this.onTabChange(tabId);
        }
      });
    }
  }
}