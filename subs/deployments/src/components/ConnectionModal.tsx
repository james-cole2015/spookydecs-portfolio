import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Tabs,
  Tab,
  Spinner,
} from '@heroui/react';
import { useToast } from '@spookydecs/ui';
import { searchItems, createConnection } from '../api/deploymentsApi';
import type { Deployment, Zone, Session, Connection } from '../config/deploymentsConfig';

interface SourceItem {
  item_id: string;
  short_name?: string;
  available_ports?: string[];
}

interface DestinationItem {
  id: string;
  short_name?: string;
  class?: string;
  male_ends?: number | string;
  power_inlet?: boolean;
}

/** Mirror the vanilla getExcludedItemIds(): everything already deployed across
 *  zones, reconciled against the live active connections for this session. */
function getExcludedItemIds(zones: Zone[], activeConnections: Connection[]): Set<string> {
  const deployedAcrossZones = new Set<string>(
    zones.flatMap((z) => ((z as any).items_deployed || []) as string[]),
  );
  const activeItemIds = new Set<string>(
    activeConnections.map((c: any) => c.to_item_id).filter(Boolean),
  );
  activeItemIds.forEach((id) => deployedAcrossZones.add(id));
  zones
    .flatMap((z) => ((z as any).items_deployed || []) as string[])
    .forEach((id) => {
      if (!activeItemIds.has(id)) deployedAcrossZones.delete(id);
    });
  return deployedAcrossZones;
}

export function ConnectionModal({
  isOpen,
  onClose,
  sourceItem,
  deployment,
  zone,
  session,
  zones,
  activeConnections,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  sourceItem: SourceItem;
  deployment: Deployment;
  zone: Zone;
  session: Session;
  zones: Zone[];
  activeConnections: Connection[];
  onCreated: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [allItems, setAllItems] = useState<DestinationItem[]>([]);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [selected, setSelected] = useState<DestinationItem | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Illuminate step (shown only when the selected destination is a Light)
  const [step, setStep] = useState<'destination' | 'illuminate'>('destination');
  const [illuminates, setIlluminates] = useState<string[]>([]);
  const [decorations, setDecorations] = useState<DestinationItem[]>([]);
  const [illumSearch, setIllumSearch] = useState('');
  const [illumLoading, setIllumLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelected(null);
    setStep('destination');
    setIlluminates([]);
    setDecorations([]);
    setIllumSearch('');
    (async () => {
      try {
        const response = await searchItems({
          season: deployment.season,
          connection_building: 'true',
        });
        const items: DestinationItem[] = response?.data?.items || [];
        const excludedIds = getExcludedItemIds(zones, activeConnections);
        const eligible = items.filter((item: any) => {
          const hasMaleEnd = parseInt(item.male_ends || 0, 10) > 0;
          const hasPowerInlet = item.power_inlet === true;
          return (hasMaleEnd || hasPowerInlet) && !excludedIds.has(item.id);
        });
        setAllItems(eligible);
      } catch (error) {
        console.error('[ConnectionModal] Failed to load destinations:', error);
        toast.showError('Failed to load items. Please close and try again.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allItems.filter((item) => {
      const matchesClass = classFilter === 'all' || item.class === classFilter;
      const matchesSearch =
        !q ||
        item.short_name?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q);
      return matchesClass && matchesSearch;
    });
  }, [allItems, search, classFilter]);

  const filteredDecorations = useMemo(() => {
    const q = illumSearch.toLowerCase().trim();
    return decorations.filter((item) => {
      return (
        !q ||
        item.short_name?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q)
      );
    });
  }, [decorations, illumSearch]);

  async function loadDecorations() {
    setIllumLoading(true);
    try {
      const response = await searchItems({
        season: deployment.season,
        class: 'Decoration',
      });
      const items: DestinationItem[] = response?.data?.items || [];
      // Exclude the source and destination items themselves.
      const excluded = new Set<string>([sourceItem.item_id, selected?.id].filter(Boolean) as string[]);
      setDecorations(items.filter((item) => !excluded.has(item.id)));
    } catch (error) {
      console.error('[ConnectionModal] Failed to load decorations:', error);
      toast.showError('Failed to load decorations. You can still connect without selecting any.');
      setDecorations([]);
    } finally {
      setIllumLoading(false);
    }
  }

  function handlePrimaryPress() {
    if (!selected) return;
    if (step === 'destination' && selected.class === 'Light') {
      setStep('illuminate');
      loadDecorations();
      return;
    }
    confirmConnection();
  }

  function toggleIlluminate(id: string) {
    setIlluminates((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function confirmConnection() {
    if (!sourceItem || !selected) return;
    const fromPort = sourceItem.available_ports?.[0];
    if (!fromPort) {
      toast.showError('No available ports on this source item.');
      return;
    }
    setConnecting(true);
    try {
      const toPort = parseInt(String(selected.male_ends || 0), 10) > 0 ? 'Male_1' : 'Power_Inlet';
      const connectionData = {
        session_id: session.session_id,
        session_deployment_item_id: (session as any).deployment_item_id,
        zone_code: zone.zone_code,
        from_item_id: sourceItem.item_id,
        from_port: fromPort,
        to_item_id: selected.id,
        to_port: toPort,
        illuminates,
        notes: '',
      };
      await createConnection(deployment.deployment_id, connectionData);
      onCreated();
      onClose();
    } catch (error: any) {
      console.error('[ConnectionModal] Error creating connection:', error);
      toast.showError('Failed to create connection: ' + (error?.message || ''));
      setConnecting(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} backdrop="blur" size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>
          {step === 'destination'
            ? `Connect: ${sourceItem.short_name}`
            : `What does ${selected?.short_name} illuminate?`}
        </ModalHeader>
        <ModalBody>
          {step === 'destination' ? (
            <>
              <p className="text-sm text-default-600">
                Select what to plug into <strong>{sourceItem.short_name}</strong>:
              </p>
              <Tabs
                aria-label="Class filter"
                selectedKey={classFilter}
                onSelectionChange={(k) => setClassFilter(String(k))}
                size="sm"
              >
                <Tab key="all" title="All" />
                <Tab key="Decoration" title="Decoration" />
                <Tab key="Light" title="Light" />
                <Tab key="Accessory" title="Accessory" />
              </Tabs>
              <Input
                placeholder="Search items..."
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
                    {allItems.length === 0 ? 'No items available' : 'No items match your search'}
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
            </>
          ) : (
            <>
              <p className="text-sm text-default-600">
                Select the decorations <strong>{selected?.short_name}</strong> lights up
                <span className="text-default-400"> (optional)</span>:
              </p>
              <Input
                placeholder="Search decorations..."
                value={illumSearch}
                onValueChange={setIllumSearch}
                size="sm"
                isClearable
              />
              <div className="max-h-80 overflow-y-auto">
                {illumLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner color="secondary" />
                  </div>
                ) : filteredDecorations.length === 0 ? (
                  <p className="py-8 text-center text-sm text-default-500">
                    {decorations.length === 0
                      ? 'No decorations available'
                      : 'No decorations match your search'}
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredDecorations.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleIlluminate(item.id)}
                        className={`flex items-center justify-between rounded-medium border p-2 text-left ${
                          illuminates.includes(item.id)
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
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {step === 'illuminate' && (
            <span className="mr-auto self-center text-xs text-default-500">
              {illuminates.length} selected
            </span>
          )}
          {step === 'destination' ? (
            <Button variant="light" onPress={onClose}>
              Cancel
            </Button>
          ) : (
            <Button variant="light" onPress={() => setStep('destination')}>
              Back
            </Button>
          )}
          <Button
            color="primary"
            isDisabled={!selected}
            isLoading={connecting}
            onPress={handlePrimaryPress}
          >
            {step === 'destination' && selected?.class === 'Light' ? 'Next: Illuminate →' : 'Connect'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
