import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, Chip, Link as HeroLink } from '@heroui/react';
import { Breadcrumbs, ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import {
  getDeployment,
  getItem,
  getZoneSessions,
  completeDeployment,
  getItemsAdminUrl,
  fetchImageById,
} from '../api/deploymentsApi';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { StatusChip } from '../components/StatusChip';

const ZONE_CODES = ['FY', 'BY', 'SY'];
const ZONE_LABELS: Record<string, string> = { FY: 'Front Yard', BY: 'Back Yard', SY: 'Side Yard' };

interface EnrichedItem {
  id: string;
  short_name?: string;
  class?: string;
  class_type?: string;
  photo_ids?: string[];
}

interface EnrichedZone {
  zone_code: string;
  zone_name?: string;
  statistics?: any;
  items: EnrichedItem[];
  sessions: any[];
}

function buildItemPhotoMap(sessions: any[], itemIds: string[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  itemIds.forEach((id) => {
    map[id] = [];
  });
  sessions.forEach((session) => {
    (session.connections || []).forEach((conn: any) => {
      const toItem = conn.to_item_id;
      if (map[toItem] !== undefined && conn.photo_ids?.length) {
        conn.photo_ids.forEach((photoId: string) => {
          if (!map[toItem].includes(photoId)) map[toItem].push(photoId);
        });
      }
    });
  });
  return map;
}

function decorationIcon(classType?: string): string {
  const icons: Record<string, string> = {
    Inflatable: '🎈',
    Animatronic: '🤖',
    'Static Prop': '💀',
  };
  return icons[classType || ''] || '🎃';
}

function DecorationCard({ item, baseUrl }: { item: EnrichedItem; baseUrl: string }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const photoIds = item.photo_ids || [];
  const hasPhotos = photoIds.length > 0;

  useEffect(() => {
    let cancelled = false;
    if (hasPhotos) {
      fetchImageById(photoIds[0])
        .then((photo) => {
          if (!cancelled && photo) setThumb(photo.thumb_cloudfront_url || photo.cloudfront_url || null);
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <HeroLink href={`${baseUrl}/${item.id}`} isExternal className="block">
      <Card isHoverable className="h-full">
        <CardBody className="gap-2 p-2">
          <div className="relative flex h-24 items-center justify-center rounded-medium bg-default-100">
            {thumb ? (
              <img src={thumb} alt={item.short_name || item.id} className="h-full w-full rounded-medium object-cover" />
            ) : (
              <span className="text-3xl">{decorationIcon(item.class_type)}</span>
            )}
            {hasPhotos && (
              <span className="absolute right-1 top-1 rounded-full bg-secondary px-1.5 text-xs text-white">
                {photoIds.length}
              </span>
            )}
          </div>
          <div className="truncate text-sm font-medium text-foreground">
            {item.short_name || item.id}
          </div>
        </CardBody>
      </Card>
    </HeroLink>
  );
}

export default function CompletePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deploymentId = id!;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [zones, setZones] = useState<EnrichedZone[]>([]);
  const [itemsAdminUrl, setItemsAdminUrl] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [metaResponse, adminUrl, ...zoneResponses] = await Promise.all([
          getDeployment(deploymentId, ['zones']),
          getItemsAdminUrl(),
          ...ZONE_CODES.map((code) => getZoneSessions(deploymentId, code).catch(() => ({ data: [] }))),
        ]);
        const meta = metaResponse.data?.metadata || metaResponse.data;
        const rawZones = metaResponse.data?.zones || [];
        const sessionsByZone: Record<string, any[]> = {};
        ZONE_CODES.forEach((code, i) => {
          sessionsByZone[code] = zoneResponses[i]?.data || [];
        });

        const allItemIds = new Set<string>();
        rawZones.forEach((zone: any) => {
          (zone.items_deployed || []).forEach((id: string) => allItemIds.add(id));
        });
        const itemResults = await Promise.allSettled([...allItemIds].map((iid) => getItem(iid)));
        const itemMap: Record<string, any> = {};
        itemResults.forEach((result, i) => {
          const iid = [...allItemIds][i];
          if (result.status === 'fulfilled' && (result.value as any)?.data) {
            itemMap[iid] = (result.value as any).data;
          }
        });

        const enrichedZones: EnrichedZone[] = rawZones.map((zone: any) => {
          const itemIds: string[] = zone.items_deployed || [];
          const sessions = sessionsByZone[zone.zone_code] || [];
          const photoMap = buildItemPhotoMap(sessions, itemIds);
          const items = itemIds.map((iid) => ({
            id: iid,
            ...itemMap[iid],
            photo_ids: photoMap[iid] || [],
          }));
          return { ...zone, items, sessions };
        });

        if (cancelled) return;
        setMetadata(meta);
        setZones(enrichedZones);
        setItemsAdminUrl(adminUrl || '');
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load deployment review.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deploymentId]);

  async function handleConfirm() {
    setConfirming(true);
    try {
      const result = await completeDeployment(deploymentId);
      const data = result.data;
      let msg = `Deployment complete! ${data.items_updated} item(s) marked as Deployed.`;
      if (data.items_failed > 0) msg += ` (${data.items_failed} item(s) failed to update — check logs.)`;
      toast.showSuccess(msg);
      setConfirmOpen(false);
      setTimeout(() => navigate(`/deployments/builder/${deploymentId}/zones`), 1500);
    } catch (e: any) {
      console.error('[Complete] Error:', e);
      let msg = `Failed to complete deployment: ${e?.message}`;
      if (e?.message?.includes('active session'))
        msg = 'Cannot complete: an active session is still open. End it first.';
      else if (e?.message?.includes('already completed')) msg = 'This deployment is already completed.';
      toast.showError(msg);
      setConfirming(false);
    }
  }

  if (loading) return <LoadingState label="Loading deployment review…" />;
  if (error || !metadata)
    return <ErrorState message={error || 'Failed to load'} onRetry={() => navigate(`/deployments/builder/${deploymentId}/zones`)} />;

  const stats = metadata.statistics || {};
  const totalItems = zones.reduce((sum, z) => sum + ((z as any).items_deployed?.length || z.items?.length || 0), 0);
  const byClass = stats.by_class || {};

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/deployments' },
          { label: `${metadata.season} ${metadata.year}`, to: `/deployments/builder/${deploymentId}/zones` },
          { label: 'Complete Deployment' },
        ]}
      />
      <PageHeader
        title={`${metadata.season} ${metadata.year}`}
        actions={<StatusChip status={metadata.status} size="md" />}
      />

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Items Deployed', value: totalItems },
          { label: 'Sessions', value: stats.total_sessions || 0 },
          { label: 'Setup Time', value: `${stats.total_setup_minutes || 0}m` },
          { label: 'Zones', value: zones.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="items-center">
              <div className="text-2xl font-semibold text-foreground">{s.value}</div>
              <div className="text-xs text-default-500">{s.label}</div>
            </CardBody>
          </Card>
        ))}
      </div>
      {Object.keys(byClass).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(byClass).map(([cls, count]) => (
            <Chip key={cls} variant="flat">
              {cls}: {count as number}
            </Chip>
          ))}
        </div>
      )}

      {zones.map((zone) => {
        const zoneStats = zone.statistics || {};
        const label = ZONE_LABELS[zone.zone_code] || zone.zone_name || zone.zone_code;
        const decorations = zone.items.filter((i) => i.class === 'Decoration');
        const lights = zone.items.filter((i) => i.class === 'Light');
        const accessories = zone.items.filter((i) => i.class === 'Accessory');
        return (
          <section key={zone.zone_code} className="mb-8">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-foreground">{label}</h2>
              <div className="text-sm text-default-500">
                {zone.items.length} items · {zoneStats.session_count || 0} sessions ·{' '}
                {zoneStats.total_setup_minutes || 0}m setup
              </div>
            </div>

            {zone.sessions.filter((s) => s.session_id).length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {zone.sessions
                  .filter((s) => s.session_id)
                  .map((s) => {
                    const duration = s.duration_seconds ? `${Math.round(s.duration_seconds / 60)}m` : 'active';
                    const date = s.start_time ? new Date(s.start_time).toLocaleDateString() : '';
                    return (
                      <HeroLink
                        key={s.session_id}
                        href={`/deployments/builder/${deploymentId}/zones/${zone.zone_code}/sessions/${s.session_id}`}
                        size="sm"
                        className="rounded-medium bg-default-100 px-2 py-1 text-secondary"
                      >
                        Session · {date} · {duration}
                      </HeroLink>
                    );
                  })}
              </div>
            )}

            {zone.items.length === 0 ? (
              <p className="text-sm text-default-500">No items in this zone.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {decorations.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-semibold text-default-600">
                      Decorations <span className="text-default-400">{decorations.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {decorations.map((item) => (
                        <DecorationCard key={item.id} item={item} baseUrl={itemsAdminUrl} />
                      ))}
                    </div>
                  </div>
                )}
                {[
                  { label: 'Lights', items: lights, icon: '💡' },
                  { label: 'Accessories', items: accessories, icon: '🔌' },
                ]
                  .filter((g) => g.items.length > 0)
                  .map((g) => (
                    <div key={g.label}>
                      <div className="mb-2 text-sm font-semibold text-default-600">
                        {g.label} <span className="text-default-400">{g.items.length}</span>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {g.items.map((item) => (
                          <li key={item.id}>
                            <HeroLink
                              href={`${itemsAdminUrl}/${item.id}`}
                              isExternal
                              size="sm"
                              className="flex items-center gap-2 text-foreground"
                            >
                              <span>{g.icon}</span>
                              {item.short_name || item.id}
                            </HeroLink>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            )}
          </section>
        );
      })}

      <Card className="sticky bottom-4">
        <CardBody className="flex-row flex-wrap items-center justify-between gap-4">
          <Button variant="flat" onPress={() => navigate(`/deployments/builder/${deploymentId}/zones`)}>
            ← Back to Zones
          </Button>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <p className="text-sm text-default-500">
              This will mark all deployed items as <strong>Deployed</strong> and lock the deployment.
            </p>
            <Button color="primary" onPress={() => setConfirmOpen(true)}>
              Confirm &amp; Complete Deployment
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Complete Deployment?"
        body="This will mark all deployed items as Deployed and lock the deployment."
        confirmLabel="Confirm & Complete"
        isLoading={confirming}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
