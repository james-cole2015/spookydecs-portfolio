// Dynamic form fields driven by class_type — used in wizard (step 3) and edit form (#332)
// react-hook-form: register/errors/setValue passed in from the parent form context.
import { Input, Select, SelectItem, Checkbox } from '@heroui/react';
import { type UseFormRegister, type FieldErrors, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { CLASS_TYPE_ATTRIBUTES, FIELD_METADATA, SEASONS, ITEM_STATUS } from '../config/itemsConfig';
import { type ItemFormValues } from './ItemFormSchema';

interface BasicFieldsProps {
  register: UseFormRegister<ItemFormValues>;
  setValue: UseFormSetValue<ItemFormValues>;
  watch: UseFormWatch<ItemFormValues>;
  errors: FieldErrors<ItemFormValues>;
  showStatus?: boolean;
}

export function BasicFields({ register, setValue, watch, errors, showStatus }: BasicFieldsProps) {
  // HeroUI Select does not integrate with RHF via register() or Controller (both
  // leave the value unset). Drive it from form state with watch + setValue — the
  // same pattern the storage/gallery selects use. register() here only attaches
  // the required rule; the value is written by setValue on selection.
  register('season', { required: 'Season is required.' });
  const season = watch('season');
  const status = watch('status');
  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Item Name"
        isRequired
        {...register('short_name')}
        isInvalid={!!errors.short_name}
        errorMessage={errors.short_name?.message}
      />
      <Select
        label="Season"
        isRequired
        selectedKeys={season ? [season] : []}
        onChange={(e) => setValue('season', e.target.value, { shouldValidate: true })}
        isInvalid={!!errors.season}
        errorMessage={errors.season?.message}
      >
        {SEASONS.map((s) => <SelectItem key={s.value}>{s.icon} {s.label}</SelectItem>)}
      </Select>
      {showStatus && (
        <Select
          label="Status"
          selectedKeys={status ? [status] : []}
          onChange={(e) => e.target.value && setValue('status', e.target.value, { shouldValidate: true })}
          disallowEmptySelection
        >
          {ITEM_STATUS.map((s) => <SelectItem key={s.value}>{s.label}</SelectItem>)}
        </Select>
      )}
      <Input label="Date Acquired" placeholder="Year (e.g. 2023)" {...register('date_acquired')} />
      <Input label="Notes" placeholder="Any additional notes" {...register('general_notes')} />
    </div>
  );
}

interface ClassSpecificFieldsProps {
  classType: string;
  register: UseFormRegister<ItemFormValues>;
  errors: FieldErrors<ItemFormValues>;
  setValue: UseFormSetValue<ItemFormValues>;
  watch: (name: string) => any;
}

export function ClassSpecificFields({ classType, register, errors, setValue, watch }: ClassSpecificFieldsProps) {
  const attrs = CLASS_TYPE_ATTRIBUTES[classType];
  if (!attrs || attrs.fields.length === 0) {
    return <p className="text-sm text-foreground-500">No additional fields for this type.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {attrs.fields.map((field) => {
        const meta = FIELD_METADATA[field];
        if (!meta) return null;

        if (meta.type === 'checkbox') {
          return (
            <Checkbox
              key={field}
              {...register(field as keyof ItemFormValues)}
            >
              {meta.label}
            </Checkbox>
          );
        }

        const key = field as keyof ItemFormValues;
        return (
          <Input
            key={field}
            label={meta.label}
            placeholder={meta.placeholder}
            isRequired={attrs.required.includes(field)}
            endContent={meta.suffix ? <span className="text-foreground-400 text-sm">{meta.suffix}</span> : undefined}
            {...register(key)}
            isInvalid={!!errors[key]}
            errorMessage={(errors[key] as any)?.message}
          />
        );
      })}
    </div>
  );
}

interface VendorFieldsProps {
  register: UseFormRegister<ItemFormValues>;
}

export function VendorFields({ register }: VendorFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Input label="Cost" placeholder="Purchase price" {...register('vendor_cost')} />
      <Input label="Current Value" placeholder="Estimated current value" {...register('vendor_value')} />
      <Input label="Manufacturer" placeholder="Brand or manufacturer" {...register('vendor_manufacturer')} />
      <Input label="Store" placeholder="Where purchased" {...register('vendor_store')} />
    </div>
  );
}

interface StorageFieldsProps {
  register: UseFormRegister<ItemFormValues>;
}

export function StorageFields({ register }: StorageFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <Input label="Storage Tote ID" placeholder="e.g. TOTE 004" {...register('storage_tote_id')} />
      <Input label="Storage Location" placeholder="e.g. Shed, Crawl Space" {...register('storage_location')} />
    </div>
  );
}
