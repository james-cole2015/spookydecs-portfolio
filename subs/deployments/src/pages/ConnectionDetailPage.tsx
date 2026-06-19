import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Chip, Link as HeroLink } from '@heroui/react';
import { Plug } from 'lucide-react';
import { Breadcrumbs, ErrorState, LoadingState, PageHeader, useConfig } from '@spookydecs/ui';
import { getDeployment, getConnection, getItem, fetchImageById } from '../api/deploymentsApi';
import type { Deployment, Zone, Connection } from '../config/deploymentsConfig';

function truncateId(id: string): string {
  const parts = id.split('-');
  return parts[1]?.substring(0, 6) || id;
}

function placeholderIcon(item: any): string {
  if (item?.class === 'Light') return '💡';
  if (item?.class === 'Accessory') return '⚙️';
  return '📦';
}

function photoUrl(item: any): string | null {
  if (item?.class === 'Light' || item?.class === 'Accessory') return null;
  return item?.images?.primary_photo_url || null;
}

function ItemCard({
  item,
  label,
  itemsBaseUrl,
}: {
  item: any;
  label: string;
  itemsBaseUrl: string;
}) {
  const url = photoUrl(item);
  return (
    <Card>
      <CardBody className="gap-2">
        <div className="text-xs uppercase tracking-wide text-default-500">{label}</div>
        {url ? (
          <img src={url} alt={item.short_name || item.id} className="h-32 w-full rounded-medium object-cover" />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-medium bg-default-100 text-4xl">
            {placeholderIcon(item)}
          </div>
        )}
        <div className="font-medium text-foreground">{item.short_name || 'Unnamed Item'}</div>
        <div className="font-mono text-xs text-default-500">{item.id}</div>
        <div className="text-xs text-default-500">
          {item.class} • {item.class_type}
        </div>
        <Chip size="sm" variant="flat">
          {item.status}
        </Chip>
        <HeroLink href={`${itemsBaseUrl}/${item.id}`} isExternal size="sm" className="text-secondary">
          View Item Details →
        </HeroLink>
      </CardBody>
    </Card>
  );
}

function MetaCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardBody>
        <div className="text-xs uppercase tracking-wide text-default-500">{label}</div>
        <div className="break-all text-base font-medium text-foreground">{value}</div>
        {sub && <div className="text-sm text-default-500">{sub}</div>}
      </CardBody>
    </Card>
  );
}

export default function ConnectionDetailPage() {
  const { deploymentId, sessionId, connectionId } = useParams();
  const navigate = useNavigate();
  const config = useConfig();
  const configItemsAdmin = (config.ITEMS_ADMIN as string) || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [fromItem, setFromItem] = useState<any>(null);
  const [toItem, setToItem] = useState<any>(null);
  const [illuminatedItems, setIlluminatedItems] = useState<any[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const connectionResponse = await getConnection(deploymentId!, sessionId!, connectionId!);
        const conn = connectionResponse.data;

        const deploymentResponse = await getDeployment(deploymentId!, ['zones']);
        const data = deploymentResponse.data;
        const dep = data.metadata || data;
        const zones: Zone[] = data.zones || [];
        const foundZone = zones.find((z) => z.zone_code === conn.zone_code);
        if (!foundZone) throw new Error(`Zone ${conn.zone_code} not found in deployment`);

        const [fromRes, toRes] = await Promise.all([
          getItem(conn.from_item_id),
          getItem(conn.to_item_id),
        ]);
        const from = fromRes.data;
        const to = toRes.data;

        let illuminated: any[] = [];
        if (conn.illuminates?.length > 0) {
          const responses = await Promise.all(
            conn.illuminates.map((itemId: string) => getItem(itemId).catch(() => null)),
          );
          illuminated = responses.filter((r) => r !== null).map((r: any) => r.data);
        }

        // Resolve primary photos for decoration items.
        const resolvePhoto = async (item: any) => {
          if (item?.images?.primary_photo_id) {
            const photo = await fetchImageById(item.images.primary_photo_id).catch(() => null);
            if (photo?.cloudfront_url) item.images.primary_photo_url = photo.cloudfront_url;
          }
        };
        await Promise.all([resolvePhoto(from), resolvePhoto(to), ...illuminated.map(resolvePhoto)]);

        if (cancelled) return;
        setConnection(conn);
        setDeployment(dep);
        setZone(foundZone);
        setFromItem(from);
        setToItem(to);
        setIlluminatedItems(illuminated);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load connection');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deploymentId, sessionId, connectionId]);

  if (loading) return <LoadingState label="Loading connection details…" />;
  if (error || !connection || !zone || !deployment || !fromItem || !toItem)
    return (
      <ErrorState
        message={error || 'Connection not found'}
        onRetry={() => navigate(`/deployments/builder/${deploymentId}/zones`)}
      />
    );

  const c: any = connection;
  const connectedAt = c.connected_at ? new Date(c.connected_at) : null;

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Zones', to: `/deployments/builder/${deploymentId}/zones` },
          { label: zone.zone_name, to: `/deployments/builder/${deploymentId}/zones/${zone.zone_code}` },
          {
            label: `Session ${truncateId(c.session_id)}`,
            to: `/deployments/builder/${deploymentId}/zones/${zone.zone_code}/sessions/${c.session_id}`,
          },
          { label: `Connection ${truncateId(c.connection_id)}` },
        ]}
      />
      <PageHeader
        title={`Connection ${truncateId(c.connection_id)}`}
        icon={<Plug size={24} />}
        subtitle={`${zone.zone_code} · Session ${truncateId(c.session_id)}`}
      />

      <h2 className="mb-3 text-lg font-semibold text-foreground">Connection Flow</h2>
      <Card className="mb-6">
        <CardBody className="flex-row items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-xs uppercase text-default-500">From</div>
            <div className="font-medium text-foreground">{c.from_item_id}</div>
            <div className="text-xs text-default-400">{c.from_port}</div>
          </div>
          <span className="text-2xl text-default-400">→</span>
          <div className="text-center">
            <div className="text-xs uppercase text-default-500">To</div>
            <div className="font-medium text-foreground">{c.to_item_id}</div>
            <div className="text-xs text-default-400">{c.to_port}</div>
          </div>
        </CardBody>
      </Card>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Connected Items</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ItemCard item={fromItem} label="Source" itemsBaseUrl={configItemsAdmin} />
        <ItemCard item={toItem} label="Destination" itemsBaseUrl={configItemsAdmin} />
      </div>

      {illuminatedItems.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-foreground">💡 Illuminated Items</h2>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {illuminatedItems.map((item) => {
              const url = photoUrl(item);
              return (
                <Card key={item.id}>
                  <CardBody className="gap-2">
                    {url ? (
                      <img src={url} alt={item.short_name || item.id} className="h-24 w-full rounded-medium object-cover" />
                    ) : (
                      <div className="flex h-24 items-center justify-center rounded-medium bg-default-100 text-3xl">
                        {placeholderIcon(item)}
                      </div>
                    )}
                    <div className="text-sm font-medium text-foreground">
                      {item.short_name || 'Unnamed Item'}
                    </div>
                    <div className="font-mono text-xs text-default-500">{item.id}</div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <h2 className="mb-3 text-lg font-semibold text-foreground">Connection Details</h2>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCard
          label="Connected At"
          value={connectedAt ? connectedAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}
          sub={connectedAt ? connectedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : undefined}
        />
        <MetaCard label="Zone" value={zone.zone_name} sub={zone.zone_code} />
        <MetaCard label="Session ID" value={c.session_id} />
        <MetaCard label="Connection ID" value={c.connection_id} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-foreground">Notes</h2>
      {c.notes ? (
        <Card>
          <CardBody className="text-sm text-foreground">{c.notes}</CardBody>
        </Card>
      ) : (
        <p className="text-sm text-default-500">No notes recorded for this connection</p>
      )}
    </>
  );
}
