// Item edit page (#332)
// Write-path rules: class/class_type immutable (never sent); PUT for structural fields;
// PATCH only for short_name/season/status/search_text.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, Card, CardBody, Divider, Image } from '@heroui/react';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, Typography, useToast, useAuth } from '@spookydecs/ui';
import { fetchItemById, updateItem } from '../api/itemsApi';
import { type Item, type StorageData } from '../api/types';
import { BasicFields, ClassSpecificFields, VendorFields, StorageFields } from '../components/ItemFormFields';
import { type ItemFormValues, DEFAULT_VALUES } from '../components/ItemFormSchema';

function itemToFormValues(item: Item): Partial<ItemFormValues> {
  const storage = item.storage_data ?? {} as StorageData;
  const vendor  = item.vendor_metadata ?? {};
  return {
    short_name:           item.short_name ?? '',
    season:               item.season ?? '',
    status:               item.status ?? '',
    date_acquired:        item.date_acquired ?? '',
    general_notes:        item.general_notes ?? '',
    height_length:        item.height_length ?? '',
    stakes:               String(item.stakes ?? ''),
    tethers:              String(item.tethers ?? ''),
    adapter:              item.adapter ?? '',
    power_inlet:          item.power_inlet ?? false,
    color:                item.color ?? '',
    bulb_type:            item.bulb_type ?? '',
    length:               item.length ?? '',
    male_ends:            String(item.male_ends ?? ''),
    female_ends:          String(item.female_ends ?? ''),
    watts:                item.watts ?? '',
    amps:                 item.amps ?? '',
    vendor_cost:          String(vendor.cost ?? ''),
    vendor_value:         String(vendor.value ?? ''),
    vendor_manufacturer:  vendor.manufacturer ?? '',
    vendor_store:         vendor.vendor_store ?? '',
    storage_tote_id:      storage.tote_id ?? '',
    storage_location:     storage.location ?? '',
  };
}

function buildUpdatePayload(data: ItemFormValues, existing: Item): Record<string, any> {
  // class / class_type are immutable — never include them.
  const payload: Record<string, any> = {
    short_name:    data.short_name,
    season:        data.season,
    status:        data.status,
    date_acquired: data.date_acquired || undefined,
    general_notes: data.general_notes || undefined,
  };

  // Class-specific fields
  if (data.height_length) payload.height_length = data.height_length;
  if (data.stakes)        payload.stakes        = data.stakes;
  if (data.tethers)       payload.tethers       = data.tethers;
  if (data.adapter)       payload.adapter       = data.adapter;
  payload.power_inlet = data.power_inlet;
  if (data.color)         payload.color         = data.color;
  if (data.bulb_type)     payload.bulb_type     = data.bulb_type;
  if (data.length)        payload.length        = data.length;
  if (data.male_ends)     payload.male_ends     = data.male_ends;
  if (data.female_ends)   payload.female_ends   = data.female_ends;
  if (data.watts)         payload.watts         = data.watts;
  if (data.amps)          payload.amps          = data.amps;

  // Vendor metadata
  payload.vendor_metadata = {
    cost:          data.vendor_cost        || undefined,
    value:         data.vendor_value       || undefined,
    manufacturer:  data.vendor_manufacturer || undefined,
    vendor_store:  data.vendor_store       || undefined,
  };

  // Storage data — preserve existing fields the edit form doesn't own
  const existingStorage = existing.storage_data ?? {} as StorageData;
  payload.storage_data = {
    packable:      existingStorage.packable,
    single_packed: existingStorage.single_packed,
    is_stored:     existingStorage.is_stored,
    tote_id:       data.storage_tote_id || existingStorage.tote_id,
    location:      data.storage_location || existingStorage.location,
  };

  return payload;
}

export default function EditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { hasMinRole } = useAuth();
  const [item, setItem]     = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, reset, watch, setValue, handleSubmit, formState: { errors } } = useForm<ItemFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchItemById(id, true)
      .then((fetched) => {
        setItem(fetched);
        reset({ ...DEFAULT_VALUES, ...itemToFormValues(fetched) });
      })
      .catch((e: any) => setError(e?.message ?? 'Failed to load item.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasMinRole('builder')) {
    return (
      <div className="p-4">
        <p className="text-danger">Insufficient permissions.</p>
        <Button className="mt-4" onPress={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }
  if (loading) return <LoadingState />;
  if (error || !item) return <ErrorState message={error ?? 'Item not found.'} />;

  async function onSubmit(data: ItemFormValues) {
    if (!item) return;
    setSaving(true);
    try {
      const payload = buildUpdatePayload(data, item);
      const updated = await updateItem(item.id, payload);
      toast.showSuccess('Saved.');
      setTimeout(() => navigate(`/${(updated as any).id ?? item.id}`), 800);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Breadcrumbs crumbs={[{ label: 'Items', to: '/' }, { label: item.short_name, to: `/${item.id}` }, { label: 'Edit' }]} />
      <div className="flex items-center gap-4 mb-6">
        {item.images?.cloudfront_url ? (
          <Image src={item.images.cloudfront_url} alt={item.short_name} className="w-16 h-16 rounded-lg object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-default-100 flex items-center justify-center text-3xl">📦</div>
        )}
        <div>
          <PageHeader title="Edit Item" />
          <Typography type="body-sm" className="text-foreground-500">{item.short_name} — {item.class} / {item.class_type}</Typography>
          <Typography type="body-xs" className="text-foreground-400">{item.id}</Typography>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="mb-4">
          <CardBody className="flex flex-col gap-6">
            <div>
              <Typography type="h6" className="mb-3">Basic Information</Typography>
              <BasicFields register={register} errors={errors} showStatus />
            </div>
            <Divider />
            <div>
              <Typography type="h6" className="mb-3">{item.class} / {item.class_type} Details</Typography>
              <ClassSpecificFields
                classType={item.class_type}
                register={register}
                errors={errors}
                setValue={setValue}
                watch={watch}
              />
            </div>
            <Divider />
            <div>
              <Typography type="h6" className="mb-3">Vendor Information</Typography>
              <VendorFields register={register} />
            </div>
            <Divider />
            <div>
              <Typography type="h6" className="mb-3">Storage Information</Typography>
              <StorageFields register={register} />
            </div>
          </CardBody>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button variant="flat" type="button" onPress={() => navigate(`/${item.id}`)}>Cancel</Button>
          <Button color="primary" type="submit" isLoading={saving}>Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
