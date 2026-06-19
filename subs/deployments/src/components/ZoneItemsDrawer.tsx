import { useEffect, useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  Spinner,
  Link as HeroLink,
} from '@heroui/react';
import { Package, Lightbulb, Sparkles } from 'lucide-react';
import { EmptyState, useConfig } from '@spookydecs/ui';
import { getItem, fetchImageById } from '../api/deploymentsApi';

interface DrawerItem {
  id: string;
  short_name?: string;
  class?: string;
  class_type?: string;
  images?: { primary_photo_id?: string };
  _error?: boolean;
}

function PlaceholderIcon({ itemClass }: { itemClass?: string }) {
  switch ((itemClass || '').toLowerCase()) {
    case 'light':
      return <Lightbulb className="text-warning" size={24} />;
    case 'accessory':
      return <Package className="text-default-400" size={24} />;
    default:
      return <Sparkles className="text-secondary" size={24} />;
  }
}

function ItemThumb({ item }: { item: DrawerItem }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const primaryPhotoId = item.images?.primary_photo_id;

  useEffect(() => {
    let cancelled = false;
    if (primaryPhotoId && !item._error) {
      fetchImageById(primaryPhotoId)
        .then((img) => {
          if (!cancelled) setUrl(img?.thumb_cloudfront_url || img?.cloudfront_url || null);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [primaryPhotoId, item._error]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={item.short_name || ''}
        className="h-12 w-12 rounded-medium object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-medium bg-default-100">
      <PlaceholderIcon itemClass={item.class} />
    </div>
  );
}

export function ZoneItemsDrawer({
  isOpen,
  onClose,
  zoneName,
  itemIds,
}: {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  itemIds: string[];
}) {
  const config = useConfig();
  const itemsAdminUrl = (config.ITEMS_ADMIN as string) || '';
  const [items, setItems] = useState<DrawerItem[] | null>(null);

  useEffect(() => {
    if (!isOpen || items !== null) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        itemIds.map((id) =>
          getItem(id)
            .then((res) => res.data || res)
            .catch(() => ({
              id,
              short_name: id,
              class: 'Unknown',
              class_type: 'Unknown',
              _error: true,
            })),
        ),
      );
      if (!cancelled) setItems(results);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, items, itemIds]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right">
      <DrawerContent>
        <DrawerHeader className="flex-col items-start">
          <h2 className="text-lg font-semibold">Items in {zoneName}</h2>
          <span className="text-sm text-default-500">
            {itemIds.length} item{itemIds.length !== 1 ? 's' : ''}
          </span>
        </DrawerHeader>
        <DrawerBody>
          {items === null ? (
            <div className="flex justify-center py-10">
              <Spinner color="secondary" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState icon="📦" title="No items deployed in this zone yet." />
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <HeroLink
                  key={item.id}
                  href={`${itemsAdminUrl}/${item.id}`}
                  isExternal
                  className={`flex items-center gap-3 rounded-medium border border-default-200 p-2 ${
                    item._error ? 'opacity-60' : ''
                  }`}
                >
                  <ItemThumb item={item} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {item.short_name || item.id}
                    </span>
                    <span className="text-xs text-default-500">{item.class_type || ''}</span>
                  </div>
                </HeroLink>
              ))}
            </div>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
