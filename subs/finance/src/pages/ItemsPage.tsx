import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Input, Spinner } from '@heroui/react';
import { PageHeader, useToast } from '@spookydecs/ui';
import { getAllCosts, getItems } from '../api/financeApi';
import { formatCurrency, type CostRecord } from '../config/financeConfig';

interface ItemRollup {
  item_id: string;
  item_name: string;
  total_cost: number;
  record_count: number;
}

export default function ItemsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [costs, setCosts] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [costsResponse, itemsResponse] = await Promise.all([getAllCosts(), getItems({})]);
        const allCosts: CostRecord[] = costsResponse.costs || costsResponse || [];
        const allItems = Array.isArray(itemsResponse) ? itemsResponse : itemsResponse.items || [];
        const nonRetiredIds = new Set(
          allItems.filter((it: any) => it.status !== 'Retired').map((it: any) => it.id),
        );
        const filtered = allCosts.filter(
          (cost) => !cost.related_item_id || nonRetiredIds.has(cost.related_item_id),
        );
        setCosts(filtered);
      } catch (err) {
        console.error('Failed to load items:', err);
        toast.showError('Failed to load items');
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allItems = useMemo<ItemRollup[]>(() => {
    const map = new Map<string, ItemRollup>();
    costs.forEach((cost) => {
      if (!cost.related_item_id) return;
      const id = cost.related_item_id;
      if (!map.has(id)) {
        map.set(id, { item_id: id, item_name: cost.item_name || id, total_cost: 0, record_count: 0 });
      }
      const entry = map.get(id)!;
      entry.total_cost += (cost.total_cost as number) || 0;
      entry.record_count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total_cost - a.total_cost);
  }, [costs]);

  const items = useMemo(() => {
    const q = query.toLowerCase();
    return q
      ? allItems.filter((i) => i.item_name.toLowerCase().includes(q) || i.item_id.toLowerCase().includes(q))
      : allItems;
  }, [allItems, query]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading items…" />
      </div>
    );
  }
  if (error) {
    return <p className="p-5 text-default-500">Failed to load items.</p>;
  }

  return (
    <div>
      <PageHeader
        title="Items"
        subtitle={`${allItems.length} item${allItems.length !== 1 ? 's' : ''} with costs`}
      />
      <Input
        aria-label="Search items"
        placeholder="Search by item name or ID…"
        className="mb-4 w-full sm:max-w-md"
        value={query}
        onValueChange={setQuery}
        isClearable
        onClear={() => setQuery('')}
      />
      {items.length === 0 ? (
        <p className="p-5 text-default-500">No items match your search.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card
              key={item.item_id}
              isPressable
              isHoverable
              shadow="sm"
              className="bg-content1"
              onPress={() => navigate(`/${item.item_id}`)}
            >
              <CardBody className="gap-1">
                <span className="font-semibold text-foreground">{item.item_name}</span>
                <span className="font-mono text-tiny text-default-500">{item.item_id}</span>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-lg font-semibold text-foreground">{formatCurrency(item.total_cost)}</span>
                  <span className="text-tiny text-default-500">
                    {item.record_count} record{item.record_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
