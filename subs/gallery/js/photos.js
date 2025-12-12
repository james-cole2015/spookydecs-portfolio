/**
 * Photo Loading and Management
 * Handles fetching photos from API and updating state
 */

import { getState, setState, setPhotos } from './state.js';
import { fetchPhotos, fetchStats } from './api.js';

/**
 * Load photos based on current filters and tab
 * @returns {Promise<Array>} Loaded photos
 */
export async function loadPhotos() {
  const state = getState();
  
  // Set loading state
  setState(prevState => ({
    ...prevState,
    loading: true,
    error: null
  }));

  try {
    // Build filter params from state
    const filters = buildFilterParams(state);
    
    console.log('[Photos] Loading photos with filters:', filters);
    
    // Fetch photos from API
    const photos = await fetchPhotos(filters);
    
    console.log(`[Photos] Loaded ${photos.length} photos`);
    
    // Update state with photos and loading flag together
    setState(prevState => ({
      ...prevState,
      photos: [...photos],
      loading: false,
      error: null
    }));
    
    return photos;
    
  } catch (error) {
    console.error('[Photos] Error loading photos:', error);
    
    setState(prevState => ({
      ...prevState,
      loading: false,
      error: error.message
    }));
    
    throw error;
  }
}

/**
 * Force reload photos (clears cache, reloads)
 */
export async function refreshPhotos() {
  console.log('[Photos] Refreshing photos...');
  return await loadPhotos();
}

/**
 * Load statistics
 * @returns {Promise<Object>} Stats object
 */
export async function loadStats() {
  try {
    const state = getState();
    
    // Get photo_type from current tab if applicable
    const photo_type = state.filters.photo_type || 'all';
    
    console.log('[Photos] Loading stats for photo_type:', photo_type);
    
    const stats = await fetchStats(photo_type);
    
    console.log('[Photos] Stats loaded:', stats);
    
    // Update state
    setState(prevState => ({
      ...prevState,
      stats: {
        total: stats.total || 0,
        christmas: stats.christmas_count || 0,
        halloween: stats.halloween_count || 0
      }
    }));
    
    return stats;
    
  } catch (error) {
    console.error('[Photos] Error loading stats:', error);
    throw error;
  }
}

/**
 * Build filter params from state
 * Maps state filters to API query parameters
 * @param {Object} state - Current state
 * @returns {Object} Filter params for API
 */
function buildFilterParams(state) {
  const params = {};
  
  // Map photo_type from filters
  if (state.filters.photo_type && state.filters.photo_type !== 'all') {
    params.photo_type = state.filters.photo_type;
  }
  
  // Map season
  if (state.filters.season && state.filters.season !== 'all') {
    params.season = state.filters.season;
  }
  
  // Map class_type
  if (state.filters.class_type && state.filters.class_type !== 'all') {
    params.class_type = state.filters.class_type;
  }
  
  // Map year
  if (state.filters.year && state.filters.year !== 'all') {
    params.year = state.filters.year;
  }
  
  // Map tags (array)
  if (state.filters.tags && state.filters.tags.length > 0) {
    params.tags = state.filters.tags;
  }
  
  // Search is handled client-side for now
  // API doesn't support search parameter yet
  
  return params;
}

/**
 * Filter photos client-side by search query
 * Used after API returns results
 * @param {Array} photos - Photos to filter
 * @param {string} searchQuery - Search string
 * @returns {Array} Filtered photos
 */
export function filterPhotosBySearch(photos, searchQuery) {
  if (!searchQuery || searchQuery.trim() === '') {
    return photos;
  }
  
  const query = searchQuery.toLowerCase().trim();
  
  return photos.filter(photo => {
    // Search in various fields
    const searchFields = [
      photo.photo_id,
      photo.season,
      photo.photo_type,
      ...(photo.tags || []),
      photo.year?.toString()
    ];
    
    return searchFields.some(field => 
      field && field.toString().toLowerCase().includes(query)
    );
  });
}

/**
 * Load items for the current tab
 * Fetches items or deployments based on tab and caches them
 * @returns {Promise<void>}
 */
export async function loadItemsForTab() {
  const state = getState();
  const currentTab = state.currentTab;
  
  // Only load items for tabs that need them
  if (currentTab !== 'items' && currentTab !== 'deployments') {
    return;
  }
  
  try {
    if (currentTab === 'items') {
      // Fetch items for both seasons if not cached
      const seasons = ['christmas', 'halloween'];
      
      for (const season of seasons) {
        // Skip if already cached
        if (state.items[season] && state.items[season].length > 0) {
          console.log(`[Photos] Items for ${season} already cached`);
          continue;
        }
        
        console.log(`[Photos] Fetching items for season: ${season}`);
        const items = await fetchItems(season);
        setItems(season, items);
        console.log(`[Photos] Cached ${items.length} items for ${season}`);
      }
    } else if (currentTab === 'deployments') {
      // Fetch deployments for both seasons if not cached
      const seasons = ['christmas', 'halloween'];
      
      for (const season of seasons) {
        // Check if deployments cached (stored with 'deployments_' prefix)
        const cacheKey = `deployments_${season}`;
        if (state.items[cacheKey] && state.items[cacheKey].length > 0) {
          console.log(`[Photos] Deployments for ${season} already cached`);
          continue;
        }
        
        console.log(`[Photos] Fetching deployments for season: ${season}`);
        const deployments = await fetchItems(season);
        // Filter to only deployment class_type
        const filteredDeployments = deployments.filter(item => item.class_type === 'Deployment');
        setItems(cacheKey, filteredDeployments);
        console.log(`[Photos] Cached ${filteredDeployments.length} deployments for ${season}`);
      }
    }
  } catch (error) {
    console.error('[Photos] Error loading items for tab:', error);
    // Don't throw - photos can still display without item data
  }
}

/**
 * Enrich photos with item/deployment data
 * Adds _enriched property to each photo with related item data
 * @param {Array} photos - Photos to enrich
 * @param {string} tab - Current tab (items/deployments)
 * @returns {Array} Enriched photos
 */
export function enrichPhotosWithItems(photos, tab) {
  const state = getState();
  
  if (tab !== 'items' && tab !== 'deployments') {
    return photos;
  }
  
  return photos.map(photo => {
    // Clone photo to avoid mutation
    const enrichedPhoto = { ...photo };
    
    if (tab === 'items') {
      // For items tab, expect single item_id
      const itemId = photo.item_ids?.[0];
      if (!itemId) {
        return enrichedPhoto;
      }
      
      // Find item in cache
      let item = null;
      for (const season in state.items) {
        if (season.startsWith('deployments_')) continue;
        const seasonItems = state.items[season] || [];
        item = seasonItems.find(i => i.id === itemId);
        if (item) break;
      }
      
      if (item) {
        enrichedPhoto._enriched = {
          item: {
            id: item.id,
            short_name: item.short_name,
            class_type: item.class_type,
            year: item.year
          }
        };
      }
    } else if (tab === 'deployments') {
      // For deployments tab, expect deployment_id
      const deploymentId = photo.deployment_id;
      if (!deploymentId) {
        return enrichedPhoto;
      }
      
      // Find deployment in cache
      let deployment = null;
      for (const season in state.items) {
        if (!season.startsWith('deployments_')) continue;
        const seasonDeployments = state.items[season] || [];
        deployment = seasonDeployments.find(d => d.id === deploymentId);
        if (deployment) break;
      }
      
      if (deployment) {
        enrichedPhoto._enriched = {
          deployment: {
            id: deployment.id,
            name: deployment.short_name,
            year: deployment.year,
            season: deployment.season
          }
        };
      }
    }
    
    return enrichedPhoto;
  });
}

/**
 * Calculate recent uploads (photos from last 30 days)
 * @param {Array} photos - All photos
 * @returns {number} Count of recent uploads
 */
export function calculateRecentUploads(photos) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  return photos.filter(photo => {
    if (!photo.upload_date) return false;
    
    const uploadDate = new Date(photo.upload_date);
    return uploadDate >= thirtyDaysAgo;
  }).length;
}
