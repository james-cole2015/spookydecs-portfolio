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
  useDisclosure,
} from '@heroui/react';
import { Pencil, Trash2, Wrench } from 'lucide-react';
import {
  Breadcrumbs,
  LoadingState,
  ErrorState,
  Typography,
  PhotoGallery,
  useToast,
  ConfirmDialog,
} from '@spookydecs/ui';
import { recordsAPI, itemsAPI } from '../api/maintenanceApi';
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  formatScheduledDate,
  getStatusChip,
  getCriticalityChip,
  getRecordTypeChip,
  getCategoryLabel,
  type MaintenanceRecord,
  type Item,
} from '../config/maintenanceConfig';
import CostsPanel from '../components/CostsPanel';

// Key/value field — HeroUI has no description-list primitive, so this mirrors the
// house pattern (audit/storage): muted uppercase label + value on a fixed label
// column so the value sits next to the label (no justify-between whitespace).
// `wide` spans both grid columns for long text (description/notes/materials).
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
    <div className={`grid grid-cols-[132px_1fr] items-baseline gap-3 ${wide ? 'sm:col-span-2' : ''}`}>
      <dt className="text-xs uppercase tracking-wide text-default-500">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}

export default function RecordDetailPage() {
  const { itemId = '', recordId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deleteDisc = useDisclosure();

  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const rec = await recordsAPI.getById(recordId);
        setRecord(rec);
        const it = await itemsAPI.getById(itemId).catch(() => null);
        setItem(it);
      } catch (err) {
        console.error('Failed to load record:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId, recordId]);

  const handleDelete = async () => {
    if (!record) return;
    try {
      setDeleting(true);
      await recordsAPI.delete(recordId);
      toast.showSuccess('Record deleted successfully');
      navigate('/records');
    } catch (err) {
      console.error('Failed to delete record:', err);
      toast.showError(`Failed to delete record: ${(err as Error).message}`);
      setDeleting(false);
      deleteDisc.onClose();
    }
  };

  if (loading) return <LoadingState />;
  if (error || !record) return <ErrorState message="The maintenance record could not be found." />;

  const status = getStatusChip(record.status);
  const crit = getCriticalityChip(record.criticality as string);
  const type = getRecordTypeChip(record.record_type);
  const isInspection = record.record_type === 'inspection';

  return (
    <div>
      <Breadcrumbs
        crumbs={[
          { label: 'Maintenance', to: '/' }, { label: 'Records', to: '/records' },
          { label: itemId, to: `/${itemId}` },
          { label: record.title || recordId },
        ]}
      />

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Typography type="h3">{record.title || 'Untitled Record'}</Typography>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip size="sm" color={type.color} variant="flat">
              {type.label}
            </Chip>
            <Chip size="sm" color={status.color} variant="flat">
              {status.label}
            </Chip>
            <Chip size="sm" color={crit.color} variant="flat">
              {crit.label}
            </Chip>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="flat"
            startContent={<Wrench size={16} />}
            onPress={() =>
              navigate(`/${itemId}/${recordId}/${isInspection ? 'perform-inspection' : 'perform-repair'}`)
            }
          >
            {isInspection ? 'Perform Inspection' : 'Perform Repair'}
          </Button>
          <Button variant="flat" startContent={<Pencil size={16} />} onPress={() => navigate(`/${itemId}/${recordId}/edit`)}>
            Edit
          </Button>
          <Button color="danger" variant="flat" startContent={<Trash2 size={16} />} onPress={deleteDisc.onOpen}>
            Delete
          </Button>
        </div>
      </div>

      <Tabs aria-label="Record detail" className="mb-4">
        <Tab key="details" title="Details">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <Typography type="h5">Overview</Typography>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
                  <Field label="Type" value={<Chip size="sm" color={type.color} variant="flat">{type.label}</Chip>} />
                  <Field label="Status" value={<Chip size="sm" color={status.color} variant="flat">{status.label}</Chip>} />
                  <Field label="Category" value={record.category ? getCategoryLabel(record.category) : '—'} />
                  <Field label="Criticality" value={<Chip size="sm" color={crit.color} variant="flat">{crit.label}</Chip>} />
                  <Field label="Item" value={<span className="font-mono text-tiny">{record.item_id}</span>} />
                  <Field label="Performed By" value={record.performed_by || '—'} />
                  <Field label="Estimated Cost" value={formatCurrency(record.estimated_cost)} />
                  <Field label="Total Cost" value={formatCurrency(record.total_cost)} />
                  {record.schedule_id && (
                    <Field label="From Schedule" value={record.schedule_title || record.schedule_id} />
                  )}
                  {record.occurrence_number != null && <Field label="Occurrence" value={`#${record.occurrence_number}`} />}
                  <Field label="Record ID" value={<span className="font-mono text-tiny">{record.record_id}</span>} wide />
                  <Field label="Description" value={record.description || '—'} wide />
                  {record.inspection_result && <Field label="Inspection" value={record.inspection_result} wide />}
                  {record.notes && <Field label="Notes" value={record.notes} wide />}
                  {Array.isArray(record.materials_used) && record.materials_used.length > 0 && (
                    <Field
                      label="Materials"
                      wide
                      value={
                        <div className="flex flex-wrap gap-1">
                          {record.materials_used.map((m, i) => (
                            <Chip key={i} size="sm" variant="flat">
                              {m.item}
                              {m.quantity ? ` × ${m.quantity}` : ''}
                              {m.unit ? ` ${m.unit}` : ''}
                            </Chip>
                          ))}
                        </div>
                      }
                    />
                  )}
                </dl>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <Typography type="h5">Scheduling & Timestamps</Typography>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
                  <Field label="Season Bucket" value={formatScheduledDate(record.date_scheduled)} />
                  <Field label="Created" value={formatDateTime(record.created_at)} />
                  <Field label="Updated" value={formatDateTime(record.updated_at)} />
                  {record.completed_at && <Field label="Completed" value={formatDateTime(record.completed_at)} />}
                </dl>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="costs" title="Costs">
          <CostsPanel itemId={itemId} />
        </Tab>

        <Tab key="photos" title="Photos">
          <PhotoGallery
            context="maintenance"
            entityId={record.record_id}
            season={(item?.season as string) || 'shared'}
            photoType={record.record_type || 'maintenance'}
          />
        </Tab>
      </Tabs>

      <ConfirmDialog
        isOpen={deleteDisc.isOpen}
        title="Delete record?"
        body={
          <p className="whitespace-pre-line">
            {`Delete this ${record.record_type} record?\n\nTitle: ${record.title}\n\nThis action cannot be undone.`}
          </p>
        }
        confirmLabel="Delete"
        isDestructive
        isLoading={deleting}
        onConfirm={handleDelete}
        onClose={deleteDisc.onClose}
      />
    </div>
  );
}
