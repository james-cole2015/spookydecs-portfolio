import { useEffect, useMemo, useState } from 'react';
import { Card, CardBody, Chip, Image, Select, SelectItem, Input } from '@heroui/react';
import { Ruler } from 'lucide-react';
import { itemsAPI, type ItemRecord } from '../api/storageApi';
import { getPlaceholderImage, seasonChipColor } from '../config/storageConfig';
import { Breadcrumbs, PageHeader, LoadingState, ErrorState, EmptyState, Typography, useConfig } from '@spookydecs/ui';

function sd(item: ItemRecord): Record<string, unknown> {
  return (item.storage_data as Record<string, unknown>) ?? {};
}

export default function NonPackablePage() {
  const config = useConfig();
  const itemsAdminUrl = (config.ITEMS_ADMIN as string) || 'https://dev-items.spookydecs.com';

  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState('All');
  const [stored, setStored] = useState('All');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const all = await itemsAPI.getAll({});
      setItems(
        all.filter(
          (i) =>
            sd(i).packable === false && i.class !== 'Deployment' && i.class !== 'Storage' && i.class_type !== 'Receptacle',
        ),
      );
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let res = [...items];
    if (season !== 'All') res = res.filter((i) => i.season === season);
    if (stored !== 'All') {
      res = res.filter((i) => (stored === 'stored' ? sd(i).is_stored === true : sd(i).is_stored !== true));
    }
    const term = search.toLowerCase().trim();
    if (term) {
      res = res.filter(
        (i) => i.id.toLowerCase().includes(term) || String((i.short_name as string) ?? '').toLowerCase().includes(term),
      );
    }
    return res;
  }, [items, season, stored, search]);

  if (loading) return <LoadingState label="Loading items…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Storage', to: '/' }, { label: 'Large & Oversized' }]} />
      <PageHeader title="Large & Oversized" icon={<Ruler size={26} />} subtitle="Oversized items stored directly by location — not packed in totes." />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-default-200 bg-content2/60 p-3">
        <Input size="sm" variant="bordered" label="Search" placeholder="Search items…" value={search} onValueChange={setSearch} isClearable onClear={() => setSearch('')} className="max-w-xs" />
        <Select size="sm" variant="bordered" label="Season" className="w-40" classNames={{ trigger: 'bg-content3/50 data-[hover=true]:bg-content3' }} selectedKeys={season !== 'All' ? [season] : []} onChange={(e) => setSeason(e.target.value || 'All')}>
          {['All', 'Halloween', 'Christmas', 'Shared'].map((s) => (
            <SelectItem key={s}>{s}</SelectItem>
          ))}
        </Select>
        <Select size="sm" variant="bordered" label="Status" className="w-40" classNames={{ trigger: 'bg-content3/50 data-[hover=true]:bg-content3' }} selectedKeys={stored !== 'All' ? [stored] : []} onChange={(e) => setStored(e.target.value || 'All')}>
          <SelectItem key="All">All</SelectItem>
          <SelectItem key="stored">Stored</SelectItem>
          <SelectItem key="unstored">Not Stored</SelectItem>
        </Select>
      </div>

      <Typography type="body-sm" className="mb-3 text-default-500">
        {filtered.length === items.length ? `${items.length} items` : `${filtered.length} of ${items.length} items`}
      </Typography>

      {filtered.length === 0 ? (
        <EmptyState icon="📐" title="No items found" message={items.length === 0 ? 'No large or oversized items yet.' : 'No items match the current filters.'} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const images = (item.images as Record<string, string> | undefined) ?? {};
            const photo = images.thumb_cloudfront_url || images.photo_url || getPlaceholderImage();
            const isStored = sd(item).is_stored === true;
            const location = sd(item).location as string | undefined;
            return (
              <Card
                key={item.id}
                isPressable
                isHoverable
                shadow="md"
                onPress={() => window.location.assign(`${itemsAdminUrl}/items/${item.id}`)}
                className="bg-content1"
              >
                <CardBody className="flex flex-row gap-3">
                  <Image src={photo} alt={String((item.short_name as string) ?? item.id)} width={64} height={64} radius="lg" className="h-16 w-16 object-cover" />
                  <div className="min-w-0 flex-1">
                    <Typography type="h6" as="div" className="truncate text-foreground">{(item.short_name as string) ?? 'Unnamed Item'}</Typography>
                    <Typography type="body-xs" as="div" className="truncate text-default-500">{item.id}</Typography>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Chip size="sm" variant="flat" color={seasonChipColor(String(item.season))}>{String(item.season ?? '—')}</Chip>
                      <Chip size="sm" variant="flat" classNames={isStored ? { base: 'bg-sky-500/20', content: 'text-sky-300' } : undefined} color={isStored ? undefined : 'default'}>
                        {isStored ? `Stored @ ${location ?? '?'}` : 'Not Stored'}
                      </Chip>
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
