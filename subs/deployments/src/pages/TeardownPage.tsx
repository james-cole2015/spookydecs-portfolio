import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Tabs,
  Tab,
} from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { Breadcrumbs, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader, useToast } from '@spookydecs/ui';
import {
  getDeployment,
  searchItems,
  apiTeardownStart,
  apiTeardownItem,
  apiTeardownComplete,
} from '../api/deploymentsApi';
import { StatusChip } from '../components/StatusChip';
import type { Deployment } from '../config/deploymentsConfig';

const ZONE_ORDER: Record<string, number> = { FY: 1, BY: 2, SY: 3 };
const ZONE_ICON: Record<string, string> = { FY: '🏡', BY: '🌳', SY: '🏠' };
const CLASS_ORDER = ['Decoration', 'Light', 'Accessory'];

interface TItem {
  id: string;
  short_name?: string;
  status?: string;
  class?: string;
}
interface TZone {
  zone_code: string;
  zone_name: string;
  items_deployed: TItem[];
}

async function hydrateZones(zones: any[]): Promise<TZone[]> {
  const [deployedRes, teardownRes] = await Promise.all([
    searchItems({ status: 'Deployed' }),
    searchItems({ status: 'TearDown' }),
  ]);
  const itemMap: Record<string, TItem> = {};
  [...(deployedRes.data?.items || []), ...(teardownRes.data?.items || [])].forEach((item: any) => {
    itemMap[item.id] = item;
  });
  return zones.map((zone) => ({
    ...zone,
    items_deployed: (zone.items_deployed || []).map((idOrObj: any) =>
      typeof idOrObj === 'object' && idOrObj !== null
        ? idOrObj
        : itemMap[idOrObj] || { id: idOrObj, short_name: idOrObj, status: 'Unknown', class: 'Unknown' },
    ),
  }));
}

export default function TeardownPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const deploymentId = id!;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [zones, setZones] = useState<TZone[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [isStarted, setIsStarted] = useState(false);
  const [starting, setStarting] = useState(false);
  const [tearingDown, setTearingDown] = useState<string | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const deploymentResponse = await getDeployment(deploymentId, ['zones']);
      const data = deploymentResponse.data;
      const dep = data.metadata && data.zones ? data.metadata : data;
      const rawZones = data.zones || [];
      const hydrated = await hydrateZones(rawZones);
      const sorted = hydrated.sort(
        (a, b) => (ZONE_ORDER[a.zone_code] || 99) - (ZONE_ORDER[b.zone_code] || 99),
      );
      setDeployment(dep);
      setZones(sorted);
      setIsStarted(dep.status === 'active_teardown');
      if (sorted.length > 0) setActiveTab(sorted[0].zone_code);
    } catch (e: any) {
      console.error('[Teardown] Error:', e);
      setError(e?.message || 'Failed to load teardown');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deploymentId]);

  async function handleStart() {
    setStarting(true);
    try {
      await apiTeardownStart(deploymentId);
      setIsStarted(true);
      setDeployment((prev) => (prev ? { ...prev, status: 'active_teardown' } : prev));
    } catch (e: any) {
      toast.showError('Failed to start teardown: ' + (e?.message || ''));
    } finally {
      setStarting(false);
    }
  }

  async function handleTeardownItem(itemId: string, zoneCode: string) {
    setTearingDown(itemId);
    try {
      await apiTeardownItem(deploymentId, itemId);
      setZones((prev) =>
        prev.map((z) =>
          z.zone_code === zoneCode
            ? {
                ...z,
                items_deployed: z.items_deployed.map((i) =>
                  i.id === itemId ? { ...i, status: 'TearDown' } : i,
                ),
              }
            : z,
        ),
      );
    } catch (e: any) {
      toast.showError('Failed to tear down item: ' + (e?.message || ''));
    } finally {
      setTearingDown(null);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    try {
      await apiTeardownComplete(deploymentId);
      navigate('/deployments');
    } catch (e: any) {
      toast.showError('Failed to complete teardown: ' + (e?.message || ''));
      setCompleteOpen(false);
      setCompleting(false);
    }
  }

  if (loading) return <LoadingState label="Loading teardown…" />;
  if (error || !deployment)
    return <ErrorState message={error || 'Failed to load'} onRetry={() => navigate(`/deployments/builder/${deploymentId}/zones`)} />;

  return (
    <>
      <Breadcrumbs
        crumbs={[
          { label: 'Deployments', to: '/deployments' },
          { label: deployment.deployment_id, to: `/deployments/builder/${deploymentId}/zones` },
          { label: 'Teardown' },
        ]}
      />
      <PageHeader
        title={deployment.deployment_id}
        subtitle={`${deployment.season || 'Unknown'} · ${deployment.year ?? 'N/A'}`}
        actions={<StatusChip status={deployment.status as string} size="md" />}
      />

      {!isStarted ? (
        <Card>
          <CardBody className="items-center gap-3 py-10 text-center">
            <Trash2 className="text-warning" size={40} />
            <h2 className="text-xl font-semibold text-foreground">Ready to Begin Teardown?</h2>
            <p className="max-w-md text-default-500">
              This will mark the deployment as <strong>active teardown</strong> and allow you to
              remove items zone by zone.
            </p>
            <Button color="primary" isLoading={starting} onPress={handleStart}>
              Start Teardown
            </Button>
          </CardBody>
        </Card>
      ) : (
        <>
          <Tabs
            aria-label="Zones"
            selectedKey={activeTab}
            onSelectionChange={(k) => setActiveTab(String(k))}
            className="mb-4"
          >
            {zones.map((zone) => {
              const tornDown = zone.items_deployed.filter((i) => i.status === 'TearDown').length;
              const total = zone.items_deployed.length;
              const allDone = total > 0 && tornDown === total;
              return (
                <Tab
                  key={zone.zone_code}
                  title={
                    <div className="flex items-center gap-2">
                      <span>
                        {ZONE_ICON[zone.zone_code]} {zone.zone_name}
                      </span>
                      <Chip size="sm" variant="flat" color={allDone ? 'success' : 'default'}>
                        {tornDown}/{total}
                      </Chip>
                    </div>
                  }
                >
                  <ZonePanel
                    zone={zone}
                    tearingDown={tearingDown}
                    onTeardown={(itemId) => handleTeardownItem(itemId, zone.zone_code)}
                  />
                </Tab>
              );
            })}
          </Tabs>

          <Card className="sticky bottom-4">
            <CardBody className="flex-row flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-default-500">
                Completing teardown will archive this deployment. This cannot be undone.
              </p>
              <Button color="danger" onPress={() => setCompleteOpen(true)}>
                Complete Teardown
              </Button>
            </CardBody>
          </Card>
        </>
      )}

      <ConfirmDialog
        isOpen={completeOpen}
        title="Complete Teardown?"
        body="This will archive the deployment and mark teardown as complete. This cannot be undone."
        confirmLabel="Yes, Complete Teardown"
        isDestructive
        isLoading={completing}
        onConfirm={handleComplete}
        onClose={() => setCompleteOpen(false)}
      />
    </>
  );
}

function ZonePanel({
  zone,
  tearingDown,
  onTeardown,
}: {
  zone: TZone;
  tearingDown: string | null;
  onTeardown: (itemId: string) => void;
}) {
  const items = zone.items_deployed || [];
  if (items.length === 0) {
    return <EmptyState icon="📦" title={`No items deployed in ${zone.zone_name}.`} />;
  }
  const allDone = items.length > 0 && items.every((i) => i.status === 'TearDown');

  const grouped: Record<string, TItem[]> = {};
  items.forEach((item) => {
    const cls = item.class || 'Unknown';
    (grouped[cls] ||= []).push(item);
  });
  const sortedClasses = Object.keys(grouped).sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a);
    const bi = CLASS_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <div className="flex flex-col gap-4">
      {allDone && (
        <div className="rounded-medium bg-success-50 px-3 py-2 text-sm text-success-700">
          ✓ All items in this zone have been torn down.
        </div>
      )}
      {sortedClasses.map((cls) => (
        <div key={cls}>
          <h3 className="mb-2 text-sm font-semibold text-default-600">{cls}</h3>
          <Table aria-label={`${cls} items`} removeWrapper>
            <TableHeader>
              <TableColumn>ID</TableColumn>
              <TableColumn>NAME</TableColumn>
              <TableColumn>STATUS</TableColumn>
              <TableColumn> </TableColumn>
            </TableHeader>
            <TableBody>
              {grouped[cls].map((item) => {
                const isTornDown = item.status === 'TearDown';
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell>{item.short_name || '—'}</TableCell>
                    <TableCell>
                      <Chip size="sm" variant="flat" color={isTornDown ? 'success' : 'default'}>
                        {item.status || 'Unknown'}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {isTornDown ? (
                        <span className="text-sm text-success">✓ Torn Down</span>
                      ) : (
                        <Button
                          size="sm"
                          color="danger"
                          variant="flat"
                          isLoading={tearingDown === item.id}
                          onPress={() => onTeardown(item.id)}
                        >
                          Tear Down
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
