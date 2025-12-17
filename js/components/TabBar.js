// TabBar Component
// Handles tab navigation for items list

import { TABS } from '../utils/item-config.js';

export class TabBar {
  constructor(containerId, onTabChange) {
    this.container = document.getElementById(containerId);
    this.onTabChange = onTabChange;
    this.activeTab = 'decorations';
  }
  
  render(activeTab) {
    this.activeTab = activeTab;
    
    if (!this.container) {
      console.error('TabBar container not found');
      return;
    }
    
    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    
    TABS.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.className = `tab-button ${tab.id === activeTab ? 'active' : ''}`;
      tabButton.textContent = tab.label;
      tabButton.dataset.tabId = tab.id;
      
      tabButton.addEventListener('click', () => {
        this.handleTabClick(tab.id);
      });
      
      tabBar.appendChild(tabButton);
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(tabBar);
  }
  
  handleTabClick(tabId) {
    if (tabId === this.activeTab) return;
    
    this.activeTab = tabId;
    
    // Update active state
    this.container.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabId === tabId);
    });
    
    // Notify parent
    if (this.onTabChange) {
      this.onTabChange(tabId);
    }
  }
  
  setActiveTab(tabId) {
    this.activeTab = tabId;
    this.container.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabId === tabId);
    });
  }
}
