/**
 * Gallery API Client
 *
 * Public API for fetching gallery photos
 */

export class GalleryAPI {

  async getEndpoint() {
    const { API_ENDPOINT } = await window.SpookyConfig.get();
    return API_ENDPOINT;
  }

  async getPhotos(section, filters = {}) {
    const baseUrl = await this.getEndpoint();
    const params = new URLSearchParams({ section });

    if (filters.season) params.append('season', filters.season);
    if (filters.year) params.append('year', filters.year);

    const url = `${baseUrl}/gallery/images?${params.toString()}`;

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
    return data.data || [];
  }

  async getPhoto(photoId) {
    const baseUrl = await this.getEndpoint();
    const url = `${baseUrl}/gallery/images/${photoId}`;
    console.log('Fetching photo:', url);

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch photo');
    }

    const data = await response.json();
    return data.data || null;
  }

  async getFeaturedPhotos(section = 'showcase') {
    const photos = await this.getPhotos(section);
    return photos.filter(p => p.is_featured);
  }
}

// Singleton instance
export const galleryAPI = new GalleryAPI();