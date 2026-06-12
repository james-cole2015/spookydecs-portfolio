import { useEffect, useState, type ReactNode } from 'react';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { BarChart3, Package, Tag } from 'lucide-react';
import { storageAPI, itemsAPI, type ItemRecord } from '../api/storageApi';
import { Typography, Breadcrumbs, PageHeader, LoadingState, ErrorState } from '@spookydecs/ui';
import type { StorageUnit } from '../config/storageConfig';

function sd(item: ItemRecord): Record<string, unknown> {
  return (item.storage_data as Record<string, unknown>) ?? {};
}

const SEASON_ICON: Record<string, string> = { Halloween: '🎃', Christmas: '🎄', Shared: '🔧' };

interface SeasonStat {
  storage: number;
  items: number;
  packed_items: number;
}
interface Stats {
  total_storage: number;
  packed_storage: number;
  total_items: number;
  packed_items: number;
  by_season: Record<string, SeasonStat>;
}

/** Port of storage-statistics.js calculateStats() (packed-oriented). */
function calculateStats(storage: StorageUnit[], items: ItemRecord[]): Stats {
  const stats: Stats = {
    total_storage: storage.length,
    packed_storage: storage.filter((u) => u.packed !== false).length,
    total_items: items.length,
    packed_items: items.filter((i) => sd(i).is_stored !== false).length,
    by_season: {},
  };
  ['Halloween', 'Christmas', 'Shared'].forEach((season) => {
    const seasonStorage = storage.filter((u) => u.season === season);
    const seasonItems = items.filter((i) => i.season === season);
    if (seasonStorage.length > 0 || seasonItems.length > 0) {
      stats.by_season[season] = {
        storage: seasonStorage.length,
        items: seasonItems.length,
        packed_items: seasonItems.filter((i) => sd(i).is_stored !== false).length,
      };
    }
  });
  return stats;
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [s, i] = await Promise.all([storageAPI.getAll({}), itemsAPI.getAll({})]);
      setStats(calculateStats(s, i));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState label="Loading statistics…" />;
  if (error || !stats) return <ErrorState message={error ?? 'No data'} onRetry={load} />;

  const unpackedStorage = stats.total_storage - stats.packed_storage;
  const unpackedItems = stats.total_items - stats.packed_items;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Statistics' }]} />
      <PageHeader title="Statistics" icon={<BarChart3 size={26} />} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BigStat icon={<Package size={36} />} value={stats.total_storage} label="Storage Units" sub={unpackedStorage > 0 ? `${unpackedStorage} unpacked` : 'All packed'} warn={unpackedStorage > 0} />
        <BigStat icon={<Tag size={36} />} value={stats.total_items} label="Items" sub={unpackedItems > 0 ? `${unpackedItems} need packing` : 'All packed'} warn={unpackedItems > 0} />
      </div>

      {Object.keys(stats.by_season).length > 0 && (
        <div className="mt-6">
          <Typography type="h5" className="mb-3 text-foreground">By Season</Typography>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Object.entries(stats.by_season).map(([season, data]) => {
              const unpacked = data.items - data.packed_items;
              return (
                <Card key={season} shadow="md" className="bg-content1">
                  <CardHeader className="flex items-center gap-2">
                    <span>{SEASON_ICON[season] ?? '📦'}</span>
                    <Typography type="h6" className="text-foreground">{season}</Typography>
                  </CardHeader>
                  <CardBody className="pt-0 text-default-500">
                    <Typography type="body-sm" as="div">{data.storage} storage units</Typography>
                    <Typography type="body-sm" as="div">{data.packed_items} / {data.items} items packed</Typography>
                    {unpacked > 0 && <Typography type="body-sm" as="div" className="text-warning">{unpacked} unpacked</Typography>}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BigStat({ icon, value, label, sub, warn }: { icon: ReactNode; value: number; label: string; sub: string; warn: boolean }) {
  return (
    <Card shadow="md" className={`bg-content1 ${warn ? 'ring-1 ring-warning/40' : ''}`}>
      <CardBody className="flex flex-row items-center gap-4">
        <span className="text-secondary">{icon}</span>
        <div>
          <Typography type="h2" as="div" className="text-foreground">{value.toLocaleString()}</Typography>
          <Typography type="body" as="div" className="text-default-500">{label}</Typography>
          <Typography type="body-sm" as="div" className={warn ? 'text-warning' : 'text-default-500'}>{sub}</Typography>
        </div>
      </CardBody>
    </Card>
  );
}
