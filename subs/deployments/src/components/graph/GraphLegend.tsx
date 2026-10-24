import { Cable, Flashlight, Ghost, Split, Zap, type LucideIcon } from 'lucide-react';

// Loudest tier first. Mirrors the badge shape / colour / glyph of each node component.
const ENTRIES: { Icon: LucideIcon; label: string; className: string; rounded?: string; size: number }[] = [
  { Icon: Zap, label: 'Circuit source', className: 'border-secondary bg-secondary-100 text-secondary', size: 28 },
  { Icon: Ghost, label: 'Decoration', className: 'border-primary bg-primary-100 text-primary', size: 28 },
  { Icon: Flashlight, label: 'Light', className: 'border-warning bg-warning-100 text-warning-600 ring-2 ring-warning/30', size: 24 },
  { Icon: Split, label: 'Plug / splitter', className: 'border-default-500 bg-content3 text-default-700', rounded: 'rounded-lg', size: 22 },
  { Icon: Cable, label: 'Cord', className: 'border-default-300 bg-default-100 text-default-500', size: 14 },
];

/** Static left-column legend for the deployment schematic (#466 plan §2a). Loudest tier first. */
export default function GraphLegend() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-default-500">Legend</h2>
      {ENTRIES.map(({ Icon, label, className, rounded, size }) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center border-2 ${rounded || 'rounded-full'} ${className}`}
          >
            <Icon size={size / 1.6} strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-xs text-default-600">{label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-default-300 bg-default-50 text-default-400">
          <Ghost size={16} strokeWidth={1.75} aria-hidden />
        </span>
        <span className="text-xs text-default-600">No power_data</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
          <span className="h-0 w-6 border-t-2 border-dashed border-default-400" />
        </span>
        <span className="text-xs text-default-600">Illuminates</span>
      </div>
    </div>
  );
}
