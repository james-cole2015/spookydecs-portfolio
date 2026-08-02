import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import {
  Input,
  Textarea,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
} from '@heroui/react';
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import { Breadcrumbs, LoadingState, ErrorState, Typography, useToast, usePhotoUpload } from '@spookydecs/ui';
import { recordsAPI, itemsAPI } from '../api/maintenanceApi';
import {
  getRecordTypeOptions,
  getCategoryOptions,
  generateSeasonBuckets,
  getDefaultBucket,
  RECORD_STATUSES,
  type MaintenanceRecord,
  type Item,
} from '../config/maintenanceConfig';

interface FormValues {
  item_id: string;
  record_type: string;
  category: string;
  status: string;
  title: string;
  description: string;
  criticality: string;
  date_scheduled: string;
  date_performed: string;
  performed_by: string;
  materials: { item: string; quantity: string; unit: string }[];
}

const CRITICALITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

export default function RecordFormPage() {
  const { itemId: routeItemId, recordId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { openWithEditor: openPhotoUpload, editor: photoEditor } = usePhotoUpload();
  const isEdit = !!recordId;
  const prefilledItemId = routeItemId || searchParams.get('item_id') || '';

  const [loading, setLoading] = useState(isEdit || !!prefilledItemId);
  const [loadError, setLoadError] = useState(false);
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Item search (create mode autocomplete)
  const [itemQuery, setItemQuery] = useState('');
  const [itemResults, setItemResults] = useState<Item[]>([]);

  const { register, handleSubmit, control, watch, setValue, reset, formState } = useForm<FormValues>({
    defaultValues: {
      item_id: prefilledItemId,
      record_type: '',
      category: '',
      status: '',
      title: '',
      description: '',
      criticality: '',
      date_scheduled: '',
      date_performed: '',
      performed_by: 'SpookyDecs Ent',
      materials: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'materials' });
  const recordType = watch('record_type');
  const status = watch('status');
  const criticality = watch('criticality');

  // Load record (edit) and/or prefilled item.
  useEffect(() => {
    (async () => {
      try {
        let loadedItem: Item | null = null;
        if (isEdit && recordId) {
          const rec = await recordsAPI.getById(recordId);
          setRecord(rec);
          reset({
            item_id: rec.item_id,
            record_type: rec.record_type || '',
            category: rec.category || '',
            status: rec.status || '',
            title: rec.title || '',
            description: rec.description || '',
            criticality: (rec.criticality as string) || '',
            date_scheduled: rec.date_scheduled || '',
            date_performed: rec.date_performed ? rec.date_performed.split('T')[0] : '',
            performed_by: rec.performed_by || 'SpookyDecs Ent',
            materials: (rec.materials_used as FormValues['materials']) || [],
          });
          loadedItem = await itemsAPI.getById(rec.item_id).catch(() => null);
        } else if (prefilledItemId) {
          loadedItem = await itemsAPI.getById(prefilledItemId).catch(() => null);
          if (loadedItem && loadedItem.season) {
            setValue('date_scheduled', getDefaultBucket(loadedItem.season as string));
          }
        }
        setSelectedItem(loadedItem);
      } catch (err) {
        console.error('Failed to load form:', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced item search for the create-mode autocomplete.
  useEffect(() => {
    if (isEdit || itemQuery.length < 2) {
      setItemResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const { items } = await itemsAPI.search(itemQuery);
        setItemResults(items);
      } catch {
        setItemResults([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [itemQuery, isEdit]);

  const categoryOptions = useMemo(() => getCategoryOptions(recordType), [recordType]);
  const bucketOptions = useMemo(
    () => generateSeasonBuckets(record?.date_scheduled ? [record.date_scheduled] : []),
    [record],
  );
  const showCriticality = recordType === 'repair' || !isEdit;

  const onSubmit = async (values: FormValues) => {
    // Validation (mirrors the vanilla handleSubmit guards).
    if (!values.item_id || !values.record_type || !values.category || !values.status || !values.title || !values.performed_by) {
      toast.showError('Please fill in all required fields');
      return;
    }
    if (values.category === 'Uncategorized') {
      toast.showError('Please select a valid category');
      return;
    }
    if (values.record_type === 'repair' && !values.criticality) {
      toast.showError('Criticality is required for repairs');
      return;
    }
    if (values.status === 'completed' && !values.date_performed) {
      toast.showError('Date Performed is required when status is Completed');
      return;
    }

    const data: Partial<MaintenanceRecord> = {
      item_id: values.item_id,
      record_type: values.record_type as MaintenanceRecord['record_type'],
      category: values.category,
      status: values.status as MaintenanceRecord['status'],
      title: values.title,
      description: values.description || '',
      performed_by: values.performed_by,
      materials_used: values.materials.filter((m) => m.item),
      cost_record_ids: record?.cost_record_ids || [],
      total_cost: record?.total_cost || 0,
      attachments: record?.attachments || { before_photos: [], after_photos: [], documentation: [] },
      date_scheduled: values.date_scheduled || undefined,
      date_performed: values.date_performed ? new Date(values.date_performed).toISOString() : undefined,
    };
    if (values.criticality) data.criticality = values.criticality as MaintenanceRecord['criticality'];

    try {
      let saved: MaintenanceRecord;
      if (isEdit && recordId) {
        (data as Record<string, unknown>).updated_by = values.performed_by;
        saved = await recordsAPI.update(recordId, data);
        toast.showSuccess('Record updated successfully');
      } else {
        saved = await recordsAPI.create(data);
        toast.showSuccess('Record created successfully');
      }
      navigate(`/${saved.item_id}/${saved.record_id}`);
    } catch (err) {
      console.error('Failed to save record:', err);
      toast.showError((err as Error).message || 'Failed to save record');
    }
  };

  const handleAddPhotos = async () => {
    const photos = await openPhotoUpload({
      context: 'maintenance',
      photo_type: recordType || 'maintenance',
      season: (selectedItem?.season as string) || 'shared',
      entityId: recordId,
    });
    const ids = photos.map((p) => p.photo_id);
    if (ids.length > 0) {
      setRecord((prev) => {
        const base = prev ?? ({} as MaintenanceRecord);
        const attachments = { ...(base.attachments || { before_photos: [], after_photos: [], documentation: [] }) };
        attachments.documentation = [
          ...(attachments.documentation || []),
          ...ids.map((id) => ({ photo_id: id, photo_type: recordType || 'maintenance' })),
        ];
        return { ...base, attachments } as MaintenanceRecord;
      });
      toast.showSuccess(`${ids.length} photo${ids.length !== 1 ? 's' : ''} attached`);
    }
  };

  if (loading) return <LoadingState />;
  if (loadError) return <ErrorState message="Unable to load the record form." />;

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        crumbs={[
          { label: 'Maintenance', to: '/' }, { label: 'Records', to: '/records' },
          { label: isEdit ? 'Edit Record' : 'Create Record' },
        ]}
      />
      <Typography type="h3" className="mb-4">
        {isEdit ? 'Edit' : 'Create'} Maintenance Record
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Item */}
        <Card>
          <CardHeader>
            <Typography type="h5">Item Details</Typography>
          </CardHeader>
          <CardBody>
            {isEdit || prefilledItemId ? (
              <Input label="Item ID" value={watch('item_id')} isReadOnly description={
                selectedItem ? `${selectedItem.short_name || ''} · ${[selectedItem.class, selectedItem.class_type, selectedItem.season].filter(Boolean).join(' · ')}` : undefined
              } />
            ) : (
              <Controller
                control={control}
                name="item_id"
                rules={{ required: true }}
                render={({ field }) => (
                  <Autocomplete
                    label="Item ID"
                    isRequired
                    placeholder="Search for item…"
                    inputValue={itemQuery || field.value}
                    onInputChange={(v) => setItemQuery(v)}
                    selectedKey={field.value || null}
                    onSelectionChange={(key) => {
                      const id = key ? String(key) : '';
                      field.onChange(id);
                      const found = itemResults.find((i) => (i.id || i.item_id) === id) || null;
                      setSelectedItem(found);
                      if (found?.season) setValue('date_scheduled', getDefaultBucket(found.season as string));
                    }}
                    items={itemResults}
                  >
                    {(item) => (
                      <AutocompleteItem key={(item.id || item.item_id) as string}>
                        {`${item.id || item.item_id} — ${item.short_name || 'Unnamed Item'}`}
                      </AutocompleteItem>
                    )}
                  </Autocomplete>
                )}
              />
            )}
          </CardBody>
        </Card>

        {/* Record information */}
        <Card>
          <CardHeader>
            <Typography type="h5">Record Information</Typography>
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
              name="status"
              render={({ field }) => (
                <Select
                  label="Status"
                  isRequired
                  className="sm:max-w-xs"
                  selectedKeys={field.value ? [field.value] : []}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  {RECORD_STATUSES.filter((s) => s.value !== 'cancelled').map((o) => (
                    <SelectItem key={o.value}>{o.label}</SelectItem>
                  ))}
                </Select>
              )}
            />

            <Input label="Title" isRequired placeholder="Brief description of the work" {...register('title')} />
            <Textarea label="Description" placeholder="Detailed description…" minRows={3} {...register('description')} />

            {showCriticality && (
              <Controller
                control={control}
                name="criticality"
                render={({ field }) => (
                  <Select
                    label={recordType === 'repair' ? 'Criticality (required for repairs)' : 'Criticality (optional)'}
                    className="sm:max-w-xs"
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {CRITICALITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value}>{o.label}</SelectItem>
                    ))}
                  </Select>
                )}
              />
            )}
            {criticality === 'critical' && (
              <div className="rounded-medium border-l-4 border-warning bg-warning-50 p-3 text-tiny text-warning-700">
                <strong>⚠️ Warning:</strong> Critical indicates the item is not deployable and will mark the item
                status as Inactive.
              </div>
            )}
          </CardBody>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <Typography type="h5">Scheduling</Typography>
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Controller
                control={control}
                name="date_scheduled"
                render={({ field }) => (
                  <Select
                    label="Season Bucket"
                    description="Which season is this work scheduled for?"
                    selectedKeys={field.value ? [field.value] : []}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    {bucketOptions.map((b) => (
                      <SelectItem key={b}>{b}</SelectItem>
                    ))}
                  </Select>
                )}
              />
              <Input
                type="date"
                label={status === 'completed' ? 'Date Performed (required)' : 'Date Performed'}
                description="When was this work actually completed?"
                {...register('date_performed')}
              />
            </div>
            <Input label="Performed By" isRequired placeholder="Name of person performing work" {...register('performed_by')} />
          </CardBody>
        </Card>

        {/* Materials */}
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

        {/* Photos (edit only) */}
        {isEdit && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <Typography type="h5">Photos</Typography>
              <Button size="sm" variant="flat" startContent={<ImageIcon size={14} />} onPress={handleAddPhotos}>
                Add Photos
              </Button>
            </CardHeader>
            <CardBody>
              <p className="text-tiny text-default-500">
                {(record?.attachments?.documentation?.length || 0) +
                  (record?.attachments?.before_photos?.length || 0) +
                  (record?.attachments?.after_photos?.length || 0)}{' '}
                photo(s) attached. New uploads are added on save.
              </p>
            </CardBody>
          </Card>
        )}

        <Divider />
        <div className="flex gap-2">
          <Button color="primary" type="submit" isLoading={formState.isSubmitting}>
            {isEdit ? 'Update Record' : 'Create Record'}
          </Button>
          <Button variant="flat" onPress={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
      {photoEditor}
    </div>
  );
}
