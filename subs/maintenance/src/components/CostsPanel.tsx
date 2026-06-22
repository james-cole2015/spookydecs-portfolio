import { useEffect, useState } from 'react';
import { Card, CardBody, Spinner, Link as HeroLink } from '@heroui/react';
import { Typography } from '@spookydecs/ui';
import { fetchItemCosts, getCostsUrl } from '../api/maintenanceApi';
import { formatCurrency } from '../config/maintenanceConfig';

const LIMIT = 10;

interface CostRow {
  cost_id: string;
  item_name?: string;
  total_cost?: number;
  cost_date?: string;
  cost_type?: string;
}

/**
 * Maintenance costs summary + recent list for an item. Fetches /finance/costs/item/{id},
 * keeps only cost_type === 'maintenance', newest first. Ported from RecordDetailTabs.renderCostsContent.
 */
export default function CostsPanel({ itemId }: { itemId: string }) {
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [costsUrl, setCostsUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [data, url] = await Promise.all([
          fetchItemCosts(itemId),
          getCostsUrl().catch(() => ''),
        ]);
        const maintenanceCosts = ((data.costs || []) as unknown as CostRow[])
          .filter((c) => c.cost_type === 'maintenance')
          .sort((a, b) => (b.cost_date || '').localeCompare(a.cost_date || ''));
        setCosts(maintenanceCosts);
        setCostsUrl(url);
      } catch (err) {
        console.error('Failed to load costs:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [itemId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label="Loading cost records…" />
      </div>
    );
  }

  if (error) return <p className="p-4 text-danger">Failed to load cost records.</p>;

  const total = costs.reduce((sum, c) => sum + (c.total_cost || 0), 0);
  const recent = costs.slice(0, LIMIT);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardBody className="flex flex-row gap-8">
          <div>
            <Typography type="body-xs" className="text-default-500">
              Total
            </Typography>
            <Typography type="h4">{formatCurrency(total)}</Typography>
          </div>
          <div>
            <Typography type="body-xs" className="text-default-500">
              Records
            </Typography>
            <Typography type="h4">{costs.length}</Typography>
          </div>
        </CardBody>
      </Card>

      <div>
        <Typography type="h6" className="mb-2">
          Recent Maintenance Costs
        </Typography>
        {recent.length === 0 ? (
          <p className="text-default-500">No maintenance costs recorded for this item.</p>
        ) : (
          <div className="flex flex-col divide-y divide-default-100">
            {recent.map((c) => (
              <div key={c.cost_id} className="flex items-center justify-between gap-3 py-2">
                <span className="font-mono text-tiny text-default-500">
                  {costsUrl ? (
                    <HeroLink isExternal href={`${costsUrl}/costs/${c.cost_id}`} size="sm">
                      {c.cost_id}
                    </HeroLink>
                  ) : (
                    c.cost_id
                  )}
                </span>
                <span className="flex-1 truncate text-default-600">{c.item_name || '—'}</span>
                <span className="font-semibold">{formatCurrency(c.total_cost || 0)}</span>
              </div>
            ))}
            {costs.length > LIMIT && (
              <p className="pt-2 text-tiny text-default-400">
                {costs.length - LIMIT} more — view all in Finance
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
