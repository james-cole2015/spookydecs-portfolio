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