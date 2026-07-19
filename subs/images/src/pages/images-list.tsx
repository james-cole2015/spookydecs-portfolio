/**
 * Images list — typed HeroUI port of js/pages/images-list.js (#336).
 * Server filters (season/photo_type/year) + client filters (isPublic,
 * hasReferences, search). Filter state lives in the URL via useSearchParams.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, EmptyState } from '@spookydecs/ui';
import { fetchImages } from '../api/imagesApi';
import { isOrphaned, readFilters, writeFilters, type Photo, type ImageUiFilters } from '../config/imagesConfig';
import { ImagesFilters } from '../components/ImagesFilters';
import { ImageCard } from '../components/ImageCard';

function applyClientFilters(images: Photo[], filters: ImageUiFilters): Photo[] {
  let out = images;
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
        img.photo_id.toLowerCase().includes(s) ||
        (img.caption || '').toLowerCase().includes(s),
    );
  }
  return out;
}

export default function ImagesList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);

  const [images, setImages] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side filter key — only the API-backed fields trigger a refetch.
  const serverKey = `${filters.season}|${filters.photo_type}|${filters.year}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchImages({
        season: filters.season,
        photo_type: filters.photo_type,
        year: filters.year,
        limit: 200,
      });
      setImages(result);
    } catch (e: any) {
      setError(e?.message ?? 'Error loading images');
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

  const visible = applyClientFilters(images, filters);

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Images', to: '/images' }, { label: 'Image Admin' }]} />
      <PageHeader
        title="Images"
        actions={
          <>
            <Button variant="flat" onPress={() => navigate('/images/gallery')}>
              🎨 Gallery Manager
            </Button>
            <Button variant="flat" onPress={() => navigate('/images/browse')}>
              Browse Photos
            </Button>
          </>
        }
      />

      <ImagesFilters filters={filters} onChange={onChange} />

      {loading ? (
        <LoadingState label="Loading images…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : visible.length === 0 ? (
        <EmptyState icon="🖼️" title="No images found" message="Try adjusting your filters." />
      ) : (
        <>
          <div className="mb-3 text-small text-default-500">
            {visible.length} image{visible.length === 1 ? '' : 's'} found
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visible.map((photo) => (
              <ImageCard key={photo.photo_id} photo={photo} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
