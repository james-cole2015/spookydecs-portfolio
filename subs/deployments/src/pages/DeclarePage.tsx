import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, CardBody, Chip, Checkbox, Input, Tab, Tabs } from '@heroui/react';
import { Camera, X } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState, useToast, usePhotoUpload } from '@spookydecs/ui';
import {
  createPlacement,
  getAvailablePorts,
  getStagingTotes,
  updatePlacement,
} from '../api/deploymentsApi';
import { DEPLOYMENT_CONFIG } from '../config/deploymentsConfig';

interface Candidate {
  id: string;
  short_name?: string;
  class_type?: string;
}

interface Placement {
  placement_id: string;
  item_id: string;
  zone_code: string;
  photo_ids?: string[];
}

/**
 * Declare — assert which staged decorations are physically set up, and where (#638).
 * Writes PLACEMENT- (presence) records only; wiring happens on the Connect tab.
 * Manual select is the fallback input; the chat assistant lands on this page in task 3.
 */
export default function DeclarePage({
  deploymentId,
  season,
  year,
  onChanged,
}: {
  deploymentId: string;
  season: string;
  year: number | string;
  onChanged?: () => void;
}) {
  const toast = useToast();
  const photoUpload = usePhotoUpload();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staged, setStaged] = useState<Candidate[]>([]);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [zone, setZone] = useState<string>(DEPLOYMENT_CONFIG.ZONES[0].zone_code);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [declaring, setDeclaring] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [stagingRes, ...portRes] = await Promise.all([
        getStagingTotes(deploymentId),
        ...DEPLOYMENT_CONFIG.ZONES.map((z) => getAvailablePorts(deploymentId, z.zone_code)),
      ]);

      // Staged = contents of staged totes + staged loose (non-packable) items. The STAGING
      // record is the sole staged signal since #470 — item.status never carries 'Staged'.
      const fromTotes: Candidate[] = (stagingRes?.data?.staged_totes || []).flatMap((t: any) =>
        (t.contents_details || []).map((i: any) => ({
          id: i.id,
          short_name: i.short_name,
          class_type: i.class_type,
        })),
      );
      const loose: Candidate[] = (stagingRes?.data?.staged_non_packable || []).map((i: any) => ({
        id: i.id,
        short_name: i.short_name,
        class_type: i.class_type,
      }));
      setStaged([...fromTotes, ...loose]);

      setPlacements(
        portRes.flatMap((r: any, idx: number) =>
          ((r?.data?.placements || []) as Placement[]).map((p) => ({
            ...p,
            zone_code: p.zone_code || DEPLOYMENT_CONFIG.ZONES[idx].zone_code,
          })),
        ),
      );
    } catch (e: any) {
      console.error('[Declare] load failed:', e);
      setError(e?.message || 'Failed to load declare data');
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  useEffect(() => {
    load();
  }, [load]);

  const names = useMemo(() => new Map(staged.map((c) => [c.id, c])), [staged]);
  const declaredIds = useMemo(() => new Set(placements.map((p) => p.item_id)), [placements]);

  const candidates = useMemo(() => {
    const q = search.toLowerCase().trim();
    return staged.filter(
      (c) =>
        !declaredIds.has(c.id) &&
        (!q || c.short_name?.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)),
    );
  }, [staged, declaredIds, search]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function declareSelected() {
    if (selected.size === 0) return;
    setDeclaring(true);
    const failures: string[] = [];
    // Sequential: each write advances item status and may flip the deployment to active_setup.
    for (const itemId of selected) {
      try {
        await createPlacement(deploymentId, { zone_code: zone, item_id: itemId, notes: '' });
      } catch (e: any) {
        failures.push(`${names.get(itemId)?.short_name || itemId}: ${e?.message || 'failed'}`);
      }
    }
    const ok = selected.size - failures.length;
    if (ok > 0) toast.showSuccess(`Declared ${ok} item${ok !== 1 ? 's' : ''} in ${zone}`);
    if (failures.length > 0) toast.showError(`Could not declare: ${failures.join('; ')}`);
    setSelected(new Set());
    setDeclaring(false);
    await load();
    onChanged?.();
  }

  async function addPhoto(p: Placement) {
    const photos = await photoUpload.openWithEditor({
      context: 'deployment',
      photo_type: 'deployment',
      season,
      year: Number(year),
      entityId: p.item_id,
      metadata: { 'deployment-id': deploymentId },
    });
    if (photos.length === 0) return;
    try {
      await updatePlacement(deploymentId, p.placement_id, { photo_ids: photos.map((x) => x.photo_id) });
      await load();
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to attach photo');
    }
  }

  async function undeclare(p: Placement) {
    try {
      await updatePlacement(deploymentId, p.placement_id, { removal_reason: 'Undeclared' });
      await load();
      onChanged?.();
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to remove item');
    }
  }

  if (loading) return <LoadingState label="Loading declare…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Manual select — fallback input */}
      <Card>
        <CardBody className="gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Staged items</h3>
            <Chip size="sm" variant="flat">
              {candidates.length}
            </Chip>
          </div>

          <Tabs
            aria-label="Zone to declare into"
            size="sm"
            selectedKey={zone}
            onSelectionChange={(k) => setZone(String(k))}
          >
            {DEPLOYMENT_CONFIG.ZONES.map((z) => (
              <Tab key={z.zone_code} title={z.zone_name} data-testid={`declare-zone-${z.zone_code}`} />
            ))}
          </Tabs>

          <Input
            placeholder="Search staged items..."
            value={search}
            onValueChange={setSearch}
            size="sm"
            isClearable
          />

          {candidates.length === 0 ? (
            <EmptyState
              icon="📦"
              title={staged.length === 0 ? 'Nothing staged yet' : 'Nothing left to declare'}
              message={
                staged.length === 0
                  ? 'Stage totes or loose items on the Staging page first'
                  : 'Every staged item is already declared'
              }
            />
          ) : (
            <div className="flex max-h-96 flex-col gap-1 overflow-y-auto">
              {candidates.map((c) => (
                <Checkbox
                  key={c.id}
                  isSelected={selected.has(c.id)}
                  onValueChange={() => toggle(c.id)}
                  data-testid={`declare-candidate-${c.id}`}
                >
                  <span className="text-sm font-medium text-foreground">{c.short_name || c.id}</span>
                  <span className="ml-2 text-xs text-default-500">{c.class_type}</span>
                </Checkbox>
              ))}
            </div>
          )}

          <Button
            color="primary"
            isDisabled={selected.size === 0}
            isLoading={declaring}
            onPress={declareSelected}
            data-testid="declare-submit"
          >
            {selected.size > 0
              ? `Declare ${selected.size} in ${DEPLOYMENT_CONFIG.ZONES.find((z) => z.zone_code === zone)?.zone_name}`
              : 'Select items to declare'}
          </Button>
        </CardBody>
      </Card>

      {/* Declared items — grouped by zone, per-item photos */}
      <Card>
        <CardBody className="gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Declared items</h3>
            <Chip size="sm" variant="flat">
              {placements.length}
            </Chip>
          </div>

          {placements.length === 0 ? (
            <EmptyState icon="🪦" title="Nothing declared yet" message="Declared items appear here and become nodes on the Connect tab" />
          ) : (
            DEPLOYMENT_CONFIG.ZONES.map((z) => {
              const rows = placements.filter((p) => p.zone_code === z.zone_code);
              if (rows.length === 0) return null;
              return (
                <div key={z.zone_code} className="flex flex-col gap-2">
                  <h4 className="text-sm font-medium text-default-600">
                    {z.zone_name} · {rows.length}
                  </h4>
                  {rows.map((p) => (
                    <div
                      key={p.placement_id}
                      className="flex items-center gap-2 rounded-medium border border-default-200 p-2"
                      data-testid={`declared-${p.item_id}`}
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {names.get(p.item_id)?.short_name || p.item_id}
                        </span>
                        <span className="truncate text-xs text-default-500">{p.item_id}</span>
                      </div>
                      {(p.photo_ids?.length || 0) > 0 && (
                        <Chip size="sm" variant="flat">
                          {p.photo_ids!.length} photo{p.photo_ids!.length !== 1 ? 's' : ''}
                        </Chip>
                      )}
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label="Add photo"
                        onPress={() => addPhoto(p)}
                      >
                        <Camera size={16} />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        aria-label="Remove from deployment"
                        onPress={() => undeclare(p)}
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </CardBody>
      </Card>
    </div>
  );
}
