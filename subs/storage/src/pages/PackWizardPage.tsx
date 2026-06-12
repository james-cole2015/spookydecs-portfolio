import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, Button, Tabs, Tab, Select, SelectItem, Checkbox, Chip } from '@heroui/react';
import { Luggage, Package, MapPin, Ruler, Save } from 'lucide-react';
import { storageAPI, itemsAPI, type ItemRecord } from '../api/storageApi';
import STORAGE_CONFIG, { type StorageUnit } from '../config/storageConfig';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, useAuth } from '@spookydecs/ui';
import { ItemPicker } from '../components/ItemPicker';
import { useToast } from '../lib/toast';

function storageData(item: ItemRecord): Record<string, unknown> {
  return (item.storage_data as Record<string, unknown>) ?? {};
}

function isRealItem(item: ItemRecord): boolean {
  return item.class !== 'Deployment' && item.class !== 'Storage';
}

export default function PackWizardPage() {
  const { id } = useParams();
  return id ? <TotePackFlow id={id} /> : <PackChooser />;
}

/* ------------------------- /storage/pack (chooser) ------------------------- */

function PackChooser() {
  const navigate = useNavigate();
  const toast = useToast();
  const { hasMinRole } = useAuth();

  const [storage, setStorage] = useState<StorageUnit[]>([]);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, i] = await Promise.all([storageAPI.getAll({}), itemsAPI.getAll({})]);
        setStorage(s);
        setItems(i.filter(isRealItem));
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load packing data');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const unpackedTotes = useMemo(
    () => storage.filter((u) => u.class_type === 'Tote' && !u.packed),
    [storage],
  );

  // Single Pack: items flagged single_packed (pack in their original box), not yet stored.
  const singleItems = useMemo(
    () =>
      items.filter((i) => {
        const sd = storageData(i);
        return sd.single_packed === true && sd.is_stored === false && i.class_type !== 'Receptacle';
      }),
    [items],
  );

  // Store: oversized / non-packable items (packable === false), not yet stored.
  const storeItems = useMemo(
    () =>
      items.filter((i) => {
        const sd = storageData(i);
        return sd.packable === false && sd.is_stored === false && i.class_type !== 'Receptacle';
      }),
    [items],
  );

  function resetSelection() {
    setSelected(new Set());
    setLocation('');
  }

  function toggle(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }

  async function runFlow(kind: 'single' | 'store') {
    if (selected.size === 0) return toast.showError('Select at least one item');
    if (!location) return toast.showError('Choose a location');
    setBusy(true);
    try {
      const ids = [...selected];
      if (kind === 'single') await storageAPI.packSingleItems(ids, location);
      else await itemsAPI.bulkStore(ids, location);
      toast.showSuccess(`Successfully ${kind === 'single' ? 'packed' : 'stored'} ${ids.length} item(s) in ${location}!`);
      navigate('/storage');
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to complete packing');
    } finally {
      setBusy(false);
    }
  }

  if (!hasMinRole('builder')) {
    return (
      <div>
        <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Packing Wizard' }]} />
        <p className="text-danger">You do not have permission to pack items.</p>
      </div>
    );
  }
  if (loading) return <LoadingState label="Loading packing data…" />;
  if (error) return <ErrorState message={error} />;

  const locationSelect = (
    <Select
      label="Location"
      className="max-w-xs"
      selectedKeys={location ? [location] : []}
      onChange={(e) => setLocation(e.target.value)}
    >
      {STORAGE_CONFIG.LOCATIONS.map((loc) => (
        <SelectItem key={loc}>{loc}</SelectItem>
      ))}
    </Select>
  );

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Packing Wizard' }]} />
      <PageHeader title="Packing Wizard" icon={<Luggage size={26} />} actions={<Button variant="light" onPress={() => navigate('/storage')}>Cancel</Button>} />

      <Tabs aria-label="Packing mode" color="secondary" onSelectionChange={resetSelection}>
        <Tab key="tote" title={<span className="flex items-center gap-2"><Package size={18} /> Pack a Tote</span>}>
          <Card shadow="md" className="bg-content1">
            <CardBody className="gap-3">
              <p className="text-default-500">Choose an unpacked tote to add items to.</p>
              {unpackedTotes.length === 0 ? (
                <p className="text-default-500">No unpacked totes available.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {unpackedTotes.map((tote) => (
                    <Button
                      key={tote.id}
                      variant="flat"
                      className="justify-between"
                      onPress={() => navigate(`/storage/pack/${tote.id}`)}
                    >
                      <span className="truncate">{tote.short_name}</span>
                      <Chip size="sm" variant="flat" color="secondary">{String(tote.season)}</Chip>
                    </Button>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab key="single" title={<span className="flex items-center gap-2"><MapPin size={18} /> Single Pack</span>}>
          <Card shadow="md" className="bg-content1">
            <CardBody className="gap-4">
              <p className="text-default-500">Select items to pack in their original boxes, then choose a location.</p>
              {locationSelect}
              <ItemPicker items={singleItems} selected={selected} onToggle={toggle} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-default-500">{selected.size} selected</span>
                <Button color="primary" isLoading={busy} onPress={() => runFlow('single')}>Pack Items</Button>
              </div>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="store" title={<span className="flex items-center gap-2"><Ruler size={18} /> Oversized</span>}>
          <Card shadow="md" className="bg-content1">
            <CardBody className="gap-4">
              <p className="text-default-500">Select oversized / non-packable items to store directly by location.</p>
              {locationSelect}
              <ItemPicker items={storeItems} selected={selected} onToggle={toggle} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-default-500">{selected.size} selected</span>
                <Button color="primary" isLoading={busy} onPress={() => runFlow('store')}>Store Items</Button>
              </div>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}

/* ----------------------- /storage/pack/:id (tote flow) --------------------- */

function TotePackFlow({ id }: { id: string }) {
  const navigate = useNavigate();
  const toast = useToast();

  const [tote, setTote] = useState<StorageUnit | null>(null);
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [markPacked, setMarkPacked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [raw, all] = await Promise.all([storageAPI.getById(id), itemsAPI.getAll({})]);
        if (!raw) throw new Error('Storage unit not found');
        if (raw.class_type !== 'Tote') {
          toast.showInfo('Pack flow is only available for Tote-type storage units');
          navigate(`/storage/${id}`);
          return;
        }
        if (raw.packed) {
          toast.showInfo('This tote is already marked as packed');
          navigate(`/storage/${id}`);
          return;
        }
        const available = all.filter((item) => {
          if (!isRealItem(item)) return false;
          const sd = storageData(item);
          return sd.packable !== false && sd.is_stored === false && sd.single_packed !== true && item.class_type !== 'Receptacle';
        });
        setTote(raw);
        setItems(available);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load tote data');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggle(itemId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      return next;
    });
  }

  async function complete() {
    const ids = [...selected];
    if (ids.length === 0 && !markPacked) {
      return toast.showError('Select items to add, or mark the tote as packed');
    }
    setBusy(true);
    try {
      if (ids.length > 0) await storageAPI.addItems(id, ids, markPacked);
      else if (markPacked) await storageAPI.update(id, { packed: true });
      const note = ids.length > 0 ? ` ${ids.length} item(s) added.` : '';
      const status = markPacked ? ' Tote marked as packed.' : '';
      toast.showSuccess(`Done!${note}${status}`);
      navigate(`/storage/${id}`);
    } catch (e: any) {
      toast.showError(e?.message ?? 'Failed to save tote changes');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading tote…" />;
  if (error || !tote) return <ErrorState message={error ?? 'Not found'} />;

  return (
    <div>
      <Breadcrumbs
        crumbs={[
          { label: 'Storage', to: '/' },
          { label: 'Totes', to: '/storage' },
          { label: 'Pack', to: '/storage/pack' },
          { label: tote.short_name || tote.id },
        ]}
      />
      <PageHeader title={`Pack: ${tote.short_name}`} icon={<Package size={26} />} />
      <Card shadow="md" className="bg-content1">
        <CardBody className="gap-4">
          <p className="text-default-500">Select unpacked items to add to this tote.</p>
          <ItemPicker items={items} selected={selected} onToggle={toggle} />
          <Checkbox isSelected={markPacked} onValueChange={setMarkPacked} color="secondary">
            Mark this tote as packed when done
          </Checkbox>
          <div className="flex items-center justify-between">
            <span className="text-sm text-default-500">{selected.size} selected</span>
            <div className="flex gap-2">
              <Button variant="light" onPress={() => navigate('/storage/pack')}>Cancel</Button>
              <Button color="primary" variant="shadow" startContent={<Save size={18} />} isLoading={busy} onPress={complete}>Save</Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
