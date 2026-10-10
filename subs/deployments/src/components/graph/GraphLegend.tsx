const SWATCHES = [
  { className: 'rounded border-secondary bg-secondary-50', label: 'Circuit source' },
  { className: 'rounded-md border-primary bg-primary-50', label: 'Decoration' },
  { className: 'rounded border-warning bg-warning-50', label: 'Light' },
  { className: 'rounded border-default-500 bg-content2', label: 'Plug / splitter' },
  { className: 'rounded-full border-default-300 bg-default-50 border', label: 'Cord' },
  { className: 'rounded border-default-300 border-dashed bg-default-50', label: 'No power_data' },
];

/** Static left-column legend for the deployment schematic (#466 plan §2a). Loudest tier first. */
export default function GraphLegend() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-default-500">Legend</h2>
      {SWATCHES.map((s) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className={`h-4 w-4 shrink-0 border-2 ${s.className}`} />
          <span className="text-xs text-default-600">{s.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="h-0 w-4 shrink-0 border-t-2 border-dashed border-default-400" />
        <span className="text-xs text-default-600">Illuminates</span>
      </div>
    </div>
  );
}
