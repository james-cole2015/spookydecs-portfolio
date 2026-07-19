/**
 * Entity detail — typed HeroUI port of js/pages/entity-detail.js (#336).
 * All photos for a single item/storage/idea entity: metadata header, photo-type
 * tabs, and a grid with per-photo "View Record" + "Set Primary". The full-screen
 * viewer is the shared @spookydecs/ui PhotoLightbox (#376).
 *
 * NOTE (deviation from 336-plan): the plan suggested the shared PhotoGallery here,
 * but PhotoGallery has no photo-type tabs or "View Record" navigation, so using it
 * would drop those features. PhotoGallery is optional per check_sub_migration.py
 * (not a required capability), so this page keeps full parity with PhotoLightbox +
 * the setPrimaryPhoto API instead.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Chip } from '@heroui/react';
import {
  Breadcrumbs,
  LoadingState,
  EmptyState,
  PhotoLightbox,
  SeasonChip,
  useToast,
  type LightboxPhoto,
} from '@spookydecs/ui';
import { fetchImages, fetchIdeas, setPrimaryPhoto } from '../api/imagesApi';
import { canonicalSeason, type Photo } from '../config/imagesConfig';

type EntityType = 'item' | 'storage' | 'idea';

const PHOTO_TYPE_LABELS: Record<string, string> = {
  catalog: 'Catalog',
  deployment: 'Deployment',
  repair: 'Maintenance',
  build: 'Build',
  storage: 'Storage',
  inspection: 'Inspection',
  inspiration: 'Inspiration',
};

async function loadPhotos(entityId: string, type: EntityType): Promise<Photo[]> {
  try {
    const filter =
      type === 'storage'
        ? { storage_id: entityId }
        : type === 'idea'
          ? { idea_id: entityId }
          : { item_id: entityId };
    return await fetchImages(filter);
  } catch {
    return [];
  }
}

export default function EntityDetail() {
  const { id: entityId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [entityType, setEntityType] = useState<EntityType>(
    (searchParams.get('type') as EntityType) || 'item',
  );
  const [entityTitle, setEntityTitle] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let type = (searchParams.get('type') as EntityType) || 'item';
    let result = await loadPhotos(entityId, type);
    if (result.length === 0 && type === 'item') {
      const storage = await loadPhotos(entityId, 'storage');
      if (storage.length > 0) {
        result = storage;
        type = 'storage';
      }
    }
    if (result.length === 0 && type !== 'idea') {
      const idea = await loadPhotos(entityId, 'idea');
      if (idea.length > 0) {
        result = idea;
        type = 'idea';
      }
    }
    setEntityType(type);
    setPhotos(result);

    if (type === 'idea' && result.length > 0) {
      try {
        const ideas = await fetchIdeas();
        const idea = ideas.find((i: any) => i.id === entityId);
        setEntityTitle(idea?.title ?? null);
      } catch {
        setEntityTitle(null);
      }
    } else {
      setEntityTitle(null);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSetPrimary(photo: Photo) {
    setSettingPrimaryId(photo.photo_id);
    try {
      const payload: Record<string, unknown> = {
        photo_id: photo.photo_id,
        context: entityType,
        ...(entityType === 'storage'
          ? { storage_id: entityId }
          : entityType === 'idea'
            ? { idea_id: entityId }
            : { item_id: entityId }),
      };
      await setPrimaryPhoto(payload);
      toast.showSuccess('Primary photo updated');
      await load();
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to set primary');
    } finally {
      setSettingPrimaryId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <Breadcrumbs
          crumbs={[
            { label: 'Images', to: '/images' },
            { label: 'Entities', to: '/images/entities' },
            { label: entityId },
          ]}
        />
        <LoadingState label="Loading entity…" />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div>
        <Breadcrumbs
          crumbs={[
            { label: 'Images', to: '/images' },
            { label: 'Entities', to: '/images/entities' },
            { label: entityId },
          ]}
        />
        <EmptyState icon="🖼️" title="No photos" message={`No photos found for ${entityId}.`} />
        <div className="flex justify-center">
          <Button variant="flat" onPress={() => navigate('/images/entities')}>
            Back to Entities
          </Button>
        </div>
      </div>
    );
  }

  const seasons = [...new Set(photos.map((p) => p.season?.toLowerCase()).filter(Boolean))] as string[];
  const publicCount = photos.filter((p) => p.is_public).length;
  const itemClass = photos.find((p) => p.item_class)?.item_class;
  const photoTypes = [...new Set(photos.map((p) => p.photo_type).filter(Boolean))] as string[];
  const typeLabel = entityType === 'storage' ? 'Storage' : entityType === 'idea' ? 'Idea' : 'Item';

  const tabs: { type: string | null; label: string; count: number }[] = [
    { type: null, label: 'All', count: photos.length },
    ...photoTypes.map((pt) => ({
      type: pt,
      label: PHOTO_TYPE_LABELS[pt] || pt,
      count: photos.filter((p) => p.photo_type === pt).length,
    })),
  ];

  const filtered = activeType ? photos.filter((p) => p.photo_type === activeType) : photos;

  const stats = [
    `${photos.length} photo${photos.length === 1 ? '' : 's'}`,
    publicCount > 0 ? `${publicCount} public` : null,
    seasons.length > 0 ? seasons.join(' / ') : null,
  ].filter(Boolean);

  const lightboxPhotos: LightboxPhoto[] = filtered.map((p) => ({
    key: p.photo_id,
    url: p.cloudfront_url,
    thumbUrl: p.thumb_cloudfront_url || p.cloudfront_url,
    alt: p.photo_id,
    caption: p.caption,
  }));

  return (
    <div>
      <Breadcrumbs
        crumbs={[
          { label: 'Images', to: '/images' },
          { label: 'Entities', to: '/images/entities' },
          { label: entityTitle || entityId },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{entityTitle || entityId}</h1>
        {entityTitle && <div className="text-small text-default-500">{entityId}</div>}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Chip size="sm" variant="flat">
            {typeLabel}
          </Chip>
          {itemClass && (
            <Chip size="sm" variant="flat" color="primary">
              {itemClass}
            </Chip>
          )}
          {seasons.map((s) => (
            <SeasonChip key={s} size="sm" variant="flat" value={canonicalSeason(s)} />
          ))}
        </div>
        <div className="mt-1 text-small text-default-500">{stats.join(' · ')}</div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.type ?? 'all'}
            size="sm"
            variant={activeType === tab.type ? 'solid' : 'flat'}
            color={activeType === tab.type ? 'secondary' : 'default'}
            onPress={() => setActiveType(tab.type)}
          >
            {tab.label} ({tab.count})
          </Button>
        ))}
      </div>

      <PhotoLightbox
        photos={lightboxPhotos}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        renderThumbnail={({ index, ref, open }) => {
          const photo = filtered[index];
          const uploadDate = photo.upload_date ? photo.upload_date.slice(0, 10) : '';
          const ptLabel = PHOTO_TYPE_LABELS[photo.photo_type || ''] || photo.photo_type || '';
          return (
            <div className="flex flex-col overflow-hidden rounded-medium bg-content1 shadow-sm">
              <div
                ref={ref as React.Ref<HTMLDivElement>}
                onClick={open}
                className="relative aspect-square cursor-zoom-in overflow-hidden bg-content2"
              >
                <img
                  src={photo.thumb_cloudfront_url || photo.cloudfront_url}
                  alt={photo.photo_id}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {photo.is_primary && (
                  <Chip size="sm" color="primary" variant="solid" className="absolute left-2 top-2">
                    Primary
                  </Chip>
                )}
              </div>
              <div className="flex flex-col gap-2 p-2">
                <div className="truncate font-mono text-tiny text-default-500">{photo.photo_id}</div>
                <div className="flex flex-wrap items-center gap-1">
                  {ptLabel && (
                    <Chip size="sm" variant="flat">
                      {ptLabel}
                    </Chip>
                  )}
                  <SeasonChip size="sm" variant="flat" value={canonicalSeason(photo.season)} label={canonicalSeason(photo.season)} />
                  {photo.is_public && (
                    <Chip size="sm" variant="flat" color="success">
                      Public
                    </Chip>
                  )}
                </div>
                {uploadDate && <div className="text-tiny text-default-400">{uploadDate}</div>}
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => navigate(`/images/${photo.photo_id}?from=entity`)}
                  >
                    View Record
                  </Button>
                  {!photo.is_primary && (
                    <Button
                      size="sm"
                      color="secondary"
                      variant="flat"
                      isLoading={settingPrimaryId === photo.photo_id}
                      onPress={() => handleSetPrimary(photo)}
                    >
                      Set Primary
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
