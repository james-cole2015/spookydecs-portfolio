// 4-step item creation wizard (#332)
// Step 1: Class → Step 2: Class Type → Step 3: Details → Step 4: Review + Save
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button, Card, CardBody, Divider } from '@heroui/react';
import { Breadcrumbs, PageHeader, Typography, useToast, useAuth } from '@spookydecs/ui';
import { CLASS_HIERARCHY, TYPE_ICONS, getClassIcon } from '../config/itemsConfig';
import { BasicFields, ClassSpecificFields, VendorFields, StorageFields } from '../components/ItemFormFields';
import { type ItemFormValues, DEFAULT_VALUES } from '../components/ItemFormSchema';
import { buildCreatePayload, createItem } from '../api/itemsApi';

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Class', 'Type', 'Details', 'Review'] as const;

export default function CreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasMinRole } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  const { register, control, watch, setValue, handleSubmit, getValues, formState: { errors } } = useForm<ItemFormValues>({
    defaultValues: DEFAULT_VALUES,
  });

  const selectedClass     = watch('class');
  const selectedClassType = watch('class_type');

  if (!hasMinRole('builder')) {
    return (
      <div className="p-4 max-w-xl mx-auto">
        <p className="text-danger">Insufficient permissions to create items.</p>
        <Button className="mt-4" onPress={() => navigate('/')}>Go Back</Button>
      </div>
    );
  }

  function selectClass(cls: string) {
    setValue('class', cls);
    // Reset downstream if class changed
    if (cls !== selectedClass) {
      setValue('class_type', '');
      setStep(2);
    } else {
      setStep(2);
    }
  }

  function selectClassType(type: string) {
    setValue('class_type', type);
    setStep(3);
  }

  async function onSave(data: ItemFormValues) {
    setSaving(true);
    try {
      const payload = buildCreatePayload(data);
      // createItem resolves the { preview, confirmation } wrapper — there is no top-level
      // `id` on it, so navigating to `/${item.id}` landed on `/undefined` → "item not found"
      // (#446). Route back to the items list on success instead; the new record shows there.
      await createItem(payload);
      toast.showSuccess('Item created!');
      navigate('/items');
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to create item.');
    } finally {
      setSaving(false);
    }
  }

  const classTypes = selectedClass ? CLASS_HIERARCHY[selectedClass]?.types ?? [] : [];

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Breadcrumbs crumbs={[{ label: 'Items', to: '/' }, { label: 'Create Item' }]} />
      <PageHeader title="Create Item" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEP_LABELS.map((label, i) => {
          const n = (i + 1) as Step;
          const isActive    = step === n;
          const isCompleted = step > n;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 ${isActive ? 'text-primary font-semibold' : isCompleted ? 'text-success' : 'text-foreground-400'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isActive ? 'border-primary bg-primary text-white' : isCompleted ? 'border-success bg-success text-white' : 'border-default-300'}`}>
                  {isCompleted ? '✓' : n}
                </span>
                <span className="text-sm">{label}</span>
              </div>
              {i < STEP_LABELS.length - 1 && <div className="h-px w-6 bg-default-200" />}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSave)}>
        {/* Step 1 — Select Class */}
        {step >= 1 && (
          <Card className="mb-4">
            <CardBody>
              <Typography type="h6" className="mb-3">1. Select Item Class</Typography>
              <div className="grid grid-cols-3 gap-3">
                {Object.keys(CLASS_HIERARCHY).map((cls) => (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => selectClass(cls)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${selectedClass === cls ? 'border-primary bg-primary/10' : 'border-default-200 hover:border-primary/50'}`}
                  >
                    <span className="text-3xl">{CLASS_HIERARCHY[cls].icon}</span>
                    <span className="text-sm font-medium">{cls}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 2 — Select Class Type */}
        {step >= 2 && selectedClass && (
          <Card className="mb-4">
            <CardBody>
              <Typography type="h6" className="mb-3">2. Select {selectedClass} Type</Typography>
              <div className="grid grid-cols-3 gap-3">
                {classTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => selectClassType(type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${selectedClassType === type ? 'border-primary bg-primary/10' : 'border-default-200 hover:border-primary/50'}`}
                  >
                    <span className="text-3xl">{TYPE_ICONS[type] ?? '📦'}</span>
                    <span className="text-sm font-medium text-center">{type}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 3 — Details */}
        {step >= 3 && selectedClassType && (
          <Card className="mb-4">
            <CardBody className="flex flex-col gap-6">
              <div>
                <Typography type="h6" className="mb-3">3. Basic Information</Typography>
                <BasicFields register={register} control={control} errors={errors} showStatus={false} />
              </div>
              <Divider />
              <div>
                <Typography type="h6" className="mb-3">{selectedClass} Details</Typography>
                <ClassSpecificFields
                  classType={selectedClassType}
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
              <div className="flex justify-end">
                <Button color="primary" type="button" onPress={() => setStep(4)}>
                  Review →
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Step 4 — Review + Save */}
        {step >= 4 && (
          <Card className="mb-4">
            <CardBody>
              <Typography type="h6" className="mb-3">4. Review & Confirm</Typography>
              <ReviewSummary values={getValues()} />
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="flat" type="button" onPress={() => setStep(3)}>← Back</Button>
                <Button color="primary" type="submit" isLoading={saving}>
                  💾 Save Item
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </form>
    </div>
  );
}

function ReviewSummary({ values }: { values: ItemFormValues }) {
  const rows: [string, string][] = [
    ['Class',     values.class],
    ['Type',      values.class_type],
    ['Name',      values.short_name],
    ['Season',    values.season],
    ['Status',    values.status],
  ];
  if (values.date_acquired)      rows.push(['Date Acquired',  values.date_acquired]);
  if (values.general_notes)      rows.push(['Notes',          values.general_notes]);
  if (values.height_length)      rows.push(['Height/Length',  `${values.height_length} ft`]);
  if (values.stakes)             rows.push(['Stakes',         values.stakes]);
  if (values.tethers)            rows.push(['Tethers',        values.tethers]);
  if (values.color)              rows.push(['Color',          values.color]);
  if (values.bulb_type)          rows.push(['Bulb Type',      values.bulb_type]);
  if (values.length)             rows.push(['Length',         `${values.length} ft`]);
  if (values.male_ends)          rows.push(['Male Ends',      values.male_ends]);
  if (values.female_ends)        rows.push(['Female Ends',    values.female_ends]);
  if (values.watts)              rows.push(['Watts',          values.watts]);
  if (values.amps)               rows.push(['Amps',           values.amps]);
  if (values.vendor_cost)        rows.push(['Cost',           `$${values.vendor_cost}`]);
  if (values.vendor_value)       rows.push(['Value',          `$${values.vendor_value}`]);
  if (values.vendor_manufacturer)rows.push(['Manufacturer',   values.vendor_manufacturer]);
  if (values.vendor_store)       rows.push(['Store',          values.vendor_store]);
  if (values.storage_tote_id)    rows.push(['Tote ID',        values.storage_tote_id]);
  if (values.storage_location)   rows.push(['Location',       values.storage_location]);

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
      {rows.map(([label, val]) => (
        <div key={label} className="flex gap-2 text-sm py-1 border-b border-default-100 col-span-2 sm:col-span-1">
          <span className="text-foreground-500 min-w-[120px]">{label}:</span>
          <span className="font-medium">{val}</span>
        </div>
      ))}
    </div>
  );
}
