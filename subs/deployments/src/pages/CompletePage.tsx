import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, Chip, Link as HeroLink } from '@heroui/react';
import { Breadcrumbs, ConfirmDialog, ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import {
  getDeployment,
  getDeploymentGraph,
  completeDeployment,
  getItemsAdminUrl,
  fetchImageById,
} from '../api/deploymentsApi';
import { StatusChip } from '../components/StatusChip';
import type { GraphInput } from '../lib/graphDerivation';
import { zoneSummary } from '../lib/graphPorts';

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
  items: EnrichedItem[];
  connectionCount: number;
  unwired: number;
}

/**
 * Build each zone's deployed set from the live records — the same rule the backend's
 * complete step uses: items declared in the zone plus the targets of its active connections.
 * Photos come from the declaration and from any inbound connection.
 */
function buildZones(graph: GraphInput): EnrichedZone[] {
  const activeP = graph.placements.filter((p) => (p.placement_type ?? 'deployment') === 'deployment');
  const activeC = graph.connections.filter((c) => (c.connection_type ?? 'deployment') === 'deployment');
  return Object.values(graph.zones).map((zone) => {
    const ids = new Set<string>();
    activeP.filter((p) => p.zone_code === zone.zone_code).forEach((p) => ids.add(p.item_id));
    const conns = activeC.filter((c) => c.zone_code === zone.zone_code);
    conns.forEach((c) => ids.add(c.to_item_id));
    const items: EnrichedItem[] = [...ids].map((iid) => {
      const photos = new Set<string>();
      activeP.filter((p) => p.item_id === iid).forEach((p) => (p.photo_ids || []).forEach((x) => photos.add(x)));
      conns.filter((c) => c.to_item_id === iid).forEach((c) => (c.photo_ids || []).forEach((x) => photos.add(x)));
      return { id: iid, ...(graph.items[iid] || {}), photo_ids: [...photos] };
    });
    return {
      zone_code: zone.zone_code,
      zone_name: zone.zone_name,
      items,
      connectionCount: conns.length,
      unwired: zoneSummary(graph, zone.zone_code).unwired,
    };
  });
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
        const [metaResponse, adminUrl, graphResponse] = await Promise.all([
          getDeployment(deploymentId, ['zones']),
          getItemsAdminUrl(),
          getDeploymentGraph(deploymentId),
        ]);
        const meta = metaResponse.data?.metadata || metaResponse.data;
        const enrichedZones = buildZones(graphResponse.data as GraphInput);

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
      setTimeout(() => navigate(`/builder/${deploymentId}`), 1500);
    } catch (e: any) {
      console.error('[Complete] Error:', e);
      let msg = `Failed to complete deployment: ${e?.message}`;
      if (e?.message?.includes('already completed')) msg = 'This deployment is already completed.';
      toast.showError(msg);
      setConfirming(false);
    }
  }

  if (loading) return <LoadingState label="Loading deployment review…" />;
  if (error || !metadata)
    return <ErrorState message={error || 'Failed to load'} onRetry={() => navigate(`/builder/${deploymentId}`)} />;

  const totalItems = zones.reduce((sum, z) => sum + z.items.length, 0);
  const totalConnections = zones.reduce((sum, z) => sum + z.connectionCount, 0);
  const totalUnwired = zones.reduce((sum, z) => sum + z.unwired, 0);
  const byClass: Record<string, number> = {};
  zones.forEach((z) => z.items.forEach((i) => (byClass[i.class || 'Other'] = (byClass[i.class || 'Other'] || 0) + 1)));

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/' },
          { label: `${metadata.season} ${metadata.year}`, to: `/builder/${deploymentId}` },
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
          { label: 'Connections', value: totalConnections },
          { label: 'Still unwired', value: totalUnwired },
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
        const label = ZONE_LABELS[zone.zone_code] || zone.zone_name || zone.zone_code;
        const decorations = zone.items.filter((i) => i.class === 'Decoration');
        const lights = zone.items.filter((i) => i.class === 'Light');
        const accessories = zone.items.filter((i) => i.class === 'Accessory');
        return (
          <section key={zone.zone_code} className="mb-8">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-foreground">{label}</h2>
              <div className="text-sm text-default-500">
                {zone.items.length} items · {zone.connectionCount} connections
                {zone.unwired > 0 ? ` · ${zone.unwired} unwired` : ''}
              </div>
            </div>

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
          <Button variant="flat" onPress={() => navigate(`/builder/${deploymentId}`)}>
            ← Back to Deployment
          </Button>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
            <p className="text-sm text-default-500">
              This will mark all deployed items as <strong>Deployed</strong> and lock the deployment.
            </p>
            <Button
              color="primary"
              onPress={() => setConfirmOpen(true)}
              data-testid="complete-trigger"
            >
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
        confirmTestId="complete-confirm"
        isLoading={confirming}
        onConfirm={handleConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
