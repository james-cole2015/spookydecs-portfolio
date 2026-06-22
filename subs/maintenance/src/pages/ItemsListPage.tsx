import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Chip, Button } from '@heroui/react';
import { PageHeader, LoadingState, ErrorState, EmptyState, Typography, Breadcrumbs, useToast } from '@spookydecs/ui';
import { recordsAPI, itemsAPI } from '../api/maintenanceApi';
import { formatDate, type Item, type MaintenanceRecord } from '../config/maintenanceConfig';

const SEASON_ICONS: Record<string, string> = { Halloween: '🎃', Christmas: '🎄' };
const ALLOWED_CLASSES = new Set(['Decoration', 'Light', 'Accessory']);
const CLASS_TYPES = ['Inflatable', 'Animatronic', 'Static Prop', 'Spot Light', 'String Light', 'Cord', 'Plug'];

interface Summary {
  totalRecords: number;
  openRecords: number;
  lastRecordDate: string | null;
}

function buildSummary(records: MaintenanceRecord[]): Summary {
  const totalRecords = records.length;
  const openRecords = records.filter((r) => r.status === 'scheduled' || r.status === 'in_progress').length;
  const lastRecord = records.length
    ? records.reduce((latest, r) =>
        new Date(r.created_at ?? 0) > new Date(latest.created_at ?? 0) ? r : latest,
      )
    : null;
  return { totalRecords, openRecords, lastRecordDate: lastRecord?.created_at ?? null };
}

export default function ItemsListPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [items, setItems] = useState<Item[]>([]);
  const [recordsByItem, setRecordsByItem] = useState<Map<string, MaintenanceRecord[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [activeClasses, setActiveClasses] = useState<Set<string>>(new Set());
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [allItems, recordsResult] = await Promise.all([itemsAPI.getAll(), recordsAPI.getAll()]);
        const filtered = allItems.filter((item) => ALLOWED_CLASSES.has(item.class as string));
        const byItem = new Map<string, MaintenanceRecord[]>();
        recordsResult.records.forEach((record) => {
          const list = byItem.get(record.item_id) ?? [];
          list.push(record);
          byItem.set(record.item_id, list);
        });
        filtered.sort((a, b) =>
          ((a.short_name || a.id) as string).localeCompare((b.short_name || b.id) as string),
        );
        setItems(filtered);
        setRecordsByItem(byItem);
      } catch (err) {
        console.error('Failed to load items:', err);
        toast.showError('Failed to load items');
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(
    () =>
      items.filter((item) => {
        const classOk = activeClasses.size === 0 || activeClasses.has(item.class as string);
        const typeOk = activeTypes.size === 0 || activeTypes.has(item.class_type as string);
        return classOk && typeOk;
      }),
    [items, activeClasses, activeTypes],
  );

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  };

  const hasActive = activeClasses.size > 0 || activeTypes.size > 0;

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load items." />;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Maintenance', to: '/' }, { label: 'Items' }]} />
      <PageHeader title="Items" subtitle="All items with their maintenance history. Click an item to view records." />

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-default-500">Class</span>
          {['Decoration', 'Light', 'Accessory'].map((v) => (
            <Chip
              key={v}
              variant={activeClasses.has(v) ? 'solid' : 'flat'}
              color={activeClasses.has(v) ? 'primary' : 'default'}
              className="cursor-pointer"
              onClick={() => toggle(activeClasses, setActiveClasses, v)}
            >
              {v}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-default-500">Class Type</span>
          {CLASS_TYPES.map((v) => (
            <Chip
              key={v}
              variant={activeTypes.has(v) ? 'solid' : 'flat'}
              color={activeTypes.has(v) ? 'primary' : 'default'}
              className="cursor-pointer"
              onClick={() => toggle(activeTypes, setActiveTypes, v)}
            >
              {v}
            </Chip>
          ))}
          {hasActive && (
            <Button
              size="sm"
              variant="light"
              onPress={() => {
                setActiveClasses(new Set());
                setActiveTypes(new Set());
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No items match the selected filters." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => {
            const summary = buildSummary(recordsByItem.get(item.id as string) ?? []);
            const icon = SEASON_ICONS[item.season as string] ?? '🏷️';
            return (
              <Card
                key={item.id as string}
                isPressable
                isHoverable
                onPress={() => navigate(`/${item.id}`)}
                className="h-full"
              >
                <CardBody className="flex flex-row gap-3">
                  <span className="text-3xl">{icon}</span>
                  <div className="flex-1">
                    <Typography type="h6">{(item.short_name || item.id) as string}</Typography>
                    <Typography type="body-xs" className="text-default-500">
                      {[item.season, item.class_type].filter(Boolean).join(' · ')}
                    </Typography>
                    <Typography type="body-xs" className="mt-1 text-default-400">
                      {summary.totalRecords > 0
                        ? `${summary.totalRecords} record${summary.totalRecords !== 1 ? 's' : ''} · Last: ${formatDate(summary.lastRecordDate ?? undefined)}`
                        : 'No records yet'}
                    </Typography>
                    {summary.openRecords > 0 && (
                      <Chip size="sm" color="warning" variant="flat" className="mt-2">
                        {summary.openRecords} open
                      </Chip>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
