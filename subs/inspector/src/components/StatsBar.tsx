/**
 * StatsBar — open-violation counts grouped by resolution_mode. Vanilla
 * `.stats-bar` strip → HeroUI Cards.
 */
import { Card, CardBody } from '@heroui/react';
import { InspectorConfig } from '../config/inspectorConfig';

interface Stats {
  total_open?: number;
  by_resolution_mode?: Record<string, number>;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card shadow="sm" className={accent ? 'bg-secondary/15' : 'bg-content1'}>
      <CardBody className="items-center gap-1 py-4">
        <span className="text-tiny uppercase tracking-wide text-default-500">{label}</span>
        <span className="text-2xl font-semibold text-foreground">{value}</span>
      </CardBody>
    </Card>
  );
}

export function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const modes = InspectorConfig.RESOLUTION_MODE;
  const byMode = stats.by_resolution_mode || {};

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard label="Open" value={stats.total_open ?? 0} accent />
      {Object.entries(modes).map(([key, cfg]) => (
        <StatCard key={key} label={cfg.label} value={byMode[key] ?? 0} />
      ))}
    </div>
  );
}
