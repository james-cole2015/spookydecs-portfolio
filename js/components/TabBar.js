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
    
    // Desktop tabs
    const desktopTabs = document.createElement('div');
    desktopTabs.className = 'tab-bar-desktop';
    
    TABS.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.className = `tab-button ${tab.id === activeTab ? 'active' : ''}`;
      // Add icon to label
      tabButton.textContent = `${tab.icon} ${tab.label}`;
      tabButton.dataset.tabId = tab.id;
      
      tabButton.addEventListener('click', () => {
        this.handleTabClick(tab.id);
      });
      
      desktopTabs.appendChild(tabButton);
    });
    
    // Mobile dropdown
    const mobileDropdown = document.createElement('div');
    mobileDropdown.className = 'tab-bar-mobile';
    
    const select = document.createElement('select');
    select.className = 'tab-select';
    select.value = activeTab;
    
    TABS.forEach(tab => {
      const option = document.createElement('option');
      option.value = tab.id;
      // Add icon to mobile dropdown too
      option.textContent = `${tab.icon} ${tab.label}`;
      if (tab.id === activeTab) option.selected = true;
      select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
      this.handleTabClick(e.target.value);
    });
    
    mobileDropdown.appendChild(select);
    
    tabBar.appendChild(desktopTabs);
    tabBar.appendChild(mobileDropdown);
    
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
    
    // Update desktop tabs
    this.container.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tabId === tabId);
    });
    
    // Update mobile dropdown
    const select = this.container.querySelector('.tab-select');
    if (select) {
      select.value = tabId;
    }
  }
}