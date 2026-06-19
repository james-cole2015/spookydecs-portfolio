import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Accordion, AccordionItem, Card, CardBody, Chip } from '@heroui/react';
import { Breadcrumbs, EmptyState, ErrorState, LoadingState, PageHeader } from '@spookydecs/ui';
import { listHistoricalDeployments, getHistoricalDeployment } from '../api/deploymentsApi';

const CLASS_ICONS: Record<string, string> = {
  Decoration: '🎃',
  Light: '💡',
  Accessory: '🔌',
  Storage: '📦',
};
const ZONE_ORDER = ['FY', 'BY', 'SY'];

function formatMinutes(mins?: number): string {
  if (mins == null) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return null;
  }
}

function seasonLabel(season?: string, year?: number | string): string {
  return `${season || '—'} ${year || ''}`.trim();
}

interface HistoricalListItem {
  deployment_id: string;
  season?: string;
  year?: number | string;
  statistics?: { total_items?: number };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardBody className="items-center">
        <div className="text-xl font-semibold text-foreground">{value}</div>
        <div className="text-xs text-default-500">{label}</div>
      </CardBody>
    </Card>
  );
}

function Breakdown({ title, data }: { title: string; data?: Record<string, number> }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  return (
    <Card>
      <CardBody className="gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-default-500">No data available</p>
        ) : (
          entries.map(([label, count]) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-default-600">{label}</span>
              <span className="font-medium text-foreground">{count}</span>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
}

function HistoricalDetail({ data }: { data: any }) {
  const { metadata, zones } = data;
  const stats = metadata.statistics || {};
  const dates = [
    { label: 'Setup Started', value: formatDate(metadata.setup_started_at) },
    { label: 'Setup Completed', value: formatDate(metadata.setup_completed_at) },
    { label: 'Teardown Completed', value: formatDate(metadata.teardown_completed_at) },
  ];
  const zoneSections = ZONE_ORDER.filter((code) => zones[code]).map((code) => zones[code]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{metadata.deployment_id}</h1>
          <div className="text-default-500">{seasonLabel(metadata.season, metadata.year)}</div>
        </div>
        <Chip color="secondary" variant="flat">
          Archived
        </Chip>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Items" value={stats.total_items ?? '—'} />
        <StatCard label="Sessions" value={stats.total_sessions ?? '—'} />
        <StatCard label="Setup Time" value={stats.total_setup_minutes != null ? formatMinutes(stats.total_setup_minutes) : '—'} />
        <StatCard label="Zones" value={stats.total_zones ?? 3} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Breakdown title="By Class" data={stats.by_class} />
        <Breakdown title="By Type" data={stats.by_class_type} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {dates.map((d) => (
          <Card key={d.label}>
            <CardBody>
              <div className="text-xs uppercase tracking-wide text-default-500">{d.label}</div>
              <div className={d.value ? 'text-foreground' : 'text-default-400'}>
                {d.value || 'Not recorded'}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {metadata.notes && metadata.notes.trim() && (
        <Card className="mb-4">
          <CardBody>
            <div className="mb-1 text-xs uppercase tracking-wide text-default-500">Notes</div>
            <div className="text-sm text-foreground">{metadata.notes}</div>
          </CardBody>
        </Card>
      )}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Items by Zone</h2>
      <Accordion variant="bordered" selectionMode="multiple" defaultExpandedKeys={zoneSections.map((z) => z.zone_code)}>
        {zoneSections.map((zone: any) => (
          <AccordionItem
            key={zone.zone_code}
            aria-label={zone.zone_name}
            title={
              <div className="flex items-center gap-2">
                <Chip size="sm" variant="flat">
                  {zone.zone_code}
                </Chip>
                <span>{zone.zone_name}</span>
                <span className="text-sm text-default-500">{zone.item_count ?? 0} items</span>
              </div>
            }
          >
            <ZoneItems items={zone.items} />
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

function ZoneItems({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return <p className="px-2 py-3 text-sm text-default-500">No items recorded</p>;
  }
  const groups: Record<string, any[]> = {};
  items.forEach((item) => {
    (groups[item.class || 'Unknown'] ||= []).push(item);
  });
  const order = ['Decoration', 'Light', 'Accessory'];
  const keys = [...order.filter((k) => groups[k]), ...Object.keys(groups).filter((k) => !order.includes(k))];
  return (
    <div className="flex flex-col gap-4">
      {keys.map((cls) => (
        <div key={cls}>
          <div className="mb-2 text-sm font-semibold text-default-600">{cls}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {groups[cls].map((item) => (
              <Card key={item.id}>
                <CardBody className="items-center gap-1 p-2 text-center">
                  <span className="text-2xl">{CLASS_ICONS[item.class] || '📦'}</span>
                  <span className="text-sm font-medium text-foreground">{item.short_name || item.id}</span>
                  <span className="text-xs text-default-500">{item.class_type || item.class || '—'}</span>
                  <span className="font-mono text-xs text-default-400">{item.id}</span>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HistoricalPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [deployments, setDeployments] = useState<HistoricalListItem[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listHistoricalDeployments();
        if (!cancelled) setDeployments(res.data || []);
      } catch (err) {
        console.error('[Historical] Failed to load list:', err);
        if (!cancelled) setDeployments([]);
      } finally {
        if (!cancelled) setListLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    (async () => {
      try {
        const res = await getHistoricalDeployment(id);
        if (!cancelled) setDetail(res.data);
      } catch (err: any) {
        if (!cancelled) setDetailError(err?.message || 'Failed to load deployment.');
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <>
      <Breadcrumbs crumbs={[{ label: 'Deployments', to: '/deployments' }, { label: 'Historical' }]} />
      <PageHeader title="Historical Deployments" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        <aside>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-default-500">
            Deployment IDs
          </h2>
          {!listLoaded ? (
            <LoadingState label="Loading…" />
          ) : deployments.length === 0 ? (
            <p className="text-sm text-default-500">No archived deployments yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {deployments.map((d) => {
                const isActive = d.deployment_id === id;
                return (
                  <button
                    key={d.deployment_id}
                    onClick={() => navigate(`/deployments/historical/${d.deployment_id}`)}
                    className={`rounded-medium border p-3 text-left ${
                      isActive ? 'border-secondary bg-secondary-50/40' : 'border-default-200 hover:border-default-400'
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground">{d.deployment_id}</div>
                    <div className="text-xs text-default-500">
                      {seasonLabel(d.season, d.year)} · {d.statistics?.total_items ?? '—'} items
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <main>
          {!id ? (
            <EmptyState icon="📋" title="Select a deployment from the list to view details" />
          ) : detailLoading ? (
            <LoadingState label="Loading deployment…" />
          ) : detailError ? (
            <ErrorState message={detailError} />
          ) : detail ? (
            <HistoricalDetail data={detail} />
          ) : null}
        </main>
      </div>
    </>
  );
}
