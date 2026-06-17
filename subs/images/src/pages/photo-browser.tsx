/**
 * Photo browser — typed HeroUI port of js/pages/photo-browser.js (#336).
 * Receipts excluded. The custom LightboxGallery is replaced by the shared
 * @spookydecs/ui PhotoLightbox (#376), which preserves keyboard/swipe nav and
 * the ~4 s slideshow via slideshowInterval.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import {
  Breadcrumbs,
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
  PhotoLightbox,
  type LightboxPhoto,
} from '@spookydecs/ui';
import { fetchImages } from '../api/imagesApi';
import { isOrphaned, type Photo } from '../config/imagesConfig';
import { FilterPanel, readFilters, writeFilters, type ImageUiFilters } from '../components/FilterPanel';

function applyClientFilters(photos: Photo[], filters: ImageUiFilters): Photo[] {
  let out = photos.filter((p) => p.photo_type !== 'receipt');
  if (filters.isPublic) {
    const want = filters.isPublic === 'true';
    out = out.filter((img) => !!img.is_public === want);
  }
  if (filters.hasReferences) {
    const hasRefs = filters.hasReferences === 'true';
    out = out.filter((img) => isOrphaned(img) !== hasRefs);
  }
  if (filters.search) {
    const s = filters.search.toLowerCase();
    out = out.filter(
      (img) =>
        img.photo_id.toLowerCase().includes(s) || (img.caption || '').toLowerCase().includes(s),
    );
  }
  return out;
}

function toLightboxPhoto(photo: Photo): LightboxPhoto {
  return {
    key: photo.photo_id,
    url: photo.cloudfront_url,
    thumbUrl: photo.thumb_cloudfront_url || photo.cloudfront_url,
    alt: photo.caption || 'Photo',
    caption: photo.caption,
  };
}

export default function PhotoBrowser() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const serverKey = `${filters.season}|${filters.photo_type}|${filters.year}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchImages({
        season: filters.season,
        photo_type: filters.photo_type,
        year: filters.year,
        limit: 500,
      });
      setPhotos(result);
    } catch (e: any) {
      setError(e?.message ?? 'Error loading photos');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverKey]);

  useEffect(() => {
    void load();
  }, [load]);

  function onChange(next: ImageUiFilters) {
    setSearchParams(writeFilters(next), { replace: true });
  }

  const visible = applyClientFilters(photos, filters);

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Images', to: '/images' }, { label: 'Photo Browser' }]} />
      <PageHeader
        title="Browse Photos"
        actions={
          <Button variant="flat" onPress={() => navigate('/images/list')}>
            Back to Admin
          </Button>
        }
      />

      <FilterPanel filters={filters} onChange={onChange} />

      {loading ? (
        <LoadingState label="Loading photos…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState icon="📷" title="No photos found" message="Try adjusting your filters." />
      ) : (
        <>
          <div className="mb-3 text-small text-default-500">
            {visible.length} photo{visible.length === 1 ? '' : 's'}
          </div>
          <PhotoLightbox
            photos={visible.map(toLightboxPhoto)}
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            slideshowInterval={4000}
            renderThumbnail={({ index, ref, open }) => {
              const photo = visible[index];
              return (
                <div
                  ref={ref as React.Ref<HTMLDivElement>}
                  onClick={open}
                  className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-medium bg-content2"
                >
                  <img
                    src={photo.thumb_cloudfront_url || photo.cloudfront_url}
                    alt={photo.caption || 'Photo'}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <Chip
                    size="sm"
                    variant="solid"
                    color="secondary"
                    className="absolute left-2 top-2"
                  >
                    {(photo.season || 'shared').toUpperCase()}
                  </Chip>
                </div>
              );
            }}
          />
        </>
      )}
    </div>
  );
}
