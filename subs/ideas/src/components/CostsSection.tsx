// CostsSection — reads + totals finance cost records linked to an idea.
import { useEffect, useState } from 'react';
import { Spinner } from '@heroui/react';
import { getIdeaCosts } from '../api/ideasApi';
import type { Cost } from '../config/ideasConfig';

export function CostsSection({ ideaId, refreshKey = 0 }: { ideaId: string; refreshKey?: number }) {
  const [costs, setCosts] = useState<Cost[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setCosts(null);
    setError('');
    getIdeaCosts(ideaId)
      .then((c) => active && setCosts(c))
      .catch((err) => active && setError((err as Error).message));
    return () => {
      active = false;
    };
  }, [ideaId, refreshKey]);

  if (error) return <p className="text-small text-danger">Failed to load costs: {error}</p>;
  if (costs === null)
    return (
      <div className="flex justify-center py-3">
        <Spinner size="sm" color="secondary" />
      </div>
    );

  const total = costs.reduce((sum, c) => sum + (parseFloat(String(c.total_cost)) || 0), 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between rounded-medium bg-default-100 px-4 py-2">
        <span className="text-tiny font-semibold uppercase tracking-wide text-default-400">
          Actual
        </span>
        <span className="text-large font-semibold text-foreground">${total.toFixed(2)}</span>
      </div>
      {costs.length === 0 ? (
        <p className="text-small text-default-400">No cost records yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-default-100">
          {costs.map((c, i) => (
            <div key={c.cost_id || i} className="flex flex-col gap-0.5 py-2">
              <div className="flex justify-between">
                <span className="text-small font-medium text-foreground">{c.item_name}</span>
                <span className="text-small font-semibold text-foreground">
                  ${parseFloat(String(c.total_cost)).toFixed(2)}
                </span>
              </div>
              <span className="text-tiny text-default-400">
                {[c.vendor, c.cost_date, c.category].filter(Boolean).join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
