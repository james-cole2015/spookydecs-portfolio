const SWATCHES = [
  { className: 'border-secondary bg-secondary-50', label: 'Circuit source' },
  { className: 'border-default-400 border-dashed bg-content1', label: 'Cord / branch' },
  { className: 'border-warning bg-warning-50', label: 'Load — has power_data' },
  { className: 'border-default-300 border-dashed bg-default-50', label: 'Load — no power_data' },
];

/** Static left-column legend for the deployment schematic (#466 plan §2a). */
export default function GraphLegend() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-default-500">Legend</h2>
      {SWATCHES.map((s) => (
        <div key={s.label} className="flex items-center gap-2">
          <span className={`h-4 w-4 shrink-0 rounded border-2 ${s.className}`} />
          <span className="text-xs text-default-600">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
