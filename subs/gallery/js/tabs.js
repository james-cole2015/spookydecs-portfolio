/**
 * Tab Management
 * Handles tab switching and photo_type filtering
 */

import { getState, setCurrentTab, setFilter } from './state.js';
import { loadPhotos } from './photos.js';

// Map tabs to photo_type values
const TAB_TO_PHOTO_TYPE = {
  items: 'item',
  ideas: 'idea',
  build: 'build',
  gallery: 'gallery',
  deployments: 'deployment'
};

/**
 * Initialize tab system
 */
export function initTabs() {
  console.log('[Tabs] Initializing tab system...');
  
  // Get current tab from state
  const state = getState();
  const currentTab = state.currentTab || 'items';
  
  // Set active tab in UI
  setActiveTab(currentTab);
  
  // Initialize desktop tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    button.addEventListener('click', handleTabClick);
  });
  
  // Initialize mobile dropdown
  const tabSelect = document.getElementById('tab-select');
  if (tabSelect) {
    tabSelect.value = currentTab;
    tabSelect.addEventListener('change', handleTabChange);
  }
  
  console.log('[Tabs] Tab system initialized. Current tab:', currentTab);
}

/**
 * Handle desktop tab button click
 * @param {Event} event - Click event
 */
function handleTabClick(event) {
  const tab = event.currentTarget.dataset.tab;
  if (tab) {
    switchTab(tab);
  }
}

/**
 * Handle mobile dropdown change
 * @param {Event} event - Change event
 */
function handleTabChange(event) {
  const tab = event.target.value;
  if (tab) {
    switchTab(tab);
  }
}

/**
 * Switch to a different tab
 * @param {string} tab - Tab name (items, ideas, build, gallery, deployments)
 */
export async function switchTab(tab) {
  console.log('[Tabs] Switching to tab:', tab);
  
  // Update UI
  setActiveTab(tab);
  
  // Update state
  setCurrentTab(tab);
  
  // Map tab to photo_type and update filter
  const photoType = TAB_TO_PHOTO_TYPE[tab] || 'item';
  setFilter('photo_type', photoType);
  
  // Load photos for this tab
  try {
    await loadPhotos();
  } catch (error) {
    console.error('[Tabs] Error loading photos for tab:', error);
  }
}

/**
 * Set active tab in UI (both desktop and mobile)
 * @param {string} tab - Tab name
 */
function setActiveTab(tab) {
  // Update desktop tabs
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(button => {
    if (button.dataset.tab === tab) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
  
  // Update mobile dropdown
  const tabSelect = document.getElementById('tab-select');
  if (tabSelect) {
    tabSelect.value = tab;
  }
}

/**
 * Get current tab
 * @returns {string} Current tab name
 */
export function getCurrentTab() {
  const state = getState();
  return state.currentTab || 'items';
}

/**
 * Get photo_type for current tab
 * @returns {string} Photo type
 */
export function getCurrentPhotoType() {
  const tab = getCurrentTab();
  return TAB_TO_PHOTO_TYPE[tab] || 'item';
}
