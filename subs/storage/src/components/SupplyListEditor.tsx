import { Button, Input } from '@heroui/react';
import { Plus, Trash2 } from 'lucide-react';
import type { SupplyEntry } from '../config/storageConfig';

/**
 * Add/remove editor for a supply tote's free-text supply list
 * (name / quantity / notes). Mirrors the "Materials Used" pattern used in
 * the maintenance sub, minus react-hook-form — storage's forms are plain
 * useState arrays, so this stays consistent with that.
 */
export function SupplyListEditor({
  supplies,
  onChange,
  disabled,
}: {
  supplies: SupplyEntry[];
  onChange: (next: SupplyEntry[]) => void;
  disabled?: boolean;
}) {
  function updateRow(index: number, field: keyof SupplyEntry, value: string) {
    const next = supplies.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange(next);
  }

  function addRow() {
    onChange([...supplies, { name: '', quantity: '', notes: '' }]);
  }

  function removeRow(index: number) {
    onChange(supplies.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      {supplies.length === 0 && (
        <p className="text-sm text-default-400">No supplies added yet.</p>
      )}
      {supplies.map((supply, index) => (
        <div key={index} className="flex items-end gap-2">
          <Input
            label="Name"
            size="sm"
            value={supply.name}
            onValueChange={(v) => updateRow(index, 'name', v)}
            isDisabled={disabled}
          />
          <Input
            label="Quantity"
            size="sm"
            value={supply.quantity ?? ''}
            onValueChange={(v) => updateRow(index, 'quantity', v)}
            isDisabled={disabled}
          />
          <Input
            label="Notes"
            size="sm"
            value={supply.notes ?? ''}
            onValueChange={(v) => updateRow(index, 'notes', v)}
            isDisabled={disabled}
          />
          {!disabled && (
            <Button
              isIconOnly
              size="sm"
              color="danger"
              variant="light"
              onPress={() => removeRow(index)}
              aria-label="Remove supply"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
      ))}
      {!disabled && (
        <Button size="sm" variant="flat" startContent={<Plus size={14} />} onPress={addRow} className="self-start">
          Add Supply
        </Button>
      )}
    </div>
  );
}
