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
  Tabs,
  Tab,
  type SortDescriptor,
  type Selection,
} from '@heroui/react';
import { Plus, Calendar } from 'lucide-react';
import { PageHeader, LoadingState, ErrorState, Breadcrumbs, useToast } from '@spookydecs/ui';
import { recordsAPI, itemsAPI } from '../api/maintenanceApi';
import {
  formatDate,
  formatCurrency,
  formatScheduledDate,
  getStatusChip,
  getCriticalityChip,
  getRecordTypeChip,
  generateSeasonBuckets,
  type MaintenanceRecord,
  type Item,
} from '../config/maintenanceConfig';

const PAGE_SIZE = 20;

const SEASON_OPTIONS = ['Halloween', 'Christmas', 'Shared'];
const CLASS_OPTIONS = ['Decoration', 'Light', 'Accessory'];

// Tab → status filter (mirrors the vanilla AppState.applyFilters tab buckets, plus an
// "All" default so the landing view always shows data regardless of status mix).
const TABS = [
  { key: 'all', label: 'All', status: null },
  { key: 'current', label: 'Current Tasks', status: 'in_progress' },
  { key: 'upcoming', label: 'Upcoming', status: 'scheduled' },
  { key: 'completed', label: 'Completed', status: 'completed' },
] as const;

const COLUMNS = [
  { key: 'item_id', label: 'Item', sortable: true },
  { key: 'record_type', label: 'Type', sortable: true },
  { key: 'title', label: 'Title', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'criticality', label: 'Criticality', sortable: true },
  { key: 'date_scheduled', label: 'Season Bucket', sortable: true },
  { key: 'total_cost', label: 'Cost', sortable: true },
  { key: 'created_at', label: 'Created', sortable: true },
];

function parseList(value: string | null): string[] {
  return value ? value.split(',').filter(Boolean) : [];
}

export default function RecordsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const tab = params.get('tab') ?? 'all';
  const season = parseList(params.get('season'));
  const classType = parseList(params.get('class'));
  const bucket = parseList(params.get('bucket'));
  const itemId = params.get('item') ?? '';
  const startDate = params.get('start') ?? '';
  const endDate = params.get('end') ?? '';
  const page = parseInt(params.get('page') ?? '1', 10) || 1;
  const sortColumn = params.get('sortBy') ?? 'created_at';
  const sortDirection = (params.get('sortOrder') as 'asc' | 'desc') ?? 'desc';

  const patch = (updates: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [recordsResult, allItems] = await Promise.all([recordsAPI.getAll(), itemsAPI.getAll()]);
        // Deduplicate by record_id (last wins), preserving the vanilla AppState behavior.
        const recordMap = new Map<string, MaintenanceRecord>();
        recordsResult.records.forEach((r) => {
          if (r && r.record_id) recordMap.set(r.record_id, r);
        });
        setRecords(Array.from(recordMap.values()));
        const itemMap: Record<string, Item> = {};
        allItems.forEach((item) => {
          const key = (item.item_id || item.id) as string;
          if (key) itemMap[key] = item;
        });
        setItems(itemMap);
      } catch (err) {
        console.error('Failed to load maintenance records:', err);
        toast.showError('Failed to load maintenance records');
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bucketOptions = useMemo(() => {
    const existing = [...new Set(records.map((r) => r.date_scheduled).filter(Boolean))] as string[];
    return generateSeasonBuckets(existing);
  }, [records]);

  const filtered = useMemo(() => {
    let rows = [...records];

    const tabStatus = TABS.find((t) => t.key === tab)?.status;
    if (tabStatus) rows = rows.filter((r) => r.status === tabStatus);

    if (season.length > 0) {
      rows = rows.filter((r) => {
        const item = items[r.item_id];
        return item && season.includes(item.season as string);
      });
    }
    if (classType.length > 0) {
      rows = rows.filter((r) => {
        const item = items[r.item_id];
        return item && classType.includes((item.class as string) || (item.class_type as string));
      });
    }
    if (bucket.length > 0) {
      rows = rows.filter((r) => r.date_scheduled && bucket.includes(r.date_scheduled));
    }
    if (itemId) {
      rows = rows.filter((r) => r.item_id?.toLowerCase().includes(itemId.toLowerCase()));
    }
    if (startDate) {
      const start = new Date(startDate);
      rows = rows.filter((r) => r.created_at && new Date(r.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      rows = rows.filter((r) => r.created_at && new Date(r.created_at) <= end);
    }

    rows.sort((a, b) => {
      let aVal: any = a[sortColumn];
      let bVal: any = b[sortColumn];
      if (sortColumn === 'created_at') {
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      } else if (sortColumn === 'total_cost') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string)?.toLowerCase() || '';
      }
      if (sortDirection === 'asc') return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });

    return rows;
  }, [records, items, tab, season, classType, bucket, itemId, startDate, endDate, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const hasActiveFilters =
    season.length > 0 || classType.length > 0 || bucket.length > 0 || itemId !== '' || startDate !== '' || endDate !== '';

  const onSortChange = (descriptor: SortDescriptor) => {
    patch({ sortBy: String(descriptor.column), sortOrder: descriptor.direction === 'ascending' ? 'asc' : 'desc' }, false);
  };

  const selectionToList = (keys: Selection): string =>
    keys === 'all' ? '' : Array.from(keys as Set<string>).join(',');

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load maintenance records." />;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Maintenance', to: '/' }, { label: 'Records' }]} />
      <PageHeader
        title="Maintenance Records"
        subtitle={`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
        actions={
          <>
            <Button variant="flat" startContent={<Calendar size={16} />} onPress={() => navigate('/schedules')}>
              Schedules
            </Button>
            <Button color="primary" startContent={<Plus size={16} />} onPress={() => navigate('/create')}>
              Create Record
            </Button>
          </>
        }
      />

      <Tabs
        aria-label="Record status"
        selectedKey={tab}
        onSelectionChange={(key) => patch({ tab: String(key) })}
        className="mb-4"
      >
        {TABS.map((t) => (
          <Tab key={t.key} title={t.label} />
        ))}
      </Tabs>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select
          aria-label="Season"
          className="w-44"
          selectionMode="multiple"
          placeholder="All Seasons"
          selectedKeys={new Set(season)}
          onSelectionChange={(keys) => patch({ season: selectionToList(keys) })}
        >
          {SEASON_OPTIONS.map((o) => (
            <SelectItem key={o}>{o}</SelectItem>
          ))}
        </Select>
        <Select
          aria-label="Class"
          className="w-44"
          selectionMode="multiple"
          placeholder="All Classes"
          selectedKeys={new Set(classType)}
          onSelectionChange={(keys) => patch({ class: selectionToList(keys) })}
        >
          {CLASS_OPTIONS.map((o) => (
            <SelectItem key={o}>{o}</SelectItem>
          ))}
        </Select>
        <Select
          aria-label="Season bucket"
          className="w-52"
          selectionMode="multiple"
          placeholder="All Buckets"
          selectedKeys={new Set(bucket)}
          onSelectionChange={(keys) => patch({ bucket: selectionToList(keys) })}
        >
          {bucketOptions.map((b) => (
            <SelectItem key={b}>{b}</SelectItem>
          ))}
        </Select>
        <Input
          aria-label="Item ID"
          placeholder="Search item…"
          className="w-full sm:max-w-xs"
          value={itemId}
          onValueChange={(v) => patch({ item: v })}
          isClearable
          onClear={() => patch({ item: null })}
        />
        <Input
          type="date"
          aria-label="Created after"
          className="w-44"
          value={startDate}
          onValueChange={(v) => patch({ start: v })}
        />
        <Input
          type="date"
          aria-label="Created before"
          className="w-44"
          value={endDate}
          onValueChange={(v) => patch({ end: v })}
        />
        <Button variant="flat" isDisabled={!hasActiveFilters} onPress={() => setParams(new URLSearchParams({ tab }), { replace: true })}>
          Clear Filters
        </Button>
      </div>

      <Table
        aria-label="Maintenance records"
        sortDescriptor={{ column: sortColumn, direction: sortDirection === 'asc' ? 'ascending' : 'descending' }}
        onSortChange={onSortChange}
        selectionMode="single"
        onRowAction={(key) => {
          const record = pageData.find((r) => r.record_id === key);
          if (record) navigate(`/${record.item_id}/${record.record_id}`);
        }}
      >
        <TableHeader columns={COLUMNS}>
          {(col) => (
            <TableColumn key={col.key} allowsSorting={col.sortable}>
              {col.label}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody items={pageData} emptyContent="No maintenance records found">
          {(record) => {
            const status = getStatusChip(record.status);
            const crit = getCriticalityChip(record.criticality as string);
            const type = getRecordTypeChip(record.record_type);
            return (
              <TableRow key={record.record_id} className="cursor-pointer">
                <TableCell>
                  <span className="font-mono text-tiny text-default-500">{record.item_id}</span>
                </TableCell>
                <TableCell>
                  <Chip size="sm" color={type.color} variant="flat">
                    {type.label}
                  </Chip>
                </TableCell>
                <TableCell>{record.title || '—'}</TableCell>
                <TableCell>
                  <Chip size="sm" color={status.color} variant="flat">
                    {status.label}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip size="sm" color={crit.color} variant="flat">
                    {crit.label}
                  </Chip>
                </TableCell>
                <TableCell>{formatScheduledDate(record.date_scheduled)}</TableCell>
                <TableCell>
                  <span className="font-semibold">{formatCurrency(record.total_cost)}</span>
                </TableCell>
                <TableCell>{formatDate(record.created_at)}</TableCell>
              </TableRow>
            );
          }}
        </TableBody>
      </Table>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination total={totalPages} page={page} onChange={(p) => patch({ page: String(p) }, false)} showControls />
        </div>
      )}
    </div>
  );
}
