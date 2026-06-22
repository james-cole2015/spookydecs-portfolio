import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Tabs,
  Tab,
  Button,
  Chip,
  Link as HeroLink,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from '@heroui/react';
import { Plus } from 'lucide-react';
import { Breadcrumbs, LoadingState, ErrorState, Typography, useToast } from '@spookydecs/ui';
import { recordsAPI, itemsAPI, getItemUrl } from '../api/maintenanceApi';
import {
  formatDate,
  formatCurrency,
  getStatusChip,
  getCriticalityChip,
  getRecordTypeChip,
  type MaintenanceRecord,
  type Item,
} from '../config/maintenanceConfig';
import CostsPanel from '../components/CostsPanel';

const RECORD_COLUMNS = [
  { key: 'status', label: 'Status' },
  { key: 'title', label: 'Title' },
  { key: 'type', label: 'Type' },
  { key: 'severity', label: 'Severity' },
  { key: 'date', label: 'Date' },
  { key: 'cost', label: 'Cost' },
];

function RecordsTable({
  records,
  itemId,
  emptyContent,
}: {
  records: MaintenanceRecord[];
  itemId: string;
  emptyContent: string;
}) {
  const navigate = useNavigate();
  return (
    <Table
      aria-label="Item maintenance records"
      selectionMode="single"
      onRowAction={(key) => navigate(`/${itemId}/${key}`)}
    >
      <TableHeader columns={RECORD_COLUMNS}>
        {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
      </TableHeader>
      <TableBody items={records} emptyContent={emptyContent}>
        {(record) => {
          const status = getStatusChip(record.status);
          const crit = getCriticalityChip(record.criticality as string);
          const type = getRecordTypeChip(record.record_type);
          return (
            <TableRow key={record.record_id} className="cursor-pointer">
              <TableCell>
                <Chip size="sm" color={status.color} variant="flat">
                  {status.label}
                </Chip>
              </TableCell>
              <TableCell>{record.title || '—'}</TableCell>
              <TableCell>
                <Chip size="sm" color={type.color} variant="flat">
                  {type.label}
                </Chip>
              </TableCell>
              <TableCell>
                <Chip size="sm" color={crit.color} variant="flat">
                  {crit.label}
                </Chip>
              </TableCell>
              <TableCell>{formatDate((record.date_performed as string) || record.created_at)}</TableCell>
              <TableCell>{formatCurrency(record.total_cost || 0)}</TableCell>
            </TableRow>
          );
        }}
      </TableBody>
    </Table>
  );
}

export default function ItemDetailPage() {
  const { itemId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [item, setItem] = useState<Item | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [itemUrl, setItemUrl] = useState('#');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const it = await itemsAPI.getById(itemId);
        setItem(it);
        const [recordsResult, url] = await Promise.all([
          recordsAPI.getByItem(itemId),
          getItemUrl(itemId).catch(() => '#'),
        ]);
        setRecords(recordsResult.records);
        setItemUrl(url);
      } catch (err) {
        console.error('Failed to load item:', err);
        toast.showError('Failed to load item');
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  const buckets = useMemo(
    () => ({
      current: records.filter((r) => r.status === 'in_progress'),
      upcoming: records.filter((r) => r.status === 'scheduled'),
      completed: records.filter((r) => r.status === 'completed'),
    }),
    [records],
  );

  if (loading) return <LoadingState />;
  if (error || !item) return <ErrorState message="The item you're looking for could not be found." />;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Maintenance', to: '/' }, { label: 'Records', to: '/records' }, { label: itemId }]} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography type="h3">{(item.short_name || itemId) as string}</Typography>
          <Typography type="body-sm" className="mt-1 text-default-500">
            {[item.class, item.class_type, item.season].filter(Boolean).join(' • ')}
          </Typography>
          <HeroLink isExternal href={itemUrl} size="sm" className="mt-1">
            View in Items Subdomain →
          </HeroLink>
        </div>
        <Button color="primary" startContent={<Plus size={16} />} onPress={() => navigate(`/create?item_id=${itemId}`)}>
          Create Record
        </Button>
      </div>

      <Tabs aria-label="Item records">
        <Tab key="current" title={`Current Tasks (${buckets.current.length})`}>
          <RecordsTable records={buckets.current} itemId={itemId} emptyContent="No tasks in progress." />
        </Tab>
        <Tab key="upcoming" title={`Upcoming (${buckets.upcoming.length})`}>
          <RecordsTable records={buckets.upcoming} itemId={itemId} emptyContent="No upcoming tasks." />
        </Tab>
        <Tab key="completed" title={`Completed (${buckets.completed.length})`}>
          <RecordsTable records={buckets.completed} itemId={itemId} emptyContent="No completed work." />
        </Tab>
        <Tab key="costs" title="Costs">
          <CostsPanel itemId={itemId} />
        </Tab>
      </Tabs>
    </div>
  );
}
