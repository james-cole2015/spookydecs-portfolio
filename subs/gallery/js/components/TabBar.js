/**
 * TabBar Component
 * 
 * Photo type tabs for filtering images
 * Updates URL state on tab change
 */

import { PHOTO_TYPES, PHOTO_TYPE_LABELS, PHOTO_TYPE_ICONS } from '../utils/images-config.js';
import { getCurrentTab, updateCurrentTab } from '../utils/state.js';

/**
 * Render the tab bar
 * @param {HTMLElement} container - Container element
 * @param {Function} onTabChange - Callback when tab changes
 */
export function renderTabBar(container, onTabChange) {
  const currentTab = getCurrentTab();
  
  const tabsHTML = Object.values(PHOTO_TYPES).map(photoType => {
    const isActive = currentTab === photoType;
    const icon = PHOTO_TYPE_ICONS[photoType];
    const label = PHOTO_TYPE_LABELS[photoType];
    
    return `
      <button 
        class="tab-button ${isActive ? 'active' : ''}" 
        data-photo-type="${photoType}"
        aria-selected="${isActive}"
        role="tab"
      >
        <span class="tab-icon">${icon}</span>
        <span class="tab-label">${label}</span>
      </button>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="tab-bar" role="tablist">
      ${tabsHTML}
    </div>
  `;
  
  // Attach event listeners
  const tabButtons = container.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const photoType = button.dataset.photoType;
      
      // Update active state
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update URL state
      updateCurrentTab(photoType);
      
      // Trigger callback
      if (onTabChange) {
        onTabChange(photoType);
      }
    });
  });
}

/**
 * Get active tab
 * @param {HTMLElement} container - Container element
 * @returns {string|null} Active photo type
 */
export function getActiveTab(container) {
  const activeButton = container.querySelector('.tab-button.active');
  return activeButton ? activeButton.dataset.photoType : null;
}

/**
 * Set active tab programmatically
 * @param {HTMLElement} container - Container element
 * @param {string} photoType - Photo type to activate
 */
export function setActiveTab(container, photoType) {
  const buttons = container.querySelectorAll('.tab-button');
  buttons.forEach(button => {
    if (button.dataset.photoType === photoType) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}
