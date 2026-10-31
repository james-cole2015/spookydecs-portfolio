/**
 * Season/year grouping for the gallery grid (#690).
 *
 * The API returns photos newest-upload-first. The grid breaks them into
 * season + year groups ordered like the calendar, newest period first
 * (Christmas 2026 → Halloween 2026 → Christmas 2025 → Halloween 2025 …), and
 * keeps the API's newest-first order inside each group (stable sort).
 *
 * `season` here is the lowercase photo-service key (halloween/christmas/shared),
 * not the Capitalized chip casing.
 */
import { getSeasonEmoji, getSeasonLabel, type GalleryPhoto } from '../config/galleryConfig';

/** Within a year, later in the calendar sorts first (Christmas after Halloween). */
const SEASON_RANK: Record<string, number> = { christmas: 2, halloween: 1 };

export interface PhotoGroup {
  key: string;
  label: string;
  emoji: string;
  /** Sort keys; year 0 / rank 0 mean "undated" / "all seasons" and sort last. */
  year: number;
  rank: number;
}

/** A photo's year: its own `year`, else the year it was uploaded, else 0. */
function photoYear(photo: GalleryPhoto): number {
  const y = parseInt(String(photo.year ?? ''), 10);
  if (y) return y;
  const uploaded = photo.created_at ? new Date(photo.created_at).getUTCFullYear() : 0;
  return uploaded || 0;
}

export function groupOf(photo: GalleryPhoto): PhotoGroup {
  const season = (photo.season ?? '').toLowerCase();
  const year = photoYear(photo);
  const rank = SEASON_RANK[season] ?? 0;
  const label = season ? getSeasonLabel(season) : 'Other';
  return {
    key: `${season || 'other'}-${year || 'undated'}`,
    label: year ? `${label} ${year}` : label,
    emoji: season ? getSeasonEmoji(season) : '🖼️',
    year,
    rank,
  };
}

/** Order photos by season/year group (newest period first); stable within a group. */
export function sortIntoGroups(photos: GalleryPhoto[]): GalleryPhoto[] {
  return photos
    .map((photo, i) => ({ photo, i, g: groupOf(photo) }))
    .sort((a, b) => b.g.year - a.g.year || b.g.rank - a.g.rank || a.g.key.localeCompare(b.g.key) || a.i - b.i)
    .map((x) => x.photo);
}
