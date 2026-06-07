import { useEffect, useState } from 'react';
import { Input, Textarea, Select, SelectItem } from '@heroui/react';
import STORAGE_CONFIG, { getFormFields, getFieldOptions, validateField, type FormField } from '../config/storageConfig';
import { itemsAPI, type ItemRecord } from '../api/storageApi';

export type FormData = Record<string, string>;

/**
 * Renders the storage create/edit fields for a given class type, driven by
 * STORAGE_CONFIG.FORM_FIELDS. For Self units the `item-select` field is an
 * unpacked-items dropdown scoped to the chosen season.
 */
export function StorageForm({
  classType,
  data,
  errors,
  onChange,
}: {
  classType: string;
  data: FormData;
  errors: Record<string, string>;
  onChange: (next: FormData) => void;
}) {
  const fields = getFormFields(classType);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const season = data.season;

  useEffect(() => {
    let active = true;
    if (classType === 'Self' && season) {
      itemsAPI
        .getUnpacked(season)
        .then((res) => active && setItems(res))
        .catch(() => active && setItems([]));
    } else {
      setItems([]);
    }
    return () => {
      active = false;
    };
  }, [classType, season]);

  function set(name: string, value: string) {
    onChange({ ...data, [name]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.map((field: FormField) => {
        const value = data[field.name] ?? '';
        const error = errors[field.name];

        if (field.type === 'select') {
          const options = getFieldOptions(field.options ?? '');
          return (
            <Select
              key={field.name}
              label={field.label}
              isRequired={field.required}
              description={field.helpText}
              selectedKeys={value ? [value] : []}
              onChange={(e) => set(field.name, e.target.value)}
              isInvalid={Boolean(error)}
              errorMessage={error}
            >
              {options.map((opt) => (
                <SelectItem key={opt}>{opt}</SelectItem>
              ))}
            </Select>
          );
        }

        if (field.type === 'item-select') {
          return (
            <Select
              key={field.name}
              label={field.label}
              isRequired={field.required}
              description={season ? field.helpText : 'Select a season first'}
              isDisabled={!season}
              selectedKeys={value ? [value] : []}
              onChange={(e) => set(field.name, e.target.value)}
              isInvalid={Boolean(error)}
              errorMessage={error}
            >
              {items.map((item) => (
                <SelectItem key={item.id}>{`${(item.short_name as string) ?? item.id} (${item.id})`}</SelectItem>
              ))}
            </Select>
          );
        }

        if (field.type === 'textarea') {
          return (
            <Textarea
              key={field.name}
              label={field.label}
              isRequired={field.required}
              placeholder={field.placeholder}
              description={field.helpText}
              value={value}
              onValueChange={(v) => set(field.name, v)}
              isInvalid={Boolean(error)}
              errorMessage={error}
            />
          );
        }

        return (
          <Input
            key={field.name}
            label={field.label}
            isRequired={field.required}
            placeholder={field.placeholder}
            description={field.helpText}
            value={value}
            onValueChange={(v) => set(field.name, v)}
            isInvalid={Boolean(error)}
            errorMessage={error}
          />
        );
      })}
    </div>
  );
}

/** Validate the visible fields for a class type. Returns a name→message map. */
export function validateForm(classType: string, data: FormData): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of getFormFields(classType)) {
    const value = (data[field.name] ?? '').trim();
    if (field.required && !value) {
      errors[field.name] = `${field.label} is required`;
      continue;
    }
    if (value && STORAGE_CONFIG.VALIDATION[field.name]) {
      const res = validateField(field.name, value);
      if (!res.valid) errors[field.name] = res.message ?? 'Invalid value';
    }
  }
  return errors;
}
