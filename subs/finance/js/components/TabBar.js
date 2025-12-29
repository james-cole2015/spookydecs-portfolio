// Tab Bar Component

import { stateManager } from '../utils/state.js';

export class TabBar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.tabs = [
      { id: 'records', label: 'Cost Records' },
      { id: 'stats', label: 'Statistics' }
    ];
    this.activeTab = 'records';
    this.render();
    this.attachListeners();
  }

  render() {
    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';

    this.tabs.forEach(tab => {
      const button = document.createElement('button');
      button.className = `tab-btn ${tab.id === this.activeTab ? 'active' : ''}`;
      button.dataset.tab = tab.id;
      button.textContent = tab.label;
      tabBar.appendChild(button);
    });

    this.container.innerHTML = '';
    this.container.appendChild(tabBar);
  }

  attachListeners() {
    this.container.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-btn')) {
        const tabId = e.target.dataset.tab;
        this.switchTab(tabId);
      }
    });

    // Subscribe to state changes
    stateManager.subscribe((state) => {
      if (state.tab !== this.activeTab) {
        this.activeTab = state.tab;
        this.updateActiveTab();
      }
    });
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    this.updateActiveTab();
    this.showTabPanel(tabId);
    stateManager.setState({ tab: tabId });
  }

  updateActiveTab() {
    const buttons = this.container.querySelectorAll('.tab-btn');
    buttons.forEach(btn => {
      if (btn.dataset.tab === this.activeTab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  showTabPanel(tabId) {
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
      if (panel.id === `${tabId}-tab`) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }
}
