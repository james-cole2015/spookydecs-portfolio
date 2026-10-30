import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Chip, Tab, Tabs } from '@heroui/react';
import {
  Breadcrumbs,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PhotoLightbox,
  useAuth,
} from '@spookydecs/ui';
import { fetchImageById } from '../api/deploymentsApi';
import { ITEM_CLASS_BUCKETS, ZONE_LABELS } from '../config/deploymentsConfig';
import { bucketCounts, deriveItemList, filterItems, type ItemRow } from '../lib/itemList';
import { EDITABLE_STATUSES, loadGraph, type LoadedGraph } from '../lib/loadGraph';
import { useAddItemPhoto } from '../lib/useAddItemPhoto';
import { StatusChip } from '../components/StatusChip';

interface ItemPhoto {
  /** Original image (what the lightbox shows). */
  url: string;
  thumbUrl?: string;
  key: string;
  /** Nominal full-size dimensions with the image's true aspect ratio (see probeRatio). */
  width: number;
  height: number;
}

const NOMINAL_LONG_SIDE = 2400;

/**
 * The lightbox sizes its slide from width/height, and the image records don't store them.
 * Thumbnails share the original's aspect ratio, so probe the small thumbnail and scale to a
 * nominal size instead of downloading the multi-MB original just to measure it.
 */
function probeRatio(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = NOMINAL_LONG_SIDE / Math.max(w, h);
      resolve({ width: Math.round(w * scale), height: Math.round(h * scale) });
    };
    img.onerror = () => resolve({ width: NOMINAL_LONG_SIDE, height: NOMINAL_LONG_SIDE });
    img.src = src;
  });
}

/** Resolves an item's photo ids to lightbox photos with probed aspect ratios. */
function useItemPhotos(photoIds: string[]): ItemPhoto[] {
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const key = photoIds.join(',');
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      photoIds.map(async (pid) => {
        const img: any = await fetchImageById(pid);
        if (!img?.cloudfront_url) return null;
        const thumbUrl = img.thumb_cloudfront_url || img.cloudfront_url;
        return {
          url: img.cloudfront_url,
          thumbUrl,
          key: img.photo_id || img.cloudfront_url,
          ...(await probeRatio(thumbUrl)),
        } as ItemPhoto;
      }),
    ).then((list) => {
      if (!cancelled) setPhotos(list.filter((p): p is ItemPhoto => !!p));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return photos;
}

/**
 * Photo-led tile (#689): the cover photo fills the tile, with the name on a bottom scrim. An item
 * with no photo gets a dashed placeholder so coverage gaps stand out at a glance.
 */
function ItemCard({ row, canAdd, onAdd }: { row: ItemRow; canAdd: boolean; onAdd: (id: string) => void }) {
  const photos = useItemPhotos(row.photoIds);
  const hasPhotos = row.photoIds.length > 0;
  return (
    <div
      data-testid={`item-row-${row.id}`}
      className={`relative aspect-[4/3] overflow-hidden rounded-large ${
        hasPhotos ? 'bg-default-100' : 'border-2 border-dashed border-default-300 bg-default-50'
      }`}
    >
      {photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          renderThumbnail={({ photo, index, ref, open }) =>
            index === 0 ? (
              <img
                ref={ref as React.Ref<HTMLImageElement>}
                onClick={open}
                src={photo.thumbUrl ?? photo.url}
                alt={row.name}
                loading="lazy"
                className="absolute inset-0 h-full w-full cursor-zoom-in object-cover"
              />
            ) : (
              // Later photos only exist so the lightbox can page through them.
              <img ref={ref as React.Ref<HTMLImageElement>} src={photo.thumbUrl ?? photo.url} alt="" className="hidden" />
            )
          }
        />
      )}

      {!hasPhotos && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pb-10 text-default-400">
          <span className="text-sm">No photos</span>
          {canAdd && (
            <Button size="sm" color="primary" variant="flat" onPress={() => onAdd(row.id)} data-testid={`add-photo-${row.id}`}>
              Add photo
            </Button>
          )}
        </div>
      )}

      {hasPhotos && (
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {row.photoIds.length > 1 && (
            <Chip size="sm" variant="solid" color="default" className="bg-black/60 text-white">
              +{row.photoIds.length - 1}
            </Chip>
          )}
          {canAdd && (
            <Button
              isIconOnly
              size="sm"
              variant="solid"
              className="bg-black/60 text-white"
              aria-label={`Add photo to ${row.name}`}
              onPress={() => onAdd(row.id)}
              data-testid={`add-photo-${row.id}`}
            >
              +
            </Button>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8">
        <div className="truncate text-sm font-medium text-white">{row.name}</div>
        <div className="truncate text-xs text-white/75">
          {row.classType || 'Unknown class'} · {ZONE_LABELS[row.zone] || row.zone || 'No zone'}
        </div>
      </div>
    </div>
  );
}

/**
 * /builder/:id/items — every item in the deployment with its photo coverage (#689). Editable
 * (Add photo) while the deployment is being set up; once completed/archived it is a read-only
 * record rendered from the frozen graph_snapshot.
 */
export default function ItemsPhotosPage() {
  const { id } = useParams();
  const deploymentId = id!;
  const navigate = useNavigate();
  const auth = useAuth();
  const [params, setParams] = useSearchParams();

  const [loaded, setLoaded] = useState<LoadedGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoaded(await loadGraph(deploymentId, { preferSnapshot: true }));
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load deployment items');
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  useEffect(() => {
    load();
  }, [load]);

  const { addPhoto, editor } = useAddItemPhoto({
    deploymentId,
    input: loaded?.input,
    season: loaded?.season,
    year: loaded?.year,
    onAdded: load,
  });

  const rows = useMemo(
    () => (loaded ? deriveItemList(loaded.input, { applyStatusFilter: loaded.mode === 'live' }) : []),
    [loaded],
  );

  const zoneParam = params.get('zone') || 'ALL';
  const zone = zoneParam === 'ALL' || ITEM_ZONES.includes(zoneParam) ? zoneParam : 'ALL';
  const classParam = params.get('class');
  const bucket = ITEM_CLASS_BUCKETS.some((b) => b.key === classParam) ? classParam : null;

  const setFilter = (key: 'zone' | 'class', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'ALL') next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const counts = useMemo(() => bucketCounts(rows, zone), [rows, zone]);
  const visible = useMemo(() => filterItems(rows, zone, bucket), [rows, zone, bucket]);

  if (loading) return <LoadingState label="Loading items…" />;
  if (error || !loaded) return <ErrorState message={error || 'Deployment not found'} onRetry={() => navigate(`/builder/${deploymentId}`)} />;

  // Two distinct reasons the list can be view-only: the deployment is locked (completed/archived
  // record) or the viewer lacks the builder role. The header says which.
  const locked = !(loaded.mode === 'live' && EDITABLE_STATUSES.includes(loaded.status || ''));
  const canWrite = auth.hasMinRole('builder');
  const editable = !locked && canWrite;
  const withPhotos = rows.filter((r) => r.photoIds.length > 0).length;

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/' },
          { label: deploymentId, to: `/builder/${deploymentId}` },
          { label: 'Items & Photos' },
        ]}
      />
      <PageHeader
        title="Items & Photos"
        subtitle={`${rows.length} item${rows.length === 1 ? '' : 's'} · ${withPhotos} with photos`}
        actions={
          <div className="flex items-center gap-2">
            {loaded.status && <StatusChip status={loaded.status} size="md" />}
            {locked ? (
              <Chip size="sm" variant="flat" color="secondary">
                Read-only record
              </Chip>
            ) : (
              !canWrite && (
                <Chip size="sm" variant="flat" color="warning">
                  View only — builder role required
                </Chip>
              )
            )}
          </div>
        }
      />

      <Tabs aria-label="Zones" selectedKey={zone} onSelectionChange={(k) => setFilter('zone', String(k))} className="mb-3">
        <Tab key="ALL" title="All" />
        {ITEM_ZONES.map((code) => (
          <Tab key={code} title={ZONE_LABELS[code] || code} />
        ))}
      </Tabs>

      <div className="mb-4 flex flex-wrap gap-2" data-testid="class-chips">
        {ITEM_CLASS_BUCKETS.map((b) => (
          <Chip
            key={b.key}
            as="button"
            variant={bucket === b.key ? 'solid' : 'flat'}
            color={bucket === b.key ? 'primary' : 'default'}
            onClick={() => setFilter('class', bucket === b.key ? null : b.key)}
          >
            {b.label} ({counts[b.key] ?? 0})
          </Chip>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No items" message={rows.length ? 'No items match these filters.' : 'No items have been placed or connected in this deployment yet.'} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((row) => (
            <ItemCard key={row.id} row={row} canAdd={editable} onAdd={addPhoto} />
          ))}
        </div>
      )}
      {editor}
    </>
  );
}

const ITEM_ZONES = Object.keys(ZONE_LABELS);
