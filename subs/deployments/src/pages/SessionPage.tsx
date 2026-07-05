import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Input,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react';
import { Sun, Sparkles, Plug, X } from 'lucide-react';
import { Breadcrumbs, EmptyState, ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import {
  getDeployment,
  getZoneSessions,
  getAvailablePorts,
  updateConnection,
  updateConnectionPhotos,
  endSession,
} from '../api/deploymentsApi';
import { ConnectionModal } from '../components/ConnectionModal';
import { EndSessionReview } from '../components/EndSessionReview';
import type { Deployment, Zone, Session, Connection } from '../config/deploymentsConfig';

interface SourceItem {
  item_id: string;
  short_name?: string;
  class?: string;
  class_type?: string;
  available_count?: number;
  available_ports?: string[];
  other_zone?: string;
}

function SourceIcon({ itemClass }: { itemClass?: string }) {
  switch (itemClass) {
    case 'Light':
      return <Sun className="text-warning" size={20} />;
    case 'Decoration':
      return <Sparkles className="text-secondary" size={20} />;
    default:
      return <Plug className="text-default-400" size={20} />;
  }
}

export default function SessionPage() {
  const { id, zone: zoneCode } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deploymentId = id!;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [portsData, setPortsData] = useState<any>({});
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingPhotoIds, setPendingPhotoIds] = useState<Record<string, string[]>>({});

  const [search, setSearch] = useState('');
  const [connectSource, setConnectSource] = useState<SourceItem | null>(null);
  const [endReviewOpen, setEndReviewOpen] = useState(false);

  // Remove-connection reason modal
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [removing, setRemoving] = useState(false);

  async function loadSession() {
    setLoading(true);
    setError(null);
    try {
      const deploymentResponse = await getDeployment(deploymentId, ['zones']);
      if (!deploymentResponse.success) throw new Error('Failed to load deployment');
      const { metadata, zones: zoneList } = deploymentResponse.data;
      const found = (zoneList || []).find((z: Zone) => z.zone_code === zoneCode);
      if (!found) throw new Error(`Zone ${zoneCode} not found`);

      const sessionsResponse = await getZoneSessions(deploymentId, zoneCode!);
      if (!sessionsResponse.success) throw new Error('Failed to load sessions');
      const active = sessionsResponse.data.find((s: any) => s.end_time === null);
      if (!active) throw new Error('No active session found. Please start a session first.');

      setDeployment(metadata);
      setZone(found);
      setZones(zoneList || []);
      setSession(active);
      await loadPorts();
    } catch (e: any) {
      console.error('[Session] Error:', e);
      setError(e?.message || 'Error loading session');
    } finally {
      setLoading(false);
    }
  }

  async function loadPorts() {
    try {
      const response = await getAvailablePorts(deploymentId, zoneCode!);
      const data = response.data || {};
      const conns: Connection[] = data.connections || [];
      setPortsData(data);
      setConnections(conns);
      setPendingPhotoIds((prev) => {
        const next: Record<string, string[]> = {};
        conns.forEach((conn: any) => {
          next[conn.connection_id] = [
            ...new Set([...(conn.photo_ids || []), ...(prev[conn.connection_id] || [])]),
          ];
        });
        return next;
      });
    } catch (e) {
      console.error('[Session] Error loading ports:', e);
      toast.showError('Failed to load connection data');
      setPortsData({});
      setConnections([]);
    }
  }

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId, zoneCode]);

  // Build the eligible-source list (eligible_items buckets, else legacy items).
  const sourceItems: SourceItem[] = useMemo(() => {
    const eligible = portsData?.eligible_items;
    if (eligible) {
      return [
        ...(eligible.season || []),
        ...(eligible.shared || []),
        ...(eligible.other_zones || []),
      ];
    }
    return Array.isArray(portsData?.items) ? portsData.items : [];
  }, [portsData]);

  const filteredSources = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sourceItems;
    return sourceItems.filter(
      (item) =>
        item.short_name?.toLowerCase().includes(q) ||
        item.item_id?.toLowerCase().includes(q),
    );
  }, [sourceItems, search]);

  async function confirmRemove() {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await updateConnection(deploymentId, removeTarget, {
        removal_reason: removeReason || 'Item removed during session',
      });
      setPendingPhotoIds((prev) => {
        const next = { ...prev };
        delete next[removeTarget];
        return next;
      });
      toast.showSuccess('Item removed from deployment');
      setRemoveTarget(null);
      setRemoveReason('');
      await loadPorts();
    } catch (e) {
      console.error('[Session] Error removing item:', e);
      toast.showError('Failed to remove item');
    } finally {
      setRemoving(false);
    }
  }

  function handlePhotosUpdated(connectionId: string, photoIds: string[]) {
    setPendingPhotoIds((prev) => {
      const existing = prev[connectionId] || [];
      const merged = [...existing];
      photoIds.forEach((pid) => {
        if (!merged.includes(pid)) merged.push(pid);
      });
      return { ...prev, [connectionId]: merged };
    });
  }

  async function handleEndSessionConfirm(notes: string, skipPhotos: boolean) {
    if (!skipPhotos) {
      const updates = Object.keys(pendingPhotoIds)
        .map((connectionId) => {
          const conn = connections.find((c) => c.connection_id === connectionId);
          const existing = (conn?.photo_ids as string[]) || [];
          const newPhotos = (pendingPhotoIds[connectionId] || []).filter(
            (pid) => !existing.includes(pid),
          );
          return { connectionId, newPhotos };
        })
        .filter((u) => u.newPhotos.length > 0)
        .map((u) => updateConnectionPhotos(deploymentId, u.connectionId, u.newPhotos));
      if (updates.length > 0) await Promise.all(updates);
    }
    const response = await endSession(deploymentId, session!.session_id, { notes });
    if (!response?.success) throw new Error('Failed to end session');
    navigate(`/deployments/builder/${deploymentId}/zones/${zoneCode}`);
  }

  if (loading) return <LoadingState label="Loading session…" />;
  if (error || !deployment || !zone || !session)
    return <ErrorState message={error || 'Invalid session'} onRetry={() => navigate(-1 as any)} />;

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/deployments' },
          {
            label: `${deployment.season} ${deployment.year}`,
            to: `/deployments/builder/${deploymentId}/zones`,
          },
          { label: zone.zone_name, to: `/deployments/builder/${deploymentId}/zones/${zoneCode}` },
          { label: 'Active Session' },
        ]}
      />
      <PageHeader
        title={`${zone.zone_code} · ${zone.zone_name}`}
        subtitle={`Session ${session.session_id} · started ${new Date(
          (session as any).start_time,
        ).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`}
        actions={
          <Button color="danger" onPress={() => setEndReviewOpen(true)}>
            End Session
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sources panel */}
        <Card>
          <CardBody className="gap-3">
            <h3 className="text-base font-semibold text-foreground">Sources</h3>
            {sourceItems.length === 0 ? (
              <EmptyState
                icon="🔌"
                title="No sources available"
                message="Items with available ports will appear here"
              />
            ) : (
              <>
                <Input
                  placeholder="Search sources..."
                  value={search}
                  onValueChange={setSearch}
                  size="sm"
                  isClearable
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {filteredSources.length === 0 ? (
                    <p className="col-span-full py-4 text-center text-sm text-default-500">
                      No sources match "{search}"
                    </p>
                  ) : (
                    filteredSources.map((item) => {
                      const isDisabled = !!item.other_zone;
                      return (
                        <button
                          key={item.item_id}
                          disabled={isDisabled}
                          onClick={() => setConnectSource(item)}
                          className={`flex items-center gap-2 rounded-medium border border-default-200 p-2 text-left ${
                            isDisabled ? 'opacity-50' : 'hover:border-secondary'
                          }`}
                        >
                          <SourceIcon itemClass={item.class} />
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-medium text-foreground">
                              {item.short_name}
                            </span>
                            <span className="truncate text-xs text-default-500">{item.item_id}</span>
                          </div>
                          {typeof item.available_count === 'number' && item.available_count >= 0 && (
                            <Chip size="sm" variant="flat">
                              {item.available_count} port{item.available_count !== 1 ? 's' : ''}
                            </Chip>
                          )}
                          {isDisabled && (
                            <Chip size="sm" color="warning" variant="flat">
                              {item.other_zone}
                            </Chip>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* Connections panel */}
        <Card>
          <CardBody className="gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">Connections</h3>
              <Chip size="sm" variant="flat">
                {connections.length}
              </Chip>
            </div>
            {connections.length === 0 ? (
              <EmptyState
                icon="🔗"
                title="No connections yet"
                message="Start by connecting to the receptacle"
              />
            ) : (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,max-content)_auto_minmax(0,max-content)_minmax(0,1fr)_auto] items-center gap-x-3 overflow-hidden rounded-medium border border-default-200 text-sm text-foreground">
                {connections.map((conn: any, i: number) => (
                  <div
                    key={conn.connection_id}
                    className={`col-span-full grid grid-cols-subgrid items-center px-3 py-2 ${
                      i > 0 ? 'border-t border-default-200' : ''
                    }`}
                  >
                    <div className="col-start-2 min-w-0 text-right">
                      <div className="truncate font-medium">{conn.from_item_id}</div>
                      <div className="truncate text-xs text-default-400">{conn.from_port}</div>
                    </div>
                    <span className="text-default-400">→</span>
                    <div className="min-w-0 text-left">
                      <div className="truncate font-medium">{conn.to_item_id}</div>
                      <div className="truncate text-xs text-default-400">{conn.to_port}</div>
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      aria-label="Deactivate connection"
                      className="col-start-6 justify-self-end"
                      onPress={() => {
                        setRemoveTarget(conn.connection_id);
                        setRemoveReason('');
                      }}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {connectSource && (
        <ConnectionModal
          isOpen={!!connectSource}
          onClose={() => setConnectSource(null)}
          sourceItem={connectSource}
          deployment={deployment}
          zone={zone}
          session={session}
          zones={zones}
          activeConnections={connections}
          onCreated={() => {
            toast.showSuccess('Connection created');
            loadPorts();
          }}
        />
      )}

      <EndSessionReview
        isOpen={endReviewOpen}
        onClose={() => setEndReviewOpen(false)}
        deployment={deployment}
        zone={zone}
        session={session}
        connections={connections}
        pendingPhotoIds={pendingPhotoIds}
        onPhotosUpdated={handlePhotosUpdated}
        onConfirm={handleEndSessionConfirm}
      />

      {/* Remove-connection reason modal (replaces the vanilla prompt()) */}
      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} backdrop="blur">
        <ModalContent>
          <ModalHeader>Remove Item</ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Why are you removing this item? (optional)
            </p>
            <Input
              placeholder="Removal reason"
              value={removeReason}
              onValueChange={setRemoveReason}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button color="danger" isLoading={removing} onPress={confirmRemove}>
              Remove
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
