import { Checkbox, Input } from '@heroui/react';
import { useMemo, useState } from 'react';
import type { ItemRecord } from '../api/storageApi';

/** Multi-select list of items with a search box. */
export function ItemPicker({
  items,
  selected,
  onToggle,
}: {
  items: ItemRecord[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return items;
    return items.filter(
      (i) =>
        i.id.toLowerCase().includes(term) ||
        String((i.short_name as string) ?? '').toLowerCase().includes(term),
    );
  }, [items, search]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        size="sm"
        placeholder="Search items…"
        value={search}
        onValueChange={setSearch}
        isClearable
        onClear={() => setSearch('')}
      />
      <div className="max-h-[420px] overflow-y-auto rounded-lg border border-default-100">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-sm text-default-500">No items available.</p>
        ) : (
          filtered.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-3 border-b border-default-100 p-2 last:border-b-0 hover:bg-content2/40"
            >
              <Checkbox isSelected={selected.has(item.id)} onValueChange={() => onToggle(item.id)} color="secondary" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-foreground">{(item.short_name as string) ?? item.id}</div>
                <div className="truncate text-xs text-default-500">
                  {item.id}
                  {item.season ? ` · ${String(item.season)}` : ''}
                </div>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
