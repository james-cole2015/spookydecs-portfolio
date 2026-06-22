import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import {
  Input,
  Textarea,
  Select,
  SelectItem,
  Switch,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from '@heroui/react';
import { Breadcrumbs, LoadingState, ErrorState, Typography, useToast } from '@spookydecs/ui';
import { scheduleAPI } from '../api/maintenanceApi';
import {
  getRecordTypeOptions,
  getCategoryOptions,
  getFrequencyOptions,
  getSeasonOptions,
  generateSeasonBuckets,
  validateScheduleData,
  calculateNextDueDate,
  formatDate,
  type ScheduleTemplate,
} from '../config/maintenanceConfig';

const CLASS_TYPES = [
  { value: 'INFLATABLE', label: 'Inflatable' },
  { value: 'ANIMATRONIC', label: 'Animatronic' },
  { value: 'PROJECTION', label: 'Projection' },
  { value: 'STATIC_PROP', label: 'Static Prop' },
  { value: 'LIGHTING', label: 'Lighting' },
  { value: 'SOUND', label: 'Sound Equipment' },
  { value: 'CONTROLLER', label: 'Controller' },
  { value: 'OTHER', label: 'Other' },
];

interface ScheduleFormValues {
  class_type: string;
  short_name: string;
  is_default: boolean;
  record_type: string;
  category: string;
  enabled: boolean;
  title: string;
  description: string;
  frequency: string;
  season: string;
  start_date: string;
  estimated_cost: string;
  estimated_duration_minutes: string;
  days_before_reminder: string;
}

export default function ScheduleFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState(false);

  const { register, handleSubmit, control, watch, setValue, reset, formState } = useForm<ScheduleFormValues>({
    defaultValues: {
      class_type: '',
      short_name: '',
      is_default: false,
      record_type: '',
      category: '',
      enabled: true,
      title: '',
      description: '',
      frequency: '',
      season: '',
      start_date: '',
      estimated_cost: '',
      estimated_duration_minutes: '',
      days_before_reminder: '7',
    },
  });

  const recordType = watch('record_type');
  const frequency = watch('frequency');
  const season = watch('season');
  const classType = watch('class_type');
  const needsSeason = frequency === 'seasonal' || frequency === 'pre_season';
  const categoryOptions = useMemo(() => getCategoryOptions(recordType), [recordType]);
  const bucketOptions = useMemo(() => generateSeasonBuckets([]), []);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const s = await scheduleAPI.getById(id);
        reset({
          class_type: s.class_type || '',
          short_name: s.short_name || '',
          is_default: !!s.is_default,
          record_type: s.record_type || (s as any).task_type || '',
          category: s.category || '',
          enabled: s.enabled !== false,
          title: s.title || '',
          description: s.description || '',
          frequency: s.frequency || '',
          season: s.season || '',
          start_date: (s.start_date as string) || '',
          estimated_cost: s.estimated_cost != null ? String(s.estimated_cost) : '',
          estimated_duration_minutes:
            s.estimated_duration_minutes != null ? String(s.estimated_duration_minutes) : '',
          days_before_reminder: s.days_before_reminder != null ? String(s.days_before_reminder) : '7',
        });
      } catch (err) {
        console.error('Failed to load template:', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, reset]);

  const nextDuePreview = useMemo(() => {
    if (!frequency || !recordType || !classType) return null;
    try {
      return calculateNextDueDate(frequency, new Date(), season || null, recordType);
    } catch {
      return null;
    }
  }, [frequency, recordType, classType, season]);

  const onSubmit = async (values: ScheduleFormValues) => {
    const data: Partial<ScheduleTemplate> = {
      class_type: values.class_type,
      record_type: values.record_type as ScheduleTemplate['record_type'],
      category: values.category,
      short_name: values.short_name,
      title: values.title,
      description: values.description || '',
      frequency: values.frequency as ScheduleTemplate['frequency'],
      season: (values.season || undefined) as ScheduleTemplate['season'],
      start_date: values.start_date || undefined,
      is_default: values.is_default,
      enabled: values.enabled,
      estimated_cost: parseFloat(values.estimated_cost) || 0,
      estimated_duration_minutes: parseInt(values.estimated_duration_minutes) || undefined,
      days_before_reminder: parseInt(values.days_before_reminder) || 7,
    };

    const validation = validateScheduleData(data);
    if (!validation.valid) {
      toast.showError(validation.errors.join(', '));
      return;
    }

    try {
      let result: any;
      if (isEdit && id) {
        result = await scheduleAPI.update(id, data);
        const updated = result?.updated_records || 0;
        toast.showSuccess(updated > 0 ? `Template updated. ${updated} pending records updated.` : 'Template updated successfully');
      } else {
        result = await scheduleAPI.create(data);
        toast.showSuccess('Template created successfully');
      }
      const newId = result?.schedule?.schedule_id || id;
      navigate(`/schedules/${newId}`);
    } catch (err) {
      console.error('Failed to save template:', err);
      toast.showError((err as Error).message || 'Failed to save template');
    }
  };

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message="Unable to load the template form." />;

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        crumbs={[
          { label: 'Maintenance', to: '/' }, { label: 'Templates', to: '/schedules' },
          { label: isEdit ? 'Edit Template' : 'Create Template' },
        ]}
      />
      <Typography type="h3" className="mb-1">
        {isEdit ? 'Edit' : 'Create'} Maintenance Template
      </Typography>
      <Typography type="body-sm" className="mb-4 text-default-500">
        Templates define recurring maintenance tasks for a class of items.
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <Typography type="h5">Template Information</Typography>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="class_type"
                render={({ field }) => (
                  <Select
                    label="Class Type"
                    isRequired
                    description="Type of decoration this template applies to"
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {CLASS_TYPES.map((t) => (
                      <SelectItem key={t.value}>{t.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              <Controller
                control={control}
                name="short_name"
                render={({ field }) => (
                  <Input
                    label="Short Name"
                    isRequired
                    placeholder="e.g., VISUAL, MOTOR, SEAM"
                    description="Uppercase letters, numbers, and underscores only"
                    value={field.value}
                    onValueChange={(v) => field.onChange(v.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  />
                )}
              />
            </div>
            <Controller
              control={control}
              name="is_default"
              render={({ field }) => (
                <Switch isSelected={field.value} onValueChange={field.onChange}>
                  Set as default (auto-apply to new items of this class)
                </Switch>
              )}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Typography type="h5">Task Details</Typography>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="record_type"
                render={({ field }) => (
                  <Select
                    label="Record Type"
                    isRequired
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => {
                      field.onChange(e.target.value);
                      setValue('category', '');
                    }}
                  >
                    {getRecordTypeOptions().map((o) => (
                      <SelectItem key={o.value}>{o.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              {recordType && (
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      label="Category"
                      isRequired
                      selectedKeys={field.value ? [field.value] : []}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {categoryOptions.map((o) => (
                        <SelectItem key={o.value}>{o.label}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              )}
            </div>
            <Controller
              control={control}
              name="enabled"
              render={({ field }) => (
                <Switch isSelected={field.value} onValueChange={field.onChange}>
                  {field.value ? 'Enabled' : 'Disabled'}
                </Switch>
              )}
            />
            <Input label="Title" isRequired placeholder="e.g., Annual Fabric Inspection" {...register('title')} />
            <Textarea label="Description" placeholder="Detailed instructions…" minRows={3} {...register('description')} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Typography type="h5">Schedule Frequency</Typography>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select
                    label="Frequency"
                    isRequired
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {getFrequencyOptions().map((o) => (
                      <SelectItem key={o.value}>{o.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              {needsSeason && (
                <Controller
                  control={control}
                  name="season"
                  render={({ field }) => (
                    <Select
                      label="Season"
                      isRequired
                      selectedKeys={field.value ? [field.value] : []}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      {getSeasonOptions().map((o) => (
                        <SelectItem key={o.value}>{o.label}</SelectItem>
                      ))}
                    </Select>
                  )}
                />
              )}
            </div>
            <Controller
              control={control}
              name="start_date"
              render={({ field }) => (
                <Select
                  label="Start Season (optional)"
                  description="Leave blank to start when applied to items."
                  selectedKeys={field.value ? [field.value] : []}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  {bucketOptions.map((b) => (
                    <SelectItem key={b}>{b}</SelectItem>
                  ))}
                </Select>
              )}
            />
            <div className="rounded-medium border-l-4 border-default-300 bg-default-100 p-3 text-tiny text-default-600">
              <strong>Note:</strong> Repairs and maintenance tasks are automatically scheduled within the April 1 –
              September 30 work window. Inspections can be scheduled during the deployment season.
            </div>
            {nextDuePreview && (
              <div className="rounded-medium border border-secondary-200 bg-secondary-50 p-3 text-tiny text-secondary-700">
                <strong>Next scheduled task:</strong> {formatDate(nextDuePreview.toISOString())}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <Typography type="h5">Estimates & Reminders</Typography>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input type="number" label="Estimated Cost ($)" min="0" step="0.01" placeholder="0.00" {...register('estimated_cost')} />
            <Input type="number" label="Estimated Duration (min)" min="0" placeholder="60" {...register('estimated_duration_minutes')} />
            <Input type="number" label="Days Before Reminder" min="1" max="90" {...register('days_before_reminder')} />
          </CardBody>
        </Card>

        <Divider />
        <div className="flex gap-2">
          <Button color="primary" type="submit" isLoading={formState.isSubmitting}>
            {isEdit ? 'Update Template' : 'Create Template'}
          </Button>
          <Button variant="flat" onPress={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
