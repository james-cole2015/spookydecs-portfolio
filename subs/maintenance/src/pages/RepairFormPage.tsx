import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Input,
  Textarea,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
} from '@heroui/react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs, LoadingState, ErrorState, Typography, useToast } from '@spookydecs/ui';
import { recordsAPI, itemsAPI } from '../api/maintenanceApi';
import {
  formatRecordType,
  getCriticalityChip,
  type MaintenanceRecord,
  type Item,
} from '../config/maintenanceConfig';

interface RepairFormValues {
  performed_by: string;
  date_performed: string;
  repair_notes: string;
  materials: { item: string; quantity: string; unit: string }[];
}

export default function RepairFormPage() {
  const { itemId = '', recordId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const { register, handleSubmit, control, formState } = useForm<RepairFormValues>({
    defaultValues: { performed_by: 'SpookyDecs Ent', date_performed: today, repair_notes: '', materials: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'materials' });

  useEffect(() => {
    (async () => {
      try {
        const rec = await recordsAPI.getById(recordId);
        setRecord(rec);
        if (rec.record_type !== 'repair') {
          setBlocker('This is not a repair record.');
        } else if (rec.status === 'completed') {
          setBlocker('This repair has already been completed.');
        }
        setItem(await itemsAPI.getById(itemId).catch(() => null));
      } catch (err) {
        console.error('Failed to load repair record:', err);
        setBlocker('Failed to load repair record.');
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId, recordId]);

  const onSubmit = async (values: RepairFormValues) => {
    try {
      await recordsAPI.performRepair(recordId, {
        performed_by: values.performed_by,
        date_performed: values.date_performed,
        repair_notes: values.repair_notes || '',
        materials_used: values.materials.filter((m) => m.item),
      });
      setDone(true);
    } catch (err) {
      console.error('Failed to complete repair:', err);
      toast.showError((err as Error).message || 'Failed to complete repair');
    }
  };

  if (loading) return <LoadingState />;
  if (blocker) return <ErrorState message={blocker} />;
  if (!record) return <ErrorState message="Failed to load repair record." />;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 size={56} className="text-success" />
        <Typography type="h3">Repair Completed Successfully</Typography>
        <Typography type="body" className="text-default-500">
          The repair record has been closed and the item's repair status has been cleared.
        </Typography>
        <div className="flex gap-2">
          <Button color="primary" onPress={() => navigate(`/${itemId}/${recordId}`)}>
            View Repair Record
          </Button>
          <Button variant="flat" onPress={() => navigate(`/${itemId}`)}>
            Back to Item
          </Button>
        </div>
      </div>
    );
  }

  const crit = getCriticalityChip(record.criticality as string);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        crumbs={[
          { label: 'Maintenance', to: '/' }, { label: 'Records', to: '/records' },
          { label: itemId, to: `/${itemId}` },
          { label: record.title || recordId, to: `/${itemId}/${recordId}` },
          { label: 'Perform Repair' },
        ]}
      />
      <Typography type="h3" className="mb-4">
        Perform Repair
      </Typography>

      <Card className="mb-4">
        <CardHeader>
          <Typography type="h5">Repair Details</Typography>
        </CardHeader>
        <CardBody className="flex flex-col gap-2">
          <div className="flex justify-between">
            <span className="text-default-500">Title</span>
            <span>{record.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-default-500">Type</span>
            <span>{formatRecordType(record.record_type)}</span>
          </div>
          {record.criticality && (
            <div className="flex justify-between">
              <span className="text-default-500">Criticality</span>
              <Chip size="sm" color={crit.color} variant="flat">
                {crit.label}
              </Chip>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-default-500">Item</span>
            <span>{(item?.short_name as string) || itemId}</span>
          </div>
          {record.description && (
            <div className="flex flex-col gap-1">
              <span className="text-default-500">Description</span>
              <span>{record.description}</span>
            </div>
          )}
        </CardBody>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <Typography type="h5">Repair Results</Typography>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <Input label="Performed By" isRequired {...register('performed_by')} />
            <Input type="date" label="Date Performed" isRequired {...register('date_performed')} />
            <Textarea label="Repair Notes" placeholder="Describe what was repaired…" minRows={3} {...register('repair_notes')} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <Typography type="h5">Materials Used</Typography>
            <Button size="sm" variant="flat" startContent={<Plus size={14} />} onPress={() => append({ item: '', quantity: '', unit: '' })}>
              Add Material
            </Button>
          </CardHeader>
          <CardBody className="flex flex-col gap-3">
            {fields.length === 0 && <p className="text-default-400">No materials added yet</p>}
            {fields.map((f, index) => (
              <div key={f.id} className="flex items-end gap-2">
                <Input label="Item" size="sm" {...register(`materials.${index}.item`)} />
                <Input label="Quantity" size="sm" {...register(`materials.${index}.quantity`)} />
                <Input label="Unit" size="sm" {...register(`materials.${index}.unit`)} />
                <Button isIconOnly size="sm" color="danger" variant="light" onPress={() => remove(index)} aria-label="Remove material">
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>

        <Divider />
        <div className="flex gap-2">
          <Button color="primary" type="submit" isLoading={formState.isSubmitting}>
            Complete Repair
          </Button>
          <Button variant="flat" onPress={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
