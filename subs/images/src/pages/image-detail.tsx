/**
 * Image detail page — typed HeroUI port of js/pages/image-detail.js (#336).
 * Loads the photo + resolves external URLs (finance/maintenance) via useConfig,
 * builds the breadcrumb from the `from` context, and renders ImageDetail in
 * view or edit mode (editMode is set by the route in App.tsx).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { Breadcrumbs, LoadingState, ErrorState, useConfig, type Crumb } from '@spookydecs/ui';
import { fetchImage } from '../api/imagesApi';
import type { Photo } from '../config/imagesConfig';
import { ImageDetail } from '../components/ImageDetail';

const PARENT_CRUMBS: Record<string, Crumb> = {
  gallery: { label: 'Gallery Manager', to: '/images/gallery' },
  entity: { label: 'Entities', to: '/images/entities' },
};

export default function ImageDetailPage({ editMode = false }: { editMode?: boolean }) {
  const { photoId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const config = useConfig() as Record<string, string>;

  const from = searchParams.get('from') || '';
  const parent = PARENT_CRUMBS[from] ?? { label: 'Image Admin', to: '/images/list' };

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchImage(photoId)
      .then((p) => {
        if (!cancelled) setPhoto(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? 'Image not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [photoId]);

  if (loading) return <LoadingState label="Loading image…" />;

  if (error || !photo) {
    return (
      <div>
        <ErrorState message={error || 'Image not found'} />
        <div className="flex justify-center">
          <Button variant="flat" onPress={() => navigate(parent.to as string)}>
            Back to Images
          </Button>
        </div>
      </div>
    );
  }

  const crumbs: Crumb[] = [
    { label: 'Images', to: '/images' },
    parent,
    ...(editMode
      ? [
          { label: photo.photo_id, to: `/images/${photo.photo_id}${from ? `?from=${from}` : ''}` },
          { label: 'Edit' },
        ]
      : [{ label: photo.photo_id }]),
  ];

  return (
    <div>
      <Breadcrumbs crumbs={crumbs} />
      <ImageDetail
        photo={photo}
        editMode={editMode}
        financeUrl={config.finance_url || ''}
        maintUrl={config.MAINT_URL || ''}
        from={from}
      />
    </div>
  );
}
