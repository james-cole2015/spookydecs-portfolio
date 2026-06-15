/**
 * Action Center — Inspector data-quality + Workbench project stats, the two
 * "what needs attention" panels on the dashboard. Ported from the vanilla
 * components/ActionCenter.js (same data, same season-pill behavior; HeroUI shell).
 */
import { useEffect, useState } from 'react';
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from '@heroui/react';
import { Search, Wrench } from 'lucide-react';
import { ErrorState } from '@spookydecs/ui';
import {
  fetchInspectorStats,
  fetchWorkbenchStats,
  getSubdomainUrls,
} from '../api/adminApi';
import {
  SEASON_LABELS,
  type InspectorStats,
  type SubdomainUrls,
  type WorkbenchStats,
} from '../config/adminConfig';

interface StatTileProps {
  icon: string;
  count: number;
  label: string;
}

function StatTile({ icon, count, label }: StatTileProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-large bg-content2 px-4 py-3 text-center">
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <span className="text-2xl font-semibold text-foreground">{count}</span>
      <span className="text-tiny uppercase tracking-wide text-default-500">{label}</span>
    </div>
  );
}

export function ActionCenter() {
  const [inspector, setInspector] = useState<InspectorStats | null>(null);
  const [workbench, setWorkbench] = useState<WorkbenchStats | null>(null);
  const [urls, setUrls] = useState<SubdomainUrls | null>(null);
  const [season, setSeason] = useState<string>('off_season');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [insp, wb, subUrls] = await Promise.all([
          fetchInspectorStats(),
          fetchWorkbenchStats(),
          getSubdomainUrls(),
        ]);
        if (cancelled) return;
        setInspector(insp);
        setWorkbench(wb);
        setSeason(wb?.current_season || 'off_season');
        setUrls(subUrls);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card shadow="md" className="bg-content1">
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">Action Center</h2>
      </CardHeader>
      <CardBody className="gap-5">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Spinner color="secondary" />
            <p className="text-default-500">Loading action center...</p>
          </div>
        ) : error ? (
          <ErrorState message={`Failed to load action center: ${error}`} />
        ) : (
          <>
            {inspector && (
              <InspectorSection stats={inspector} url={urls?.inspector || '#'} />
            )}
            {workbench && (
              <WorkbenchSection
                stats={workbench}
                season={season}
                onSeasonChange={setSeason}
                url={urls?.workbench || '#'}
              />
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}

function InspectorSection({ stats, url }: { stats: InspectorStats; url: string }) {
  const byMode = stats.by_resolution_mode || {};
  const totalOpen = stats.total_open || 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground">
          <Search size={18} className="text-secondary" />
          <span className="text-medium">
            <strong>Inspector</strong> — Data Quality and Readiness
          </span>
        </div>
        <Button as="a" href={url} color="secondary" variant="solid" size="sm">
          View Violations →
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon="🔴" count={totalOpen} label="Open" />
        <StatTile icon="🟠" count={byMode.unanalyzed || 0} label="Unanalyzed" />
        <StatTile icon="🟡" count={byMode.auto_resolved || 0} label="Auto-resolved" />
        <StatTile icon="🟢" count={byMode.dismissed || 0} label="Dismissed" />
      </div>
    </section>
  );
}

function WorkbenchSection({
  stats,
  season,
  onSeasonChange,
  url,
}: {
  stats: WorkbenchStats;
  season: string;
  onSeasonChange: (s: string) => void;
  url: string;
}) {
  const seasons = stats.seasons || {};
  const current = seasons[season] || {};
  const { active = 0, scheduled = 0, completed = 0 } = current;
  const seasonLabel = SEASON_LABELS[season] || season;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-foreground">
          <Wrench size={18} className="text-secondary" />
          <span className="text-medium">
            <strong>Workbench</strong> — {seasonLabel}
          </span>
        </div>
        <Button as="a" href={url} variant="bordered" size="sm">
          View Workbench →
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.keys(SEASON_LABELS).map((key) => (
          <Chip
            key={key}
            variant={key === season ? 'solid' : 'bordered'}
            color={key === season ? 'primary' : 'default'}
            className="cursor-pointer"
            onClick={() => onSeasonChange(key)}
          >
            {SEASON_LABELS[key]}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon="⚙️" count={active} label="Active" />
        <StatTile icon="📅" count={scheduled} label="Scheduled" />
        <StatTile icon="✓" count={completed} label="Completed (90d)" />
      </div>
    </section>
  );
}
