/**
 * Gallery API Client
 * 
 * Public API for fetching gallery photos
 */

export class GalleryAPI {
  constructor() {
    this.baseUrl = null;
    this.config = null;
  }

  /**
   * Initialize API with config
   */
  async init() {
    if (this.config) return;

    try {
      const response = await fetch('/config.json');
      this.config = await response.json();
      this.baseUrl = this.config.API_ENDPOINT;
      //console.log('Gallery API initialized:', this.baseUrl);
    } catch (error) {
      console.error('Failed to load config:', error);
      throw new Error('Failed to initialize API');
    }
  }

  /**
   * Fetch photos by section
   * 
   * @param {string} section - 'showcase' | 'progress' | 'community'
   * @param {object} filters - { season, year }
   */
  async getPhotos(section, filters = {}) {
    await this.init();

    const params = new URLSearchParams({ section });

    if (filters.season) {
      params.append('season', filters.season);
    }

    if (filters.year) {
      params.append('year', filters.year);
    }

    const url = `${this.baseUrl}/gallery/images?${params.toString()}`;
    //console.log('Fetching photos:', url);

    try {
      const response = await fetch(url);
      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || 'Failed to fetch photos');
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }

      const data = await response.json();
      //console.log('API response:', data);
      
      return data.data || [];
    } catch (error) {
      console.error('Fetch error:', error);
      throw error;
    }
  }

  /**
   * Fetch single photo by ID
   */
  async getPhoto(photoId) {
    await this.init();

    const url = `${this.baseUrl}/gallery/images/${photoId}`;
    console.log('Fetching photo:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch photo');
    }

    const data = await response.json();
    return data.data || null;
  }

  /**
   * Get featured photos (client-side filter)
   */
  async getFeaturedPhotos(section = 'showcase') {
    const photos = await this.getPhotos(section);
    return photos.filter(p => p.is_featured);
  }
}

// Singleton instance
export const galleryAPI = new GalleryAPI();