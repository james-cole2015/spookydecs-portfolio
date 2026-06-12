import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
} from '@heroui/react';
import { Package, BarChart3, Luggage, Plus } from 'lucide-react';
import { Typography } from '../components/Typography';
import { storageAPI, itemsAPI, photosAPI, type ItemRecord } from '../api/storageApi';
import { type StorageUnit } from '../config/storageConfig';
import { applyFilters, calculateStats, type StorageStats } from '../lib/stats';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, EmptyState } from '../components/Layout';
import { FilterBar, type Filters } from '../components/FilterBar';
import { StorageCard } from '../components/StorageCard';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useAuth } from '@spookydecs/ui';
import { useToast } from '../lib/toast';

const FILTER_KEYS = ['season', 'location', 'class_type', 'packed', 'search'];

function readFilters(params: URLSearchParams): Filters {
  return {
    season: params.get('season') ?? 'All',
    location: params.get('location') ?? 'All',
    class_type: params.get('class_type') ?? 'All',
    packed: params.get('packed') ?? 'All',
    search: params.get('search') ?? '',
  };
}

export default function ListPage() {
  const navigate = useNavigate();
  const { hasMinRole } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allStorage, setAllStorage] = useState<StorageUnit[]>([]);
  const [allItems, setAllItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageUnit | null>(null);
  const [packTarget, setPackTarget] = useState<StorageUnit | null>(null);
  const [busy, setBusy] = useState(false);

  const statsDrawer = useDisclosure();
  const filters = readFilters(searchParams);
  const canWrite = hasMinRole('builder');
  const canDelete = hasMinRole('admin');

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [storageData, itemsData] = await Promise.all([storageAPI.getAll({}), itemsAPI.getAll({})]);
      let units = storageData;

      const photoIds = units
        .map((u) => (u.images as Record<string, string> | undefined)?.primary_photo_id)
        .filter((id): id is string => Boolean(id));
      if (photoIds.length > 0) {
        const photoMap = await photosAPI.getByIds(photoIds);
        units = units.map((u) => {
          const pid = (u.images as Record<string, string> | undefined)?.primary_photo_id;
          const photo = pid ? photoMap[pid] : null;
          if (!photo) return u;
          return {
            ...u,
            images: {
              ...(u.images as Record<string, unknown>),
              thumb_cloudfront_url: photo.thumb_cloudfront_url ?? null,
              photo_url: photo.cloudfront_url ?? null,
            },
          };
        });
      }

      setAllStorage(units);
      setAllItems(itemsData);
      setStats(calculateStats(units, itemsData));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load storage units.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => applyFilters(allStorage, filters), [allStorage, filters]);

  function updateFilters(next: Filters) {
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((k) => {
      const v = next[k];
      if (v && v !== 'All' && v !== '') params.set(k, v);
    });
    setSearchParams(params, { replace: true });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await storageAPI.delete(deleteTarget.id);
      toast.showSuccess('Storage unit deleted successfully');
      setDeleteTarget(null);
      await loadData();
    } catch (e: any) {
      const msg = e?.message?.includes('contents')
        ? 'Cannot delete storage unit with contents. Remove all items first.'
        : e?.message ?? 'Failed to delete storage unit';
      toast.showError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function confirmSelfPack() {
    if (!packTarget) return;
    setBusy(true);
    try {
      await storageAPI.update(packTarget.id, { packed: true });
      toast.showSuccess(`${packTarget.short_name} marked as packed`);
      setPackTarget(null);
      await loadData();
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to pack storage unit');
    } finally {
      setBusy(false);
    }
  }

  const unpackedBadge = stats?.unpacked_items ?? 0;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Totes' }]} />
      <PageHeader
        title="Storage Inventory"
        icon={<Package size={26} />}
        actions={
          <>
            <Button
              variant="flat"
              onPress={statsDrawer.onOpen}
              startContent={<BarChart3 size={18} />}
              aria-label="View statistics"
            >
              Stats{unpackedBadge > 0 ? ` (${unpackedBadge})` : ''}
            </Button>
            <Button variant="flat" color="secondary" startContent={<Luggage size={18} />} onPress={() => navigate('/storage/pack')}>
              Pack
            </Button>
            {canWrite && (
              <Button color="primary" variant="shadow" startContent={<Plus size={18} />} onPress={() => navigate('/storage/create')}>
                Create
              </Button>
            )}
          </>
        }
      />

      <FilterBar filters={filters} show={['season', 'location', 'class_type', 'packed']} onChange={updateFilters} />

      <Typography type="body-sm" className="mb-3 text-default-500">
        {filtered.length === allStorage.length
          ? `${allStorage.length} ${allStorage.length === 1 ? 'unit' : 'units'}`
          : `${filtered.length} of ${allStorage.length} units`}
      </Typography>

      {loading ? (
        <LoadingState label="Loading storage units…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No storage units" message="Try adjusting your filters or create a new unit." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((unit) => (
            <StorageCard
              key={unit.id}
              unit={unit}
              canWrite={canWrite}
              canDelete={canDelete}
              onDelete={setDeleteTarget}
              onSelfPack={setPackTarget}
            />
          ))}
        </div>
      )}

      <Drawer isOpen={statsDrawer.isOpen} onClose={statsDrawer.onClose} placement="right">
        <DrawerContent>
          <DrawerHeader>Storage Statistics</DrawerHeader>
          <DrawerBody className="gap-4 pb-8">
            {stats && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Storage units" value={stats.total_storage} />
                  <Stat label="Unpacked units" value={stats.unpacked_storage} />
                  <Stat label="Total items" value={stats.total_items} />
                  <Stat label="Unpacked items" value={stats.unpacked_items} />
                </div>
                <div>
                  <Typography type="h6" className="mb-2 text-foreground">By season</Typography>
                  <div className="flex flex-col gap-2">
                    {Object.entries(stats.by_season).map(([season, s]) => (
                      <div key={season} className="rounded-lg border border-default-100 p-3">
                        <Typography type="h6" as="div" className="text-foreground">{season}</Typography>
                        <Typography type="body-sm" as="div" className="text-default-500">
                          {s.storage} units · {s.items} items · {s.unpacked_items} unpacked
                        </Typography>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Delete storage unit?"
        body={
          <p>
            Delete <strong>{deleteTarget?.short_name}</strong>? This cannot be undone, and the unit must be empty.
          </p>
        }
        confirmLabel="Delete"
        confirmColor="danger"
        isLoading={busy}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(packTarget)}
        title="Confirm pack"
        body={
          <p>
            Mark <strong>{packTarget?.short_name}</strong> and its item as packed?
          </p>
        }
        confirmLabel="Mark as Packed"
        confirmColor="secondary"
        isLoading={busy}
        onConfirm={confirmSelfPack}
        onClose={() => setPackTarget(null)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-default-100 bg-content2/40 p-3">
      <Typography type="h4" as="div" className="text-secondary-300">{value}</Typography>
      <Typography type="body-xs" as="div" className="text-default-500">{label}</Typography>
    </div>
  );
}
