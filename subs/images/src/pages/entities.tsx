/**
 * Entities — typed HeroUI port of js/pages/entities.js (#336).
 * Groups photos by item_id / storage_id / idea_id. The active type filter
 * (multi-select) lives in the URL as repeated `type` params.
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, EmptyState, SeasonChip } from '@spookydecs/ui';
import { fetchImages, fetchIdeas } from '../api/imagesApi';
import { canonicalSeason, type Photo } from '../config/imagesConfig';

type EntityType = 'item' | 'storage' | 'idea';

interface EntityEntry {
  id: string;
  type: EntityType;
  photos: Photo[];
  primaryPhoto: Photo | null;
  count: number;
  seasons: Set<string>;
  itemClass: string | null;
}

const TYPE_LABELS: Record<EntityType, string> = { item: 'Item', storage: 'Storage', idea: 'Idea' };

function addToMap(map: Map<string, EntityEntry>, id: string, type: EntityType, photo: Photo) {
  let entry = map.get(id);
  if (!entry) {
    entry = { id, type, photos: [], primaryPhoto: null, count: 0, seasons: new Set(), itemClass: null };
    map.set(id, entry);
  }
  entry.photos.push(photo);
  entry.count++;
  if (photo.season) entry.seasons.add(photo.season.toLowerCase());
  if (!entry.itemClass && photo.item_class) entry.itemClass = photo.item_class;
  if (!entry.primaryPhoto && photo.is_primary) entry.primaryPhoto = photo;
  if (!entry.primaryPhoto && entry.photos.length === 1) entry.primaryPhoto = photo;
}

function groupByEntity(photos: Photo[]) {
  const itemsMap = new Map<string, EntityEntry>();
  const storageMap = new Map<string, EntityEntry>();
  const ideasMap = new Map<string, EntityEntry>();
  photos.forEach((photo) => {
    if (photo.item_id) addToMap(itemsMap, photo.item_id, 'item', photo);
    if (photo.storage_id) addToMap(storageMap, photo.storage_id, 'storage', photo);
    if (photo.idea_id) addToMap(ideasMap, photo.idea_id, 'idea', photo);
  });
  return { itemsMap, storageMap, ideasMap };
}

export default function Entities() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTypes = new Set(searchParams.getAll('type'));

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [ideaTitles, setIdeaTitles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const all = await fetchImages({ limit: 500 });
      setPhotos(all);
      if (all.some((p) => p.idea_id)) {
        const ideas = await fetchIdeas();
        const titles = new Map<string, string>();
        ideas.forEach((i: any) => {
          if (i.id && i.title) titles.set(i.id, i.title);
        });
        setIdeaTitles(titles);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load entities.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const { itemsMap, storageMap, ideasMap } = useMemo(() => groupByEntity(photos), [photos]);

  const entities = useMemo(() => {
    const showItems = activeTypes.size === 0 || activeTypes.has('item');
    const showStorage = activeTypes.size === 0 || activeTypes.has('storage');
    const showIdeas = activeTypes.size === 0 || activeTypes.has('idea');
    const list: EntityEntry[] = [];
    if (showItems) list.push(...itemsMap.values());
    if (showStorage) list.push(...storageMap.values());
    if (showIdeas) list.push(...ideasMap.values());
    return list.sort((a, b) => a.id.localeCompare(b.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsMap, storageMap, ideasMap, searchParams]);

  function toggleType(type: EntityType) {
    const next = new Set(activeTypes);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    const params = new URLSearchParams();
    next.forEach((t) => params.append('type', t));
    setSearchParams(params, { replace: false });
  }

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Images', to: '/images' }, { label: 'Entities' }]} />
      <PageHeader
        title="Entities"
        actions={
          <>
            {(['item', 'storage', 'idea'] as EntityType[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={activeTypes.has(t) ? 'solid' : 'flat'}
                color={activeTypes.has(t) ? 'secondary' : 'default'}
                onPress={() => toggleType(t)}
              >
                {TYPE_LABELS[t]}s
              </Button>
            ))}
          </>
        }
      />

      {loading ? (
        <LoadingState label="Loading entities…" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : entities.length === 0 ? (
        <EmptyState icon="📦" title="No entities found" />
      ) : (
        <>
          <div className="mb-3 text-small text-default-500">
            {entities.length} entit{entities.length === 1 ? 'y' : 'ies'}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entities.map((entity) => {
              const thumb =
                entity.primaryPhoto?.thumb_cloudfront_url || entity.primaryPhoto?.cloudfront_url;
              const displayName =
                entity.type === 'idea' ? ideaTitles.get(entity.id) || entity.id : entity.id;
              return (
                <Card
                  key={`${entity.type}-${entity.id}`}
                  isPressable
                  onPress={() => navigate(`/images/entities/${entity.id}?type=${entity.type}`)}
                  className="h-full"
                >
                  <div className="aspect-square w-full overflow-hidden bg-content2">
                    {thumb ? (
                      <img src={thumb} alt={entity.id} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-default-400">
                        No Photo
                      </div>
                    )}
                  </div>
                  <CardBody className="gap-1">
                    <div className="truncate font-medium text-foreground">{displayName}</div>
                    <div className="flex flex-wrap items-center gap-1">
                      <Chip size="sm" variant="flat">
                        {TYPE_LABELS[entity.type]}
                      </Chip>
                      {entity.itemClass && (
                        <Chip size="sm" variant="flat" color="primary">
                          {entity.itemClass}
                        </Chip>
                      )}
                    </div>
                    <div className="text-tiny text-default-500">
                      {entity.count} photo{entity.count === 1 ? '' : 's'}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[...entity.seasons].map((s) => (
                        <SeasonChip key={s} size="sm" variant="flat" value={canonicalSeason(s)} />
                      ))}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
