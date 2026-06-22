import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  Input,
  Textarea,
  Select,
  SelectItem,
  RadioGroup,
  Radio,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from '@heroui/react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Breadcrumbs, LoadingState, ErrorState, Typography, useToast } from '@spookydecs/ui';
import { recordsAPI, itemsAPI } from '../api/maintenanceApi';
import { formatRecordType, type MaintenanceRecord, type Item } from '../config/maintenanceConfig';

interface Task {
  title: string;
  record_type: string;
  priority: string;
  description: string;
}

interface InspectionFormValues {
  inspector: string;
  inspection_date: string;
  result: string;
  findings: string;
  tasks: Task[];
  retirement_reason: string;
  disposal_method: string;
}

interface GeneratedTask {
  record_id: string;
  title: string;
  record_type: string;
  criticality: string;
}

export default function InspectionFormPage() {
  const { itemId = '', recordId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[] | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const { register, handleSubmit, control, watch, formState } = useForm<InspectionFormValues>({
    defaultValues: {
      inspector: 'SpookyDecs Ent',
      inspection_date: today,
      result: '',
      findings: '',
      tasks: [],
      retirement_reason: '',
      disposal_method: 'trash',
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'tasks' });
  const result = watch('result');

  useEffect(() => {
    (async () => {
      try {
        const rec = await recordsAPI.getById(recordId);
        setRecord(rec);
        if (rec.record_type !== 'inspection') {
          setBlocker('This is not an inspection record.');
        } else if (rec.status === 'completed' && rec.inspection_result) {
          setBlocker('This inspection has already been completed.');
        }
        setItem(await itemsAPI.getById(itemId).catch(() => null));
      } catch (err) {
        console.error('Failed to load inspection:', err);
        setBlocker('Failed to load inspection record.');
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId, recordId]);

  // Seed a first task when switching to maintenance_required (mirrors vanilla behavior).
  useEffect(() => {
    if (result === 'maintenance_required' && fields.length === 0) {
      append({ title: '', record_type: 'repair', priority: 'medium', description: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const onSubmit = async (values: InspectionFormValues) => {
    const payload: Record<string, unknown> = {
      inspector: values.inspector,
      inspection_date: values.inspection_date,
      result: values.result,
      findings: values.findings || '',
    };

    if (values.result === 'maintenance_required') {
      const tasks = values.tasks.filter((t) => t.title && t.record_type);
      if (tasks.length === 0) {
        toast.showError('At least one maintenance task is required');
        return;
      }
      payload.tasks = tasks;
    } else if (values.result === 'failed') {
      if (!values.retirement_reason) {
        toast.showError('Retirement reason is required');
        return;
      }
      payload.retirement_details = {
        reason: values.retirement_reason,
        disposal_method: values.disposal_method || 'trash',
      };
    } else if (!values.result) {
      toast.showError('Overall result is required');
      return;
    }

    try {
      const res = await recordsAPI.performInspection(recordId, payload);
      setGeneratedTasks(((res as any)?.generated_tasks as GeneratedTask[]) || []);
    } catch (err) {
      console.error('Failed to complete inspection:', err);
      toast.showError((err as Error).message || 'Failed to complete inspection');
    }
  };

  if (loading) return <LoadingState />;
  if (blocker) return <ErrorState message={blocker} />;
  if (!record) return <ErrorState message="Failed to load inspection record." />;

  if (generatedTasks) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CheckCircle2 size={56} className="text-success" />
        <Typography type="h3">Inspection Completed Successfully</Typography>
        <Typography type="body" className="text-default-500">
          The inspection has been recorded{generatedTasks.length > 0 ? ' and maintenance tasks were created.' : '.'}
        </Typography>
        {generatedTasks.length > 0 && (
          <Card className="w-full max-w-md text-left">
            <CardHeader>
              <Typography type="h5">Created Maintenance Tasks ({generatedTasks.length})</Typography>
            </CardHeader>
            <CardBody className="flex flex-col gap-2">
              {generatedTasks.map((t) => (
                <button
                  key={t.record_id}
                  className="flex justify-between rounded-medium p-2 text-left hover:bg-default-100"
                  onClick={() => navigate(`/${itemId}/${t.record_id}`)}
                >
                  <span>{t.title}</span>
                  <span className="text-tiny text-default-500">
                    {t.record_type} · {t.criticality}
                  </span>
                </button>
              ))}
            </CardBody>
          </Card>
        )}
        <div className="flex gap-2">
          <Button color="primary" onPress={() => navigate(`/${itemId}/${recordId}`)}>
            View Inspection Record
          </Button>
          <Button variant="flat" onPress={() => navigate(`/${itemId}`)}>
            Back to Item
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        crumbs={[
          { label: 'Maintenance', to: '/' }, { label: 'Records', to: '/records' },
          { label: itemId, to: `/${itemId}` },
          { label: record.title || recordId, to: `/${itemId}/${recordId}` },
          { label: 'Perform Inspection' },
        ]}
      />
      <Typography type="h3" className="mb-4">
        Perform Inspection
      </Typography>

      <Card className="mb-4">
        <CardHeader>
          <Typography type="h5">Inspection Details</Typography>
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
          <div className="flex justify-between">
            <span className="text-default-500">Item</span>
            <span>{(item?.name as string) || (item?.short_name as string) || itemId}</span>
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
            <Typography type="h5">Inspection Results</Typography>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <Input label="Inspector" isRequired {...register('inspector')} />
            <Input type="date" label="Date Performed" isRequired {...register('inspection_date')} />

            <Controller
              control={control}
              name="result"
              render={({ field }) => (
                <RadioGroup label="Overall Result" isRequired value={field.value} onValueChange={field.onChange}>
                  <Radio value="pass">✓ Pass — No issues found</Radio>
                  <Radio value="maintenance_required">⚠ Maintenance Required</Radio>
                  <Radio value="failed">✗ Failed — Retire Item</Radio>
                </RadioGroup>
              )}
            />

            <Textarea label="Findings / Notes" placeholder="Document your inspection findings…" minRows={3} {...register('findings')} />
          </CardBody>
        </Card>

        {result === 'maintenance_required' && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <Typography type="h5">Required Maintenance Tasks</Typography>
              <Button
                size="sm"
                variant="flat"
                startContent={<Plus size={14} />}
                onPress={() => append({ title: '', record_type: 'repair', priority: 'medium', description: '' })}
              >
                Add Task
              </Button>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {fields.map((f, index) => (
                <div key={f.id} className="flex flex-col gap-3 rounded-medium border border-default-200 p-3">
                  <div className="flex items-center justify-between">
                    <Typography type="h6">Task {index + 1}</Typography>
                    <Button isIconOnly size="sm" color="danger" variant="light" onPress={() => remove(index)} aria-label="Remove task">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input label="Title" isRequired size="sm" {...register(`tasks.${index}.title`)} />
                    <Controller
                      control={control}
                      name={`tasks.${index}.record_type`}
                      render={({ field }) => (
                        <Select
                          label="Type"
                          isRequired
                          size="sm"
                          selectedKeys={field.value ? [field.value] : []}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <SelectItem key="repair">Repair</SelectItem>
                          <SelectItem key="maintenance">Preventive Maintenance</SelectItem>
                        </Select>
                      )}
                    />
                    <Controller
                      control={control}
                      name={`tasks.${index}.priority`}
                      render={({ field }) => (
                        <Select
                          label="Criticality"
                          isRequired
                          size="sm"
                          selectedKeys={field.value ? [field.value] : []}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <SelectItem key="low">Low</SelectItem>
                          <SelectItem key="medium">Medium</SelectItem>
                          <SelectItem key="high">High</SelectItem>
                        </Select>
                      )}
                    />
                  </div>
                  <Textarea label="Description" size="sm" minRows={2} {...register(`tasks.${index}.description`)} />
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {result === 'failed' && (
          <Card>
            <CardHeader>
              <Typography type="h5">Item Retirement</Typography>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <Textarea
                label="Reason for Retirement"
                isRequired
                placeholder="Explain why this item is being retired…"
                minRows={3}
                {...register('retirement_reason')}
              />
              <Controller
                control={control}
                name="disposal_method"
                render={({ field }) => (
                  <Select
                    label="Disposal Method"
                    className="sm:max-w-xs"
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <SelectItem key="trash">Trash</SelectItem>
                    <SelectItem key="donate">Donate</SelectItem>
                    <SelectItem key="salvage">Salvage Parts</SelectItem>
                  </Select>
                )}
              />
            </CardBody>
          </Card>
        )}

        <Divider />
        <div className="flex gap-2">
          <Button color="primary" type="submit" isLoading={formState.isSubmitting}>
            Complete Inspection
          </Button>
          <Button variant="flat" onPress={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
