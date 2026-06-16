/**
 * SectionView — shared page body for the three gallery sections.
 *
 * Fetches `GET /gallery/images?section=…&season=…&year=…&tags=…`, with filters
 * read from / written to the URL via useSearchParams. Showcase additionally
 * renders the featured HeroCarousel. Progress/Community show a section heading.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LoadingState, ErrorState } from '@spookydecs/ui';
import { getPhotos } from '../api/galleryApi';
import type { GalleryPhoto, Section } from '../config/galleryConfig';
import { FilterBar, readFilters } from './FilterBar';
import { HeroCarousel } from './HeroCarousel';
import { PhotoGrid } from './PhotoGrid';

interface Props {
  section: Section;
  /** Showcase shows the featured hero carousel; the others don't. */
  showCarousel?: boolean;
  heading?: { title: string; subtitle?: string };
}

export function SectionView({ section, showCarousel = false, heading }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);

  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable dependency for the fetch effect.
  const filterKey = useMemo(
    () => `${filters.season ?? ''}|${filters.year ?? ''}|${filters.tags ?? ''}`,
    [filters.season, filters.year, filters.tags],
  );

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await getPhotos(section, filters);
      setPhotos(result);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load photos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, filterKey]);

  function updateFilters(next: ReturnType<typeof readFilters>) {
    const params = new URLSearchParams();
    if (next.season) params.set('season', next.season);
    if (next.year) params.set('year', next.year);
    if (next.tags) params.set('tags', next.tags);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-12">
      {showCarousel && !loading && !error && <HeroCarousel photos={photos} />}

      {heading && (
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-foreground">{heading.title}</h1>
          {heading.subtitle && <p className="text-default-500">{heading.subtitle}</p>}
        </div>
      )}

      <FilterBar filters={filters} onChange={updateFilters} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <PhotoGrid photos={photos} />
      )}
    </div>
  );
}
