import { useEffect, useState } from 'react';
import { Input, Select, SelectItem, Textarea, Checkbox, Button } from '@heroui/react';
import { Save, X } from 'lucide-react';
import {
  COST_TYPES,
  FORM_DEFAULTS,
  SUBCATEGORIES,
  getCategoriesForCostType,
  getRelatedIdConfig,
  validateCostRecord,
  calculateTotalCost,
  calculateValue,
} from '../config/financeConfig';
import { RelatedEntitySearch } from './RelatedEntitySearch';

export interface CostFormInitial {
  related_item_id?: string;
  related_record_id?: string;
  related_idea_id?: string;
  cost_type?: string;
  category?: string;
}

// Single-item cost entry form (replaces the vanilla CostFormFields + CostFormRenderers).
// Validation reuses validateCostRecord verbatim; the parent owns the review-modal +
// create flow via onSubmit.
export function CostForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: CostFormInitial;
  onSubmit: (formData: Record<string, any>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>({ ...FORM_DEFAULTS, ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isGift = form.is_gift === true || form.is_gift === 'true';

  const set = (patch: Record<string, any>) => setForm((prev) => ({ ...prev, ...patch }));

  // Keep total_cost / value derived from quantity & unit_cost for non-gift records.
  useEffect(() => {
    if (isGift) return;
    const total = calculateTotalCost(form.unit_cost ?? 0, form.quantity ?? 1);
    setForm((prev) => ({ ...prev, total_cost: total, value: calculateValue(false, total, prev.tax) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.unit_cost, form.quantity, isGift]);

  const categories = form.cost_type ? getCategoriesForCostType(form.cost_type) : [];
  const subOptions = form.category && SUBCATEGORIES[form.category] ? SUBCATEGORIES[form.category] : null;
  const relatedConfig = getRelatedIdConfig(form.cost_type);

  const onCostTypeChange = (value: string) => {
    set({ cost_type: value, category: '', subcategory: '' });
  };
  const onCategoryChange = (value: string) => {
    set({ category: value, subcategory: '' });
  };

  const handleSubmit = () => {
    const validation = validateCostRecord(form);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});
    onSubmit(form);
  };

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Item Name"
          labelPlacement="outside"
          isRequired
          value={form.item_name ?? ''}
          onValueChange={(v) => set({ item_name: v })}
          isInvalid={!!errors.item_name}
          errorMessage={errors.item_name}
        />
        <Input
          type="date"
          label="Cost Date"
          labelPlacement="outside"
          isRequired
          value={form.cost_date ?? ''}
          onValueChange={(v) => set({ cost_date: v })}
          isInvalid={!!errors.cost_date}
          errorMessage={errors.cost_date}
        />
        <Select
          label="Cost Type"
          labelPlacement="outside"
          isRequired
          placeholder="Select Type"
          selectedKeys={form.cost_type ? [form.cost_type] : []}
          onChange={(e) => onCostTypeChange(e.target.value)}
          isInvalid={!!errors.cost_type}
          errorMessage={errors.cost_type}
        >
          {COST_TYPES.map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        <div className="flex items-end pb-2">
          <Checkbox isSelected={isGift} onValueChange={(v) => set({ is_gift: v })}>
            This was a gift
          </Checkbox>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Category"
          labelPlacement="outside"
          isRequired
          placeholder={form.cost_type ? 'Select Category' : 'Select a Cost Type first'}
          isDisabled={!form.cost_type}
          selectedKeys={form.category ? [form.category] : []}
          onChange={(e) => onCategoryChange(e.target.value)}
          isInvalid={!!errors.category}
          errorMessage={errors.category}
        >
          {categories.map((o) => (
            <SelectItem key={o.value}>{o.label}</SelectItem>
          ))}
        </Select>
        {subOptions && (
          <Select
            label="Subcategory"
            labelPlacement="outside"
            placeholder="Select Subcategory"
            selectedKeys={form.subcategory ? [form.subcategory] : []}
            onChange={(e) => set({ subcategory: e.target.value })}
          >
            {subOptions.map((s) => (
              <SelectItem key={s}>{s}</SelectItem>
            ))}
          </Select>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Store"
          labelPlacement="outside"
          isRequired
          value={form.vendor ?? ''}
          onValueChange={(v) => set({ vendor: v })}
          isInvalid={!!errors.vendor}
          errorMessage={errors.vendor}
        />
        {form.cost_type === 'acquisition' && (
          <Input
            label="Manufacturer"
            labelPlacement="outside"
            isRequired
            value={form.manufacturer ?? ''}
            onValueChange={(v) => set({ manufacturer: v })}
            isInvalid={!!errors.manufacturer}
            errorMessage={errors.manufacturer}
          />
        )}
        <Input
          type="date"
          label="Purchase Date"
          labelPlacement="outside"
          value={form.purchase_date ?? ''}
          onValueChange={(v) => set({ purchase_date: v })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Input
          type="number"
          label="Quantity"
          labelPlacement="outside"
          min={0}
          step="0.01"
          value={String(form.quantity ?? '')}
          onValueChange={(v) => set({ quantity: v })}
        />
        <Input
          type="number"
          label="Unit Cost"
          labelPlacement="outside"
          min={0}
          step="0.01"
          value={String(form.unit_cost ?? '')}
          onValueChange={(v) => set({ unit_cost: v })}
        />
        <Input
          type="number"
          label="Total Cost"
          labelPlacement="outside"
          isRequired={!isGift}
          min={0}
          step="0.01"
          value={String(form.total_cost ?? '')}
          onValueChange={(v) => {
            set({ total_cost: v });
            if (!isGift) set({ value: calculateValue(false, v, form.tax) });
          }}
          isInvalid={!!errors.total_cost}
          errorMessage={errors.total_cost}
        />
        <Input
          type="number"
          label="Tax"
          labelPlacement="outside"
          min={0}
          step="0.01"
          value={String(form.tax ?? '')}
          onValueChange={(v) => set({ tax: v })}
        />
        <Input
          type="number"
          label="Value"
          labelPlacement="outside"
          isRequired={isGift}
          isReadOnly={!isGift}
          min={0}
          step="0.01"
          value={String(form.value ?? '')}
          onValueChange={(v) => set({ value: v })}
          isInvalid={!!errors.value}
          errorMessage={errors.value}
        />
        <Input label="Currency" labelPlacement="outside" value="USD" isDisabled />
      </div>

      {relatedConfig && (
        <RelatedEntitySearch
          costType={form.cost_type}
          category={form.category}
          selectedId={form[relatedConfig.field]}
          error={errors[relatedConfig.field]}
          onSelect={(sel) => {
            if (!sel) {
              set({ [relatedConfig.field]: '', [`${relatedConfig.field}_name`]: '' });
              return;
            }
            const patch: Record<string, any> = {
              [relatedConfig.field]: sel.id,
              [`${relatedConfig.field}_name`]: sel.name,
            };
            if (relatedConfig.endpoint.includes('/maintenance-records') && sel.itemId) {
              patch.related_item_id = sel.itemId;
            }
            set(patch);
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4">
        <Textarea
          label="Description"
          labelPlacement="outside"
          value={form.description ?? ''}
          onValueChange={(v) => set({ description: v })}
        />
        <Textarea
          label="Notes"
          labelPlacement="outside"
          value={form.notes ?? ''}
          onValueChange={(v) => set({ notes: v })}
        />
      </div>

      <div>
        <Checkbox isSelected={form.no_receipt === true} onValueChange={(v) => set({ no_receipt: v })}>
          No receipt available
        </Checkbox>
        <p className="ml-7 text-tiny text-default-500">
          Check this if the receipt was lost, never issued, or this was a gift.
        </p>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="flat" startContent={<X size={16} />} onPress={onCancel}>
          Cancel
        </Button>
        <Button type="submit" color="primary" startContent={<Save size={16} />}>
          Review &amp; Submit
        </Button>
      </div>
    </form>
  );
}
