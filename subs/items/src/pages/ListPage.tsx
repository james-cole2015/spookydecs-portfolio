import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { Plus } from 'lucide-react';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, FilterBar, useAuth, useToast } from '@spookydecs/ui';
import { fetchAllItems } from '../api/itemsApi';
import { type Item } from '../api/types';
import {
  type Filters,
  FILTER_KEYS,
  FILTER_SELECT_KEYS,
  FILTER_OPTIONS,
  FILTER_LABELS,
  readFilters,
} from '../config/itemsConfig';
import { ItemsCards } from '../components/ItemsCards';

function applyFilters(items: Item[], f: Filters): Item[] {
  return items.filter((item) => {
    if (f.search) {
      const s = f.search.toLowerCase();
      if (!item.short_name?.toLowerCase().includes(s) && !item.id?.toLowerCase().includes(s)) return false;
    }
    if (f.season && item.season !== f.season) return false;
    if (f.class && item.class !== f.class) return false;
    if (f.class_type && item.class_type !== f.class_type) return false;
    if (f.status && item.status !== f.status) return false;
    if (f.maintenance === 'needs_repair' && !item.maintenance?.repair_data?.needs_repair) return false;
    if (f.maintenance === 'non_operational' && item.operational_status !== false) return false;
    return true;
  });
}

export default function ListPage() {
  const navigate = useNavigate();
  const { hasMinRole } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters = readFilters(searchParams);
  const canWrite = hasMinRole('builder');

  const classLabels: Record<string, string> = { Decoration: 'Decorations', Light: 'Lights', Accessory: 'Accessories' };
  const title = filters.class ? classLabels[filters.class] ?? 'All Items' : 'All Items';

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchAllItems(true);
      setAllItems(items);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load items.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => applyFilters(allItems, filters), [allItems, filters]);

  function updateFilters(next: Record<string, string>) {
    // Cascade: changing class invalidates the (hidden) class_type sub-filter.
    if (next.class !== filters.class) next.class_type = '';
    const params = new URLSearchParams();
    FILTER_KEYS.forEach((k) => {
      const v = next[k as keyof Filters];
      if (v && v !== '') params.set(k, v);
    });
    setSearchParams(params, { replace: true });
  }

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <Breadcrumbs crumbs={[{ label: 'Items', to: '/' }, { label: title }]} />
      <div className="flex items-center justify-between mb-4">
        <PageHeader title="Inventory Management" />
        {canWrite && (
          <Button color="primary" startContent={<Plus size={16} />} onPress={() => navigate('/create')}>
            Create Item
          </Button>
        )}
      </div>
      <FilterBar
        filters={filters}
        show={FILTER_SELECT_KEYS}
        options={FILTER_OPTIONS}
        labels={FILTER_LABELS}
        onChange={updateFilters}
        searchPlaceholder="Search by name or ID..."
        searchDebounceMs={300}
      />
      <ItemsCards
        items={filtered}
        onView={(id) => navigate(`/${id}`)}
        onEdit={(id) => navigate(`/${id}/edit`)}
        onDelete={async (id) => {
          const { deleteItem } = await import('../api/itemsApi');
          try {
            await deleteItem(id);
            toast.showSuccess('Item deleted.');
            loadData();
          } catch (e: any) {
            toast.showError(e?.message ?? 'Delete failed.');
          }
        }}
        canWrite={canWrite}
        canDelete={hasMinRole('admin')}
      />
    </div>
  );
}
