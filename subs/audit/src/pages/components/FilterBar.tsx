import { Select, SelectItem, Button } from '@heroui/react';
import { RotateCcw, Download } from 'lucide-react';
import { ENTITY_TYPES, OPERATIONS } from '../../lib/format';

const ENTITY_OPTIONS = [
  { key: '', label: 'All types' },
  ...Object.entries(ENTITY_TYPES).map(([k, v]) => ({ key: k, label: v.label })),
];

const OPERATION_OPTIONS = [
  { key: '', label: 'All operations' },
  ...Object.entries(OPERATIONS).map(([k, v]) => ({ key: k, label: v.label })),
];

export function FilterBar({
  entityType,
  operation,
  exporting,
  onEntityTypeChange,
  onOperationChange,
  onReset,
  onExport,
}: {
  entityType: string;
  operation: string;
  exporting: boolean;
  onEntityTypeChange: (value: string) => void;
  onOperationChange: (value: string) => void;
  onReset: () => void;
  onExport: () => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-default-200 bg-content1 p-4">
      <Select
        size="sm"
        variant="bordered"
        label="Entity Type"
        className="w-48"
        disallowEmptySelection
        selectedKeys={[entityType]}
        onChange={(e) => onEntityTypeChange(e.target.value)}
      >
        {ENTITY_OPTIONS.map((opt) => (
          <SelectItem key={opt.key}>{opt.label}</SelectItem>
        ))}
      </Select>

      <Select
        size="sm"
        variant="bordered"
        label="Operation"
        className="w-48"
        disallowEmptySelection
        selectedKeys={[operation]}
        onChange={(e) => onOperationChange(e.target.value)}
      >
        {OPERATION_OPTIONS.map((opt) => (
          <SelectItem key={opt.key}>{opt.label}</SelectItem>
        ))}
      </Select>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" variant="light" onPress={onReset} startContent={<RotateCcw size={16} />}>
          Reset
        </Button>
        <Button
          size="sm"
          color="secondary"
          variant="flat"
          onPress={onExport}
          isLoading={exporting}
          startContent={!exporting && <Download size={16} />}
        >
          Export all
        </Button>
      </div>
    </div>
  );
}
