import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Select,
  SelectItem,
  Button,
  Chip,
} from '@heroui/react';
import { Plus, ArrowRight } from 'lucide-react';
import { PageHeader, LoadingState, ErrorState, Breadcrumbs, useToast } from '@spookydecs/ui';
import { scheduleAPI } from '../api/maintenanceApi';
import {
  formatFrequency,
  getCategoryLabel,
  getTaskTypeIcon,
  type ScheduleTemplate,
} from '../config/maintenanceConfig';

const COLUMNS = [
  { key: 'class_type', label: 'Class Type' },
  { key: 'short_name', label: 'Short Name' },
  { key: 'title', label: 'Title' },
  { key: 'record_type', label: 'Type' },
  { key: 'frequency', label: 'Frequency' },
  { key: 'enabled', label: 'Status' },
  { key: 'is_default', label: 'Default' },
];

export default function SchedulesListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();

  const [schedules, setSchedules] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const enabled = params.get('enabled') ?? 'all';
  const isDefault = params.get('default') ?? 'all';
  const recordType = params.get('type') ?? 'all';
  const season = params.get('season') ?? 'all';

  const patch = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === 'all') next.delete(k);
      else next.set(k, v);
    });
    setParams(next, { replace: true });
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setSchedules(await scheduleAPI.getAll());
      } catch (err) {
        console.error('Failed to load templates:', err);
        toast.showError('Failed to load templates');
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    let rows = [...schedules];
    if (enabled !== 'all') rows = rows.filter((s) => (s.enabled !== false) === (enabled === 'true'));
    if (isDefault !== 'all') rows = rows.filter((s) => !!s.is_default === (isDefault === 'true'));
    if (recordType !== 'all') rows = rows.filter((s) => (s.record_type || (s as any).task_type) === recordType);
    if (season !== 'all') rows = rows.filter((s) => s.season === season);
    return rows.sort((a, b) => (a.class_type || '').localeCompare(b.class_type || ''));
  }, [schedules, enabled, isDefault, recordType, season]);

  const stats = useMemo(() => {
    const total = schedules.length;
    const on = schedules.filter((s) => s.enabled !== false).length;
    const defaults = schedules.filter((s) => s.is_default).length;
    return { total, on, off: total - on, defaults };
  }, [schedules]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message="Failed to load maintenance templates." />;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Maintenance', to: '/' }, { label: 'Templates' }]} />
      <PageHeader
        title="Maintenance Templates"
        subtitle={`${filtered.length} of ${stats.total} template${stats.total !== 1 ? 's' : ''}`}
        actions={
          <>
            <Button variant="flat" startContent={<ArrowRight size={16} />} onPress={() => navigate('/schedules/apply')}>
              Apply Templates
            </Button>
            <Button color="primary" startContent={<Plus size={16} />} onPress={() => navigate('/schedules/new')}>
              Create Template
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip variant="flat">Total: {stats.total}</Chip>
        <Chip variant="flat" color="success">
          Enabled: {stats.on}
        </Chip>
        <Chip variant="flat" color="default">
          Disabled: {stats.off}
        </Chip>
        <Chip variant="flat" color="primary">
          Defaults: {stats.defaults}
        </Chip>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Select aria-label="Status" className="w-40" selectedKeys={[enabled]} onChange={(e) => patch({ enabled: e.target.value })}>
          {[
            { value: 'all', label: 'All Status' },
            { value: 'true', label: 'Enabled' },
            { value: 'false', label: 'Disabled' },
          ].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <Select aria-label="Type" className="w-40" selectedKeys={[recordType]} onChange={(e) => patch({ type: e.target.value })}>
          {[
            { value: 'all', label: 'All Types' },
            { value: 'inspection', label: 'Inspection' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'repair', label: 'Repair' },
          ].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <Select aria-label="Season" className="w-40" selectedKeys={[season]} onChange={(e) => patch({ season: e.target.value })}>
          {[
            { value: 'all', label: 'All Seasons' },
            { value: 'Halloween', label: 'Halloween' },
            { value: 'Christmas', label: 'Christmas' },
            { value: 'Shared', label: 'Shared' },
          ].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <Select aria-label="Default" className="w-40" selectedKeys={[isDefault]} onChange={(e) => patch({ default: e.target.value })}>
          {[
            { value: 'all', label: 'All Templates' },
            { value: 'true', label: 'Default Only' },
            { value: 'false', label: 'Custom Only' },
          ].map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
      </div>

      <Table
        aria-label="Maintenance templates"
        selectionMode="single"
        onRowAction={(key) => navigate(`/schedules/${key}`)}
      >
        <TableHeader columns={COLUMNS}>{(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}</TableHeader>
        <TableBody items={filtered} emptyContent="No templates found">
          {(s) => {
            const type = (s.record_type || (s as any).task_type) as string;
            return (
              <TableRow key={s.schedule_id} className="cursor-pointer">
                <TableCell>
                  <Chip size="sm" variant="flat">
                    {s.class_type}
                  </Chip>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-tiny">{s.short_name}</span>
                </TableCell>
                <TableCell>{s.title}</TableCell>
                <TableCell>
                  {getTaskTypeIcon(type)} {getCategoryLabel(type)}
                </TableCell>
                <TableCell>{formatFrequency(s.frequency, s.season)}</TableCell>
                <TableCell>
                  <Chip size="sm" color={s.enabled !== false ? 'success' : 'default'} variant="flat">
                    {s.enabled !== false ? 'Enabled' : 'Disabled'}
                  </Chip>
                </TableCell>
                <TableCell>
                  {s.is_default ? (
                    <Chip size="sm" color="primary" variant="flat">
                      Default
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
    </div>
  );
}
