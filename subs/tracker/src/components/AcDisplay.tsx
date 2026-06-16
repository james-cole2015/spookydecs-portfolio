/**
 * AcDisplay — renders acceptance criteria, grouping `[dev]` / `[prod]` prefixed
 * items into Dev / Prod / General buckets (ported from issue-detail.js
 * buildAcDisplay). Falls back to a flat list when no items are env-tagged.
 */
interface AcDisplayProps {
  items: string[];
}

export default function AcDisplay({ items }: AcDisplayProps) {
  if (!items || !items.length) {
    return <div className="text-sm text-default-400">No acceptance criteria defined.</div>;
  }

  const dev = items.filter((s) => /^\[dev\]/i.test(s));
  const prod = items.filter((s) => /^\[prod\]/i.test(s));
  const general = items.filter((s) => !/^\[(dev|prod)\]/i.test(s));

  if (!dev.length && !prod.length) {
    return (
      <ul className="list-disc space-y-1 pl-4 text-sm text-foreground">
        {items.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    );
  }

  const groups = [
    { label: 'Dev', items: dev },
    { label: 'Prod', items: prod },
    { label: 'General', items: general },
  ].filter((g) => g.items.length);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.label}>
          <span className="text-xs font-semibold uppercase tracking-wide text-default-500">{g.label}</span>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-foreground">
            {g.items.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
