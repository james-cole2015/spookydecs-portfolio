import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Select,
  SelectItem,
  Button,
  Chip,
  Pagination,
  Spinner,
  Link as HeroLink,
  type SortDescriptor,
} from '@heroui/react';
import { Plus } from 'lucide-react';
import { PageHeader, useToast } from '@spookydecs/ui';
import { getAllCosts } from '../api/financeApi';
import { formatCurrency, formatDate, type CostRecord } from '../config/financeConfig';

const PAGE_SIZE = 20;

const TYPE_OPTIONS = [
  { value: 'acquisition', label: 'Acquisition' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'supply_purchase', label: 'Supply Purchase' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_OPTIONS = [
  { value: 'materials', label: 'Materials' },
  { value: 'labor', label: 'Labor' },
  { value: 'parts', label: 'Parts' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'light', label: 'Light' },
  { value: 'accessory', label: 'Accessory' },
];

const DATE_RANGE_OPTIONS = [
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_90', label: 'Last 90 Days' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

function calculateDateRange(preset: string): { start: string; end: string } {
  const today = new Date();
  const startDate = new Date();
  const endDate = new Date();

  switch (preset) {
    case 'last_30':
      startDate.setDate(today.getDate() - 30);
      break;
    case 'last_90':
      startDate.setDate(today.getDate() - 90);
      break;
    case 'this_year':
      startDate.setMonth(0, 1);
      break;
    case 'last_year':
      startDate.setFullYear(today.getFullYear() - 1, 0, 1);
      endDate.setFullYear(today.getFullYear() - 1, 11, 31);
      break;
    default:
      return { start: '', end: '' };
  }

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
}

const COLUMNS = [
  { key: 'cost_id', label: 'Cost ID', sortable: true },
  { key: 'item_name', label: 'Item Name', sortable: true },
  { key: 'cost_type', label: 'Type', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'cost_date', label: 'Date', sortable: true },
  { key: 'vendor', label: 'Vendor', sortable: true },
  { key: 'total_cost', label: 'Amount', sortable: true },
  { key: 'receipt', label: 'Receipt', sortable: false },
];

export default function RecordsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [data, setData] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Filter state lives in the URL so the records view is deep-linkable (#333 AC).
  const search = params.get('search') ?? '';
  const costType = params.get('cost_type') ?? 'all';
  const category = params.get('category') ?? 'all';
  const vendor = params.get('vendor') ?? 'all';
  const dateRange = params.get('date_range') ?? 'all';
  const startDate = params.get('start_date') ?? '';
  const endDate = params.get('end_date') ?? '';
  const noReceipt = params.get('no_receipt') ?? 'all';
  const classType = params.get('class_type') ?? 'all';
  const page = parseInt(params.get('page') ?? '1', 10) || 1;
  const sortColumn = params.get('sortBy') ?? 'cost_date';
  const sortDirection = (params.get('sortOrder') as 'asc' | 'desc') ?? 'desc';

  const patch = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'all') next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await getAllCosts();
        const costs: CostRecord[] = response.costs || response || [];
        setData(costs);
      } catch (err) {
        console.error('Failed to load cost records:', err);
        toast.showError('Failed to load cost records');
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vendors = useMemo(() => {
    const set = new Set<string>();
    data.forEach((c) => {
      if (c.vendor && c.vendor !== 'N/A') set.add(c.vendor);
    });
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    let rows = [...data];

    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (c) =>
          c.item_name?.toLowerCase().includes(s) ||
          c.cost_id?.toLowerCase().includes(s) ||
          c.vendor?.toLowerCase().includes(s),
      );
    }
    if (costType !== 'all') rows = rows.filter((c) => c.cost_type === costType);
    if (category !== 'all') rows = rows.filter((c) => c.category === category);
    if (vendor !== 'all') rows = rows.filter((c) => c.vendor === vendor);
    if (noReceipt !== 'all') {
      const wantNoReceipt = noReceipt === 'true';
      rows = rows.filter((c) => (c.no_receipt === true) === wantNoReceipt);
    }
    if (classType !== 'all') {
      rows = rows.filter((c) => ((c.class_type as string) || 'item') === classType);
    }

    let effectiveStart = startDate;
    let effectiveEnd = endDate;
    if (dateRange !== 'all' && dateRange !== 'custom') {
      const range = calculateDateRange(dateRange);
      effectiveStart = range.start;
      effectiveEnd = range.end;
    }
    if (effectiveStart || effectiveEnd) {
      rows = rows.filter((c) => {
        const d = new Date(c.cost_date as string);
        if (effectiveStart && effectiveEnd)
          return d >= new Date(effectiveStart) && d <= new Date(effectiveEnd);
        if (effectiveStart) return d >= new Date(effectiveStart);
        if (effectiveEnd) return d <= new Date(effectiveEnd);
        return true;
      });
    }

    rows.sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];
      if (sortColumn === 'cost_date' || sortColumn === 'purchase_date') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (sortColumn === 'total_cost') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal?.toLowerCase() || '';
      }
      if (sortDirection === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    return rows;
  }, [data, search, costType, category, vendor, noReceipt, classType, dateRange, startDate, endDate, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    search !== '' ||
    costType !== 'all' ||
    category !== 'all' ||
    vendor !== 'all' ||
    dateRange !== 'all' ||
    noReceipt !== 'all' ||
    classType !== 'all';

  const onSortChange = (descriptor: SortDescriptor) => {
    patch(
      { sortBy: String(descriptor.column), sortOrder: descriptor.direction === 'ascending' ? 'asc' : 'desc' },
      false,
    );
  };

  const clearFilters = () => {
    setParams(new URLSearchParams(), { replace: true });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading cost records…" />
      </div>
    );
  }

  if (error) {
    return <p className="p-5 text-default-500">Failed to load cost records.</p>;
  }

  return (
    <div>
      <PageHeader
        title="Cost Records"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <Button color="primary" startContent={<Plus size={16} />} onPress={() => navigate('/new')}>
            New Cost Record
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          aria-label="Search"
          placeholder="Search…"
          className="w-full sm:max-w-xs"
          value={search}
          onValueChange={(v) => patch({ search: v })}
          isClearable
          onClear={() => patch({ search: null })}
        />
        <Select
          aria-label="Type"
          className="w-40"
          selectedKeys={[costType]}
          onChange={(e) => patch({ cost_type: e.target.value || 'all' })}
        >
          {[{ value: 'all', label: 'All Types' }, ...TYPE_OPTIONS].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <Select
          aria-label="Category"
          className="w-44"
          selectedKeys={[category]}
          onChange={(e) => patch({ category: e.target.value || 'all' })}
        >
          {[{ value: 'all', label: 'All Categories' }, ...CATEGORY_OPTIONS].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <Select
          aria-label="Vendor"
          className="w-44"
          selectedKeys={[vendor]}
          onChange={(e) => patch({ vendor: e.target.value || 'all' })}
        >
          {[{ value: 'all', label: 'All Vendors' }, ...vendors.map((v) => ({ value: v, label: v }))].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <Select
          aria-label="Date range"
          className="w-40"
          selectedKeys={[dateRange]}
          onChange={(e) => patch({ date_range: e.target.value || 'all' })}
        >
          {[{ value: 'all', label: 'All Time' }, ...DATE_RANGE_OPTIONS].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <Select
          aria-label="Receipt"
          className="w-40"
          selectedKeys={[noReceipt]}
          onChange={(e) => patch({ no_receipt: e.target.value || 'all' })}
        >
          {[
            { value: 'all', label: 'All Receipts' },
            { value: 'true', label: 'No Receipt' },
            { value: 'false', label: 'Has Receipt' },
          ].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <Select
          aria-label="Class type"
          className="w-36"
          selectedKeys={[classType]}
          onChange={(e) => patch({ class_type: e.target.value || 'all' })}
        >
          {[
            { value: 'all', label: 'All Types' },
            { value: 'item', label: 'Items' },
            { value: 'pack', label: 'Packs' },
          ].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        {dateRange === 'custom' && (
          <>
            <Input
              type="date"
              aria-label="Start date"
              className="w-44"
              value={startDate}
              onValueChange={(v) => patch({ start_date: v })}
            />
            <Input
              type="date"
              aria-label="End date"
              className="w-44"
              value={endDate}
              onValueChange={(v) => patch({ end_date: v })}
            />
          </>
        )}
        <Button variant="flat" isDisabled={!hasActiveFilters} onPress={clearFilters}>
          Clear Filters
        </Button>
      </div>

      <Table
        aria-label="Cost records"
        sortDescriptor={{
          column: sortColumn,
          direction: sortDirection === 'asc' ? 'ascending' : 'descending',
        }}
        onSortChange={onSortChange}
        selectionMode="single"
        onRowAction={(key) => navigate(`/costs/${key}`)}
      >
        <TableHeader columns={COLUMNS}>
          {(col) => (
            <TableColumn key={col.key} allowsSorting={col.sortable}>
              {col.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={pageData} emptyContent="No cost records found">
          {(cost) => {
            const isPack = cost.class_type === 'pack';
            const hasReceipt = !!(cost as any).receipt_data?.image_id;
            return (
              <TableRow key={cost.cost_id} className="cursor-pointer">
                <TableCell>
                  <span className="font-mono text-tiny text-default-500">{cost.cost_id}</span>
                </TableCell>
                <TableCell>
                  {isPack ? (
                    <span className="flex items-center gap-2">
                      <strong>{cost.item_name || 'Pack Purchase'}</strong>
                      <Chip size="sm" color="secondary" variant="flat">
                        PACK
                      </Chip>
                    </span>
                  ) : cost.related_item_id ? (
                    <HeroLink
                      className="cursor-pointer font-semibold"
                      onPress={() => navigate(`/${cost.related_item_id}`)}
                    >
                      {cost.item_name || cost.related_item_id}
                    </HeroLink>
                  ) : (
                    <strong>{cost.item_name || 'N/A'}</strong>
                  )}
                </TableCell>
                <TableCell>
                  <Chip size="sm" variant="flat" className="capitalize">
                    {(cost.cost_type as string)?.replace('_', ' ')}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="capitalize">{cost.category}</span>
                </TableCell>
                <TableCell>{formatDate(cost.cost_date as string)}</TableCell>
                <TableCell>{cost.vendor || 'N/A'}</TableCell>
                <TableCell>
                  <span className="font-semibold">{formatCurrency(cost.total_cost as number)}</span>
                </TableCell>
                <TableCell>
                  {(cost as any).no_receipt === true ? (
                    <Chip size="sm" color="warning" variant="flat">
                      No Receipt
                    </Chip>
                  ) : hasReceipt ? (
                    <Chip size="sm" color="success" variant="flat">
                      ✓
                    </Chip>
                  ) : (
                    <span className="text-default-400">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          }}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            total={totalPages}
            page={page}
            onChange={(p) => patch({ page: String(p) }, false)}
            showControls
          />
        </div>
      )}
    </div>
  );
}
