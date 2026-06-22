import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Tabs,
  Tab,
  Button,
  Chip,
  Card,
  CardBody,
  CardHeader,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Spinner,
  useDisclosure,
} from '@heroui/react';
import { Pencil, Trash2, RefreshCw, ArrowRight } from 'lucide-react';
import { Breadcrumbs, LoadingState, ErrorState, EmptyState, Typography, useToast } from '@spookydecs/ui';
import { scheduleAPI, itemsAPI } from '../api/maintenanceApi';
import {
  formatDate,
  formatScheduledDate,
  formatFrequency,
  getCategoryLabel,
  getTaskTypeIcon,
  getStatusChip,
  formatCurrency,
  type ScheduleTemplate,
  type MaintenanceRecord,
  type Item,
} from '../config/maintenanceConfig';
import ConfirmDialog from '../components/ConfirmDialog';

function appliedTemplates(item: Item): string[] {
  const m = (item.maintenance as any) || {};
  return [
    ...(m.inspection_data?.applied_templates || []),
    ...(m.maintenance_data?.applied_templates || []),
  ];
}

// Key/value field — matches the record-detail house pattern: muted uppercase label
// on a fixed column so the value sits adjacent (no justify-between whitespace).
function Field({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={`grid grid-cols-[150px_1fr] items-baseline gap-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs uppercase tracking-wide text-default-500">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

export default function ScheduleDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deleteDisc = useDisclosure();

  const [schedule, setSchedule] = useState<ScheduleTemplate | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [itemsUsing, setItemsUsing] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, recs] = await Promise.all([scheduleAPI.getById(id), scheduleAPI.getRecords(id)]);
      setSchedule(s);
      setRecords(recs);
      setError(false);
    } catch (err) {
      console.error('Failed to load schedule:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Lazy-load items using this template once the schedule is known.
  useEffect(() => {
    if (!schedule) return;
    (async () => {
      try {
        const allItems = await itemsAPI.getAll();
        setItemsUsing(allItems.filter((item) => appliedTemplates(item).includes(id)));
      } catch (err) {
        console.error('Failed to load items:', err);
        setItemsUsing([]);
      }
    })();
  }, [schedule, id]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const result: any = await scheduleAPI.delete(id);
      toast.showSuccess(
        `${result?.template_name || 'Template'} deleted. ${result?.cancelled_records ?? 0} future record(s) cancelled.`,
      );
      navigate('/schedules');
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast.showError('Failed to delete template');
      setDeleting(false);
      deleteDisc.onClose();
    }
  };

  const handleGenerate = async () => {
    const input = window.prompt('How many additional records would you like to generate?', '2');
    if (!input) return;
    const count = parseInt(input, 10);
    if (isNaN(count) || count < 1 || count > 10) {
      toast.showError('Please enter a number between 1 and 10');
      return;
    }
    try {
      setGenerating(true);
      const result: any = await scheduleAPI.generateRecords(id, count);
      toast.showSuccess(`Created ${result?.records?.length ?? count} new maintenance record(s)`);
      await load();
    } catch (err) {
      console.error('Failed to generate records:', err);
      toast.showError('Failed to generate records');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !schedule) return <ErrorState message="Unable to load schedule details." />;

  const upcoming = records.filter((r) => r.status !== 'completed');
  const completed = records.filter((r) => r.status === 'completed');
  const pendingCount = records.filter((r) => r.status === 'scheduled').length;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Maintenance', to: '/' }, { label: 'Templates', to: '/schedules' }, { label: schedule.title || id }]} />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography type="h3">{schedule.title}</Typography>
          <div className="mt-2 flex flex-wrap gap-2">
            {schedule.is_default ? (
              <Chip size="sm" color="primary" variant="flat">
                Default Template
              </Chip>
            ) : (
              <Chip size="sm" variant="flat">
                Custom Template
              </Chip>
            )}
            <Chip size="sm" color={schedule.enabled !== false ? 'success' : 'default'} variant="flat">
              {schedule.enabled !== false ? 'Enabled' : 'Disabled'}
            </Chip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="flat" startContent={<ArrowRight size={16} />} onPress={() => navigate(`/schedules/${id}/apply`)}>
            Apply to Items
          </Button>
          <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={generating} onPress={handleGenerate}>
            Generate
          </Button>
          <Button variant="flat" startContent={<Pencil size={16} />} onPress={() => navigate(`/schedules/${id}/edit`)}>
            Edit
          </Button>
          <Button color="danger" variant="flat" startContent={<Trash2 size={16} />} onPress={deleteDisc.onOpen}>
            Delete
          </Button>
        </div>
      </div>

      <Tabs aria-label="Schedule detail">
        <Tab key="overview" title="Overview">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <Typography type="h5">Template Information</Typography>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
                  <Field label="Class Type" value={<Chip size="sm" variant="flat">{schedule.class_type}</Chip>} />
                  <Field
                    label="Type"
                    value={`${getTaskTypeIcon((schedule.record_type || (schedule as any).task_type) as string)} ${getCategoryLabel((schedule.record_type || (schedule as any).task_type) as string)}`}
                  />
                  <Field label="Short Name" value={<span className="font-mono text-tiny">{schedule.short_name}</span>} />
                  <Field label="Frequency" value={formatFrequency(schedule.frequency, schedule.season)} />
                  <Field label="Auto-Apply" value={schedule.is_default ? 'Yes' : 'No'} />
                  <Field label="Reminder" value={`${schedule.days_before_reminder} days before due`} />
                  {!!schedule.estimated_cost && <Field label="Estimated Cost" value={formatCurrency(schedule.estimated_cost)} />}
                  {!!schedule.estimated_duration_minutes && (
                    <Field label="Est. Duration" value={`${schedule.estimated_duration_minutes} minutes`} />
                  )}
                  <Field label="Created" value={formatDate(schedule.created_at as string)} />
                  <Field
                    label="Last Updated"
                    value={`${formatDate(schedule.updated_at as string)}${schedule.updated_by ? ` by ${schedule.updated_by}` : ''}`}
                  />
                  <Field label="Template ID" value={<span className="font-mono text-tiny">{schedule.schedule_id}</span>} wide />
                  {schedule.description && <Field label="Description" value={schedule.description} wide />}
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Typography type="h5">Generated Maintenance Records ({records.length})</Typography>
              </CardHeader>
              <CardBody className="flex flex-col gap-4">
                {records.length === 0 ? (
                  <p className="text-default-500">No maintenance records have been generated from this schedule yet.</p>
                ) : (
                  <>
                    {upcoming.length > 0 && <RecordsTable title={`Upcoming (${upcoming.length})`} records={upcoming} navigate={navigate} />}
                    {completed.length > 0 && <RecordsTable title={`Completed (${completed.length})`} records={completed} navigate={navigate} />}
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="items" title={`Items${itemsUsing ? ` (${itemsUsing.length})` : ''}`}>
          {itemsUsing === null ? (
            <div className="flex justify-center py-10">
              <Spinner label="Loading items…" />
            </div>
          ) : itemsUsing.length === 0 ? (
            <EmptyState
              title="No Items Using This Template"
              message="This template hasn't been applied to any items yet."
            />
          ) : (
            <Table
              aria-label="Items using template"
              selectionMode="single"
              onRowAction={(key) => navigate(`/${key}`)}
            >
              <TableHeader>
                <TableColumn>Item ID</TableColumn>
                <TableColumn>Name</TableColumn>
                <TableColumn>Class Type</TableColumn>
                <TableColumn>Season</TableColumn>
                <TableColumn>Status</TableColumn>
              </TableHeader>
              <TableBody items={itemsUsing}>
                {(item) => (
                  <TableRow key={(item.id || item.item_id) as string} className="cursor-pointer">
                    <TableCell>
                      <span className="font-mono text-tiny">{(item.id || item.item_id) as string}</span>
                    </TableCell>
                    <TableCell>{(item.name || item.short_name || 'Unnamed Item') as string}</TableCell>
                    <TableCell>{(item.class_type as string) || 'Unknown'}</TableCell>
                    <TableCell>{(item.season as string) || 'Unknown'}</TableCell>
                    <TableCell>
                      <Chip size="sm" color={item.enabled === false ? 'default' : 'success'} variant="flat">
                        {item.enabled === false ? 'Disabled' : 'Active'}
                      </Chip>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </Tab>
      </Tabs>

      <ConfirmDialog
        isOpen={deleteDisc.isOpen}
        title="Delete template?"
        message={`Delete Template: ${schedule.title}?\n\nThis will remove the template, cancel ${pendingCount} pending record(s), and keep completed history.\n\nThis action cannot be undone.`}
        confirmLabel="Delete"
        isLoading={deleting}
        onConfirm={handleDelete}
        onCancel={deleteDisc.onClose}
      />
    </div>
  );
}

function RecordsTable({
  title,
  records,
  navigate,
}: {
  title: string;
  records: MaintenanceRecord[];
  navigate: (to: string) => void;
}) {
  const sorted = [...records].sort((a, b) => {
    const aDate = a.date_performed || a.date_scheduled || a.created_at || '';
    const bDate = b.date_performed || b.date_scheduled || b.created_at || '';
    return new Date(aDate).getTime() - new Date(bDate).getTime();
  });
  return (
    <div>
      <Typography type="h6" className="mb-2">
        {title}
      </Typography>
      <Table
        aria-label={title}
        selectionMode="single"
        onRowAction={(key) => {
          const rec = sorted.find((r) => r.record_id === key);
          if (rec?.item_id) navigate(`/${rec.item_id}/${rec.record_id}`);
        }}
      >
        <TableHeader>
          <TableColumn>Occurrence</TableColumn>
          <TableColumn>Item ID</TableColumn>
          <TableColumn>Season / Date</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Performed By</TableColumn>
        </TableHeader>
        <TableBody items={sorted}>
          {(record) => {
            const status = getStatusChip(record.status);
            return (
              <TableRow key={record.record_id} className="cursor-pointer">
                <TableCell>#{record.occurrence_number || '—'}</TableCell>
                <TableCell>
                  <span className="font-mono text-tiny">{record.item_id || 'N/A'}</span>
                </TableCell>
                <TableCell>
                  {record.date_scheduled
                    ? formatScheduledDate(record.date_scheduled)
                    : formatDate(record.date_performed || record.created_at)}
                </TableCell>
                <TableCell>
                  <Chip size="sm" color={status.color} variant="flat">
                    {status.label}
                  </Chip>
                </TableCell>
                <TableCell>{record.performed_by || '—'}</TableCell>
              </TableRow>
            );
          }}
        </TableBody>
      </Table>
    </div>
  );
}
