import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Spinner,
} from '@heroui/react';
import { useToast } from '@spookydecs/ui';
import { searchItems, createPlacement } from '../api/deploymentsApi';
import type { Deployment, Zone, Session, Connection } from '../config/deploymentsConfig';

interface StaticProp {
  id: string;
  short_name?: string;
  class?: string;
  status?: string;
  male_ends?: number | string;
  female_ends?: number | string;
  power_inlet?: boolean;
}

/** Mirror ConnectionModal.getExcludedItemIds(), extended to also exclude items
 *  held by an active placement. Reconciles the persisted zone.items_deployed
 *  against the live active connections + placements for this session, so
 *  mid-session removals stop excluding their item. */
function getExcludedItemIds(
  zones: Zone[],
  activeConnections: Connection[],
  activePlacements: { item_id?: string }[],
): Set<string> {
  const deployedAcrossZones = new Set<string>(
    zones.flatMap((z) => ((z as any).items_deployed || []) as string[]),
  );
  const activeItemIds = new Set<string>(
    [
      ...activeConnections.map((c: any) => c.to_item_id),
      ...activePlacements.map((p) => p.item_id),
    ].filter(Boolean) as string[],
  );
  activeItemIds.forEach((id) => deployedAcrossZones.add(id));
  zones
    .flatMap((z) => ((z as any).items_deployed || []) as string[])
    .forEach((id) => {
      if (!activeItemIds.has(id)) deployedAcrossZones.delete(id);
    });
  return deployedAcrossZones;
}

export function StaticPropModal({
  isOpen,
  onClose,
  deployment,
  zone,
  session,
  zones,
  activeConnections,
  activePlacements,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  deployment: Deployment;
  zone: Zone;
  session: Session;
  zones: Zone[];
  activeConnections: Connection[];
  activePlacements: { item_id?: string }[];
  onCreated: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<StaticProp[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<StaticProp | null>(null);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelected(null);
    setSearch('');
    (async () => {
      try {
        const response = await searchItems({
          season: deployment.season,
          connection_building: 'true',
        });
        const items: StaticProp[] = response?.data?.items || [];
        const excludedIds = getExcludedItemIds(zones, activeConnections, activePlacements);
        // Static prop = staged for this deployment with no power ports at all.
        const eligible = items.filter((item: any) => {
          const noPorts =
            parseInt(item.male_ends || 0, 10) === 0 &&
            parseInt(item.female_ends || 0, 10) === 0 &&
            item.power_inlet !== true;
          const isStaged = item.status === 'Staged';
          return noPorts && isStaged && !excludedIds.has(item.id);
        });
        setAllItems(eligible);
      } catch (error) {
        console.error('[StaticPropModal] Failed to load props:', error);
        toast.showError('Failed to load props. Please close and try again.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.short_name?.toLowerCase().includes(q) || item.id?.toLowerCase().includes(q),
    );
  }, [allItems, search]);

  async function confirmPlacement() {
    if (!selected) return;
    setPlacing(true);
    try {
      await createPlacement(deployment.deployment_id, {
        session_id: session.session_id,
        session_deployment_item_id: (session as any).deployment_item_id,
        zone_code: zone.zone_code,
        item_id: selected.id,
        notes: '',
      });
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('[StaticPropModal] Error placing prop:', error);
      toast.showError('Failed to deploy prop: ' + (error?.message || ''));
      setPlacing(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur" size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Deploy Static Prop</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-600">
            Select a staged, non-powered prop to place in <strong>{zone.zone_name}</strong>:
          </p>
          <Input
            placeholder="Search props..."
            value={search}
            onValueChange={setSearch}
            size="sm"
            isClearable
          />
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner color="secondary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-default-500">
                {allItems.length === 0 ? 'No static props available' : 'No props match your search'}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className={`flex items-center justify-between rounded-medium border p-2 text-left ${
                      selected?.id === item.id
                        ? 'border-secondary bg-secondary-50/40'
                        : 'border-default-200 hover:border-default-400'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">{item.short_name}</span>
                      <span className="text-xs text-default-500">{item.id}</span>
                    </div>
                    <span className="text-xs text-default-400">{item.class}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="primary"
            isDisabled={!selected}
            isLoading={placing}
            onPress={confirmPlacement}
          >
            Deploy
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
