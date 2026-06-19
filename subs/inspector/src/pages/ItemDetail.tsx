/**
 * ItemDetail — all violations for a single item, with inspector + items-sub
 * links and a status-tabbed violations table. Mirrors the vanilla item-detail.js.
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Chip, Link } from '@heroui/react';
import { Breadcrumbs, LoadingState, ErrorState, useConfig } from '@spookydecs/ui';
import { InspectorAPI } from '../api/inspectorApi';
import { calculateStats, type Violation } from '../config/inspectorConfig';
import { ViolationsTable } from '../components/ViolationsTable';

export default function ItemDetail() {
  const { itemId = '' } = useParams();
  const config = useConfig();
  const itemsAdminUrl = (config.ITEMS_ADMIN as string | undefined) || null;

  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setViolations(await InspectorAPI.getViolationsForItem(itemId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const shortName =
    violations.length > 0 ? violations[0].violation_details?.item_short_name || itemId : itemId;
  const crumbs = [{ label: 'Inspector', to: '/inspector' }, { label: shortName }];

  if (loading) {
    return (
      <div>
        <Breadcrumbs crumbs={crumbs} />
        <LoadingState label="Loading item…" />
      </div>
    );
  }
  if (error) {
    return (
      <div>
        <Breadcrumbs crumbs={crumbs} />
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  }

  const stats = calculateStats(violations);

  return (
    <div className="space-y-6">
      <Breadcrumbs crumbs={crumbs} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{shortName}</h1>
          <Chip size="sm" variant="flat" color="default">
            {itemId}
          </Chip>
          {itemsAdminUrl && (
            <Link href={`${itemsAdminUrl}/${itemId}`} isExternal size="sm">
              View in Items ↗
            </Link>
          )}
        </div>
        <div className="flex gap-4">
          {([
            ['Total', stats.total],
            ['Open', stats.open],
            ['Resolved', stats.resolved],
            ['Dismissed', stats.dismissed],
          ] as const).map(([label, value]) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-tiny uppercase text-default-500">{label}</span>
              <span className="text-xl font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-foreground">Violations ({violations.length})</h2>
        <ViolationsTable violations={violations} variant="item" />
      </section>
    </div>
  );
}
