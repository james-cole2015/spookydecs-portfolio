import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Chip, Tab, Tabs } from '@heroui/react';
import {
  Breadcrumbs,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PhotoLightbox,
  useAuth,
  type LightboxPhoto,
} from '@spookydecs/ui';
import { fetchImageById } from '../api/deploymentsApi';
import { ITEM_CLASS_BUCKETS, ZONE_LABELS } from '../config/deploymentsConfig';
import { bucketCounts, deriveItemList, filterItems, type ItemRow } from '../lib/itemList';
import { EDITABLE_STATUSES, loadGraph, type LoadedGraph } from '../lib/loadGraph';
import { useAddItemPhoto } from '../lib/useAddItemPhoto';
import { StatusChip } from '../components/StatusChip';

/** Resolves an item's photo ids to lightbox photos (thumbnails open the full-size viewer). */
function useItemPhotos(photoIds: string[]): LightboxPhoto[] {
  const [photos, setPhotos] = useState<LightboxPhoto[]>([]);
  const key = photoIds.join(',');
  useEffect(() => {
    let cancelled = false;
    Promise.all(photoIds.map((pid) => fetchImageById(pid))).then((imgs) => {
      if (cancelled) return;
      setPhotos(
        imgs
          .filter(Boolean)
          .map((img: any) => ({
            url: img.cloudfront_url,
            thumbUrl: img.thumb_cloudfront_url || img.cloudfront_url,
            key: img.photo_id || img.cloudfront_url,
          })),
      );
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return photos;
}

function ItemCard({ row, canAdd, onAdd }: { row: ItemRow; canAdd: boolean; onAdd: (id: string) => void }) {
  const photos = useItemPhotos(row.photoIds);
  return (
    <Card data-testid={`item-row-${row.id}`}>
      <CardBody className="gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{row.name}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-default-500">
              <span>{row.classType || 'Unknown class'}</span>
              <Chip size="sm" variant="flat">
                {ZONE_LABELS[row.zone] || row.zone || 'No zone'}
              </Chip>
            </div>
          </div>
          <Chip size="sm" variant="flat" color={row.photoIds.length ? 'success' : 'warning'} className="shrink-0">
            {row.photoIds.length ? `${row.photoIds.length} photo${row.photoIds.length === 1 ? '' : 's'}` : 'No photos'}
          </Chip>
        </div>
        {(photos.length > 0 || canAdd) && (
          <div className="flex flex-wrap items-center gap-2">
            {photos.length > 0 && (
              <PhotoLightbox photos={photos} className="flex flex-wrap gap-1" thumbnailClassName="h-12 w-12 rounded-small object-cover" />
            )}
            {canAdd && (
              <Button size="sm" variant="flat" color="primary" onPress={() => onAdd(row.id)} data-testid={`add-photo-${row.id}`}>
                Add photo
              </Button>
            )}
          </div>
        )}
      </CardBody>
    </Card>
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
