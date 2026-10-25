import { Chip } from '@heroui/react';
import { Typography, SeasonChip, useConfig } from '@spookydecs/ui';
import type { StorageUnit } from '../config/storageConfig';
import type { ItemRecord } from '../api/storageApi';
import type { LocationGroup as LocationGroupData } from '../lib/groupByLocation';
import { StorageCard } from './StorageCard';

function sd(item: ItemRecord): Record<string, unknown> {
  return (item.storage_data as Record<string, unknown>) ?? {};
}

export function LocationGroup({
  group,
  canDelete,
  onDelete,
}: {
  group: LocationGroupData;
  canDelete: boolean;
  onDelete?: (u: StorageUnit) => void;
}) {
  const config = useConfig();
  const itemsAdminUrl = (config.ITEMS_ADMIN as string) || 'https://dev-items.spookydecs.com';

  return (
    <div className="flex flex-col gap-3">
      {group.units.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {group.units.map((unit) => (
            <StorageCard key={unit.id} unit={unit} canDelete={canDelete} onDelete={onDelete} />
          ))}
        </div>
      )}
      {group.items.length > 0 && (
        <div className="flex flex-col gap-2">
          {group.items.map((item) => {
            const isStored = sd(item).is_stored === true;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => window.location.assign(`${itemsAdminUrl}/items/${item.id}`)}
                className="flex items-center gap-3 rounded-lg border border-default-200 bg-content1 p-3 text-left hover:bg-content2/60"
              >
                <div className="min-w-0 flex-1">
                  <Typography type="h6" as="div" className="truncate text-foreground">
                    {(item.short_name as string) ?? 'Unnamed Item'}
                  </Typography>
                  <Typography type="body-xs" as="div" className="truncate text-default-500">
                    {item.id}
                  </Typography>
                </div>
                <div className="flex flex-wrap gap-1">
                  <SeasonChip value={String(item.season ?? '')} label={String(item.season ?? '—')} />
                  <Chip size="sm" variant="flat" color={isStored ? undefined : 'default'}>
                    {isStored ? 'Stored' : 'Not Stored'}
                  </Chip>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
