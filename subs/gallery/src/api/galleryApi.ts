/**
 * Gallery API client — typed port of js/utils/gallery-api.js (#337).
 *
 * Public read API: `GET /gallery/images` requires no auth. The fetch + query
 * param logic (section/season/year/tags) is preserved verbatim. `tags` is a
 * comma-separated string and the backend applies any-match (OR) semantics.
 *
 * Framework-agnostic: reads window.SpookyConfig directly (cached after first get).
 */
import type { GalleryFilters, GalleryPhoto, Section } from '../config/galleryConfig';

async function getEndpoint(): Promise<string> {
  const { API_ENDPOINT } = await window.SpookyConfig.get();
  return API_ENDPOINT;
}

/** Fetch the photos for a section, optionally filtered by season/year/tags. */
export async function getPhotos(
  section: Section,
  filters: Partial<GalleryFilters> = {},
): Promise<GalleryPhoto[]> {
  const baseUrl = await getEndpoint();
  const params = new URLSearchParams({ section });

  if (filters.season) params.append('season', filters.season);
  if (filters.year) params.append('year', filters.year);
  if (filters.tags) params.append('tags', filters.tags);

  const url = `${baseUrl}/gallery/images?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    try {
      const error = JSON.parse(errorText);
      throw new Error(error.error || 'Failed to fetch photos');
    } catch {
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
  }

  const data = await response.json();
  return (data.data as GalleryPhoto[]) || [];
}

/** Fetch a single photo's metadata. */
export async function getPhoto(photoId: string): Promise<GalleryPhoto | null> {
  const baseUrl = await getEndpoint();
  const response = await fetch(`${baseUrl}/gallery/images/${photoId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch photo' }));
    throw new Error(error.error || 'Failed to fetch photo');
  }

  const data = await response.json();
  return (data.data as GalleryPhoto) || null;
}
