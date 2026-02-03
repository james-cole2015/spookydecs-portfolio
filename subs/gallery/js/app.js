/**
 * Gallery App
 * 
 * Main application entry point
 * Handles routing and section navigation
 */

import { router } from './utils/router.js';
import { state } from './utils/state.js';
import { SectionTabs } from './components/SectionTabs.js';
import { renderShowcase } from './pages/showcase.js';
import { renderProgress } from './pages/progress.js';
import { renderCommunity } from './pages/community.js';

// Initialize app
async function init() {
  console.log('Initializing Gallery App...');

  // Initialize section tabs
  const tabsContainer = document.getElementById('section-tabs');
  const sectionTabs = new SectionTabs(tabsContainer);
  
  const currentSection = getCurrentSection();
  sectionTabs.init(currentSection, handleSectionChange);

  // Setup routes
  router.on('/', () => {
    //console.log('Route: /');
    sectionTabs.setActiveTab('showcase');
    renderShowcase();
  });

  router.on('/showcase', () => {
    //console.log('Route: /showcase');
    sectionTabs.setActiveTab('showcase');
    renderShowcase();
  });

  router.on('/progress', () => {
    //console.log('Route: /progress');
    sectionTabs.setActiveTab('progress');
    renderProgress();
  });

  router.on('/community', () => {
    //console.log('Route: /community');
    sectionTabs.setActiveTab('community');
    renderCommunity();
  });

  router.notFound(() => {
    //console.log('Route: Not found, redirecting to /');
    router.navigate('/');
  });

  // Resolve initial route
  router.resolve();
}

/**
 * Get current section from URL
 */
function getCurrentSection() {
  const path = window.location.pathname;
  if (path.includes('/progress')) return 'progress';
  if (path.includes('/community')) return 'community';
  return 'showcase';
}

/**
 * Handle section tab change
 */
function handleSectionChange(section) {
  //console.log('Section changed:', section);
  
  // Clear filters when changing sections
  state.clear();
  
  // Navigate to section
  router.navigate(`/${section}`);
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
