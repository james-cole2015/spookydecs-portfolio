/**
 * Seasonal monitor — the workbench sub's single read-only view. Port of the
 * vanilla js/seasonal-view.js onto HeroUI + @spookydecs/ui Layout primitives.
 *
 * Year selection lives in the URL (?year=) so a view is shareable; the three
 * season columns render as a grid on desktop and collapse to a tab-selected
 * single column on mobile. Cards open a preview modal with a deep link out to
 * the source sub.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Tabs, Tab } from '@heroui/react';
import { useConfig, useAuth, useToast, PageHeader, LoadingState, ErrorState, EmptyState } from '@spookydecs/ui';
import type { IdeaRecord, MaintenanceRecord, SeasonalSummary, SeasonKey } from '../types/workbench';
import { getSeasonalSummary } from '../api/workbenchApi';
import {
  CURRENT_YEAR,
  getBuckets,
  getAvailableYears,
  getDefaultSeason,
  bucketActiveCount,
} from './seasonModel';
import { SeasonColumn } from './components/SeasonColumn';
import { CardPreviewModal } from './components/CardPreviewModal';
import type { CardPreview } from './components/cards';

/** Total items (active + completed) across the whole summary — drives EmptyState. */
function summaryTotal(summary: SeasonalSummary): number {
  return (Object.keys(summary) as SeasonKey[]).reduce((sum, key) => {
    const bucket = summary[key] ?? {};
    const c = bucket.completed ?? {};
    const completed =
      (c.ideas?.length ?? 0) +
      (c.inspections?.length ?? 0) +
      (c.repairs?.length ?? 0) +
      (c.maintenance_tasks?.length ?? 0);
    return sum + bucketActiveCount(bucket) + completed;
  }, 0);
}

export default function SeasonalView() {
  const config = useConfig();
  const { buildHeaders, redirectToLogin } = useAuth();
  const { showError } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();

  // Year selection: ?year=N highlights a pill; ?year=clear deselects (current
  // year data, no pill); no param = default (current year, pill active).
  const yearParam = searchParams.get('year');
  const activePillYear: number | null =
    yearParam === null
      ? CURRENT_YEAR
      : yearParam === 'clear'
        ? null
        : Number.isNaN(parseInt(yearParam, 10))
          ? CURRENT_YEAR
          : parseInt(yearParam, 10);
  const fetchYear = activePillYear ?? CURRENT_YEAR;

  const [summary, setSummary] = useState<SeasonalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedCard, setSelectedCard] = useState<CardPreview | null>(null);
  const [activeSeason, setActiveSeason] = useState<SeasonKey | null>(null);

  const apiEndpoint = config.API_ENDPOINT;
  const ideasAdminUrl = (config.IDEAS_URL as string | undefined) ?? '';
  const maintUrl = (config.MAINT_URL as string | undefined) ?? '';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getSeasonalSummary(fetchYear, { apiEndpoint, buildHeaders, redirectToLogin })
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Failed to load seasonal summary:', err);
        const message = err instanceof Error ? err.message : 'Failed to load seasonal summary.';
        setError(message);
        showError('Failed to load seasonal summary. Please refresh.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchYear, apiEndpoint, buildHeaders, redirectToLogin, showError, reloadKey]);

  const buckets = useMemo(() => getBuckets(fetchYear), [fetchYear]);

  const links = useMemo(
    () => ({
      ideaHref: (idea: IdeaRecord) => `${ideasAdminUrl}/${idea.idea_id}`,
      maintHref: (record: MaintenanceRecord) => `${maintUrl}/${record.item_id}/${record.record_id}`,
    }),
    [ideasAdminUrl, maintUrl],
  );

  function selectYear(year: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('year', String(year));
      return next;
    });
  }

  function clearYear() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('year', 'clear');
      return next;
    });
  }

  const effectiveSeason: SeasonKey =
    activeSeason ?? (summary ? getDefaultSeason(summary, buckets) : 'off_season');

  return (
    <>
      <PageHeader title="Seasonal Monitor" subtitle="Read-only view of work across the off-season, Halloween, and Christmas." />

      {/* Year selector */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-default-500">Year</span>
        {getAvailableYears().map((y) => (
          <Button
            key={y}
            size="sm"
            variant={y === activePillYear ? 'solid' : 'flat'}
            color={y === activePillYear ? 'primary' : 'default'}
            onPress={() => selectYear(y)}
          >
            {y}
          </Button>
        ))}
        {activePillYear !== null && (
          <Button size="sm" variant="light" onPress={clearYear}>
            Clear
          </Button>
        )}
      </div>

      {loading && <LoadingState label="Loading seasonal summary…" />}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      )}

      {!loading && !error && summary && summaryTotal(summary) === 0 && (
        <EmptyState icon="🛠️" title="No active work" message={`Nothing scheduled for ${fetchYear}.`} />
      )}

      {!loading && !error && summary && summaryTotal(summary) > 0 && (
        <>
          {/* Mobile season tabs (desktop shows all three columns side by side). */}
          <div className="mb-4 md:hidden">
            <Tabs
              aria-label="Season"
              selectedKey={effectiveSeason}
              onSelectionChange={(key) => setActiveSeason(key as SeasonKey)}
              color="primary"
              size="sm"
              fullWidth
            >
              {buckets.map((b) => (
                <Tab key={b.key} title={b.shortLabel} />
              ))}
            </Tabs>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {buckets.map((b) => (
              <SeasonColumn
                key={b.key}
                def={b}
                bucket={summary[b.key] ?? {}}
                links={links}
                onSelect={setSelectedCard}
                className={b.key === effectiveSeason ? '' : 'hidden md:flex'}
              />
            ))}
          </div>
        </>
      )}

      <CardPreviewModal preview={selectedCard} onClose={() => setSelectedCard(null)} />
    </>
  );
}
