import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader, Button, Chip, Spinner } from '@heroui/react';
import { Plus } from 'lucide-react';
import { Breadcrumbs, PageHeader, Typography, useConfig } from '@spookydecs/ui';
import { getItemCosts } from '../api/financeApi';
import { formatDate, type CostRecord } from '../config/financeConfig';

// Resolve the items-admin sub URL for the current environment. finance and items
// share the same subdomain prefix (dev-/demo-/none), so derive items from the
// finance hostname; honor a config-provided ITEMS_ADMIN override if present, and
// fall back to dev for localhost. (#333 — fixes the previously hardcoded dev URL.)
function resolveItemsAdminUrl(override?: unknown): string {
  if (typeof override === 'string' && override) return override.replace(/\/$/, '');
  const host = window.location.hostname;
  if (host.includes('localhost')) return 'https://dev-items.spookydecs.com';
  if (host.startsWith('dev-')) return 'https://dev-items.spookydecs.com';
  if (host.startsWith('demo-')) return 'https://demo-items.spookydecs.com';
  return 'https://items.spookydecs.com';
}

const COST_TYPE_LABELS: Record<string, string> = {
  acquisition: 'Purchase',
  repair: 'Repair',
  maintenance: 'Maintenance',
  build: 'Build',
  supply_purchase: 'Supply Purchase',
  gift: 'Gift',
  other: 'Other',
};
const BREAKDOWN_LABELS: Record<string, string> = {
  acquisition: 'Purchase',
  repair: 'Repairs',
  maintenance: 'Maintenance',
  build: 'Build',
  supply_purchase: 'Supplies',
  gift: 'Gifts',
  other: 'Other',
};
const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Materials',
  labor: 'Labor',
  parts: 'Parts',
  consumables: 'Consumables',
  decoration: 'Decoration',
  light: 'Light',
  accessory: 'Accessory',
  other: 'Other',
};

interface Summary {
  total_cost: number;
  current_value: number;
  breakdown: Record<string, { count: number; amount: number }>;
}

export default function ItemCostsPage() {
  const { itemId: routeId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const config = useConfig();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const result = await getItemCosts(routeId!);
        setData(result);
      } catch (err: any) {
        console.error('Error loading item costs:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [routeId]);

  const itemId: string = data?.item_id || data?.idea_id || data?.record_id || routeId;
  const itemDetails = data?.item_details || data?.idea_details || data?.record_details;
  const costs: CostRecord[] = useMemo(() => data?.costs || [], [data]);

  const summary = useMemo<Summary>(() => {
    const isRetired = itemDetails?.status === 'Retired';
    const provided = data?.summary;
    if (provided && provided.total_cost > 0) {
      return { ...provided, current_value: isRetired ? 0 : provided.current_value };
    }
    const s: Summary = { total_cost: 0, current_value: 0, breakdown: {} };
    costs.forEach((cost) => {
      const totalCost = parseFloat(cost.total_cost as any) || 0;
      const value = parseFloat(cost.value as any) || totalCost;
      s.total_cost += totalCost;
      if (!isRetired) s.current_value += value;
      const costType = (cost.cost_type as string) || 'other';
      if (!s.breakdown[costType]) s.breakdown[costType] = { count: 0, amount: 0 };
      s.breakdown[costType].count++;
      s.breakdown[costType].amount += totalCost;
    });
    return s;
  }, [data, costs, itemDetails]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading costs…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3 p-5">
        <Typography type="h5" className="text-foreground">
          Error Loading Item Costs
        </Typography>
        <p className="text-default-500">{error}</p>
        <Button variant="flat" onPress={() => navigate('/')}>
          Back to Finance
        </Button>
      </div>
    );
  }

  const itemName = itemDetails?.short_name || itemId;
  const itemClassType = itemDetails?.class_type || '';
  const isRetired = itemDetails?.status === 'Retired';
  const breakdownEntries = Object.entries(summary.breakdown || {});

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Finance', to: '/' }, { label: itemName }]} />
      <PageHeader
        title={itemName}
        icon={
          isRetired ? (
            <Chip size="sm" variant="flat">
              Retired
            </Chip>
          ) : undefined
        }
        subtitle={`${itemId}${itemClassType ? ` • ${itemClassType}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button color="primary" startContent={<Plus size={16} />} onPress={() => navigate(`/new?item_id=${itemId}`)}>
              Add New Cost
            </Button>
            {itemDetails && (
              <Button
                variant="flat"
                onPress={() => {
                  window.location.href = `${resolveItemsAdminUrl(config.ITEMS_ADMIN)}/${itemId}`;
                }}
              >
                View Item Details →
              </Button>
            )}
          </div>
        }
      />

      <section className="mb-6">
        <Typography type="h6" className="mb-3 text-foreground">
          💰 Financial Summary
        </Typography>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card shadow="sm" className="bg-content1">
            <CardBody className="gap-1">
              <span className="text-tiny uppercase tracking-wide text-default-500">Total Cost</span>
              <span className="text-2xl font-semibold text-foreground">${summary.total_cost.toFixed(2)}</span>
              <span className="text-tiny text-default-500">
                {costs.length} record{costs.length !== 1 ? 's' : ''}
              </span>
            </CardBody>
          </Card>
          <Card shadow="sm" className="bg-content1">
            <CardBody className="gap-1">
              <span className="text-tiny uppercase tracking-wide text-default-500">Current Value</span>
              <span className="text-2xl font-semibold text-foreground">${summary.current_value.toFixed(2)}</span>
              <span className="text-tiny text-default-500">Estimated current worth</span>
            </CardBody>
          </Card>
          <Card shadow="sm" className="bg-content1">
            <CardBody className="gap-1">
              <span className="text-tiny uppercase tracking-wide text-default-500">Total Records</span>
              <span className="text-2xl font-semibold text-foreground">{costs.length}</span>
              <span className="text-tiny text-default-500">All cost entries for this item</span>
            </CardBody>
          </Card>
        </div>
      </section>

      {breakdownEntries.length > 0 && (
        <section className="mb-6">
          <Typography type="h6" className="mb-3 text-foreground">
            📊 Cost Breakdown
          </Typography>
          <Card shadow="sm" className="bg-content1">
            <CardBody className="gap-2">
              {breakdownEntries.map(([type, d]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-foreground">{BREAKDOWN_LABELS[type] || type}</span>
                  <span className="flex items-center gap-3 text-small">
                    <span className="text-default-500">
                      {d.count} record{d.count !== 1 ? 's' : ''}
                    </span>
                    <span className="font-medium text-foreground">${(d.amount || 0).toFixed(2)}</span>
                  </span>
                </div>
              ))}
            </CardBody>
          </Card>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <Typography type="h6" className="text-foreground">
            Cost History ({costs.length})
          </Typography>
          <Button isIconOnly size="sm" variant="flat" aria-label="Add new cost" onPress={() => navigate(`/new?item_id=${itemId}`)}>
            <Plus size={16} />
          </Button>
        </div>
        {costs.length === 0 ? (
          <p className="p-5 text-default-500">No cost records found for this item.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {costs.map((cost) => {
              const isPack = cost.class_type === 'pack';
              const hasReceipt = !!((cost as any).receipt_data?.image_id || (cost as any).receipt_data?.image_url);
              const displayAmount = isPack
                ? parseFloat((cost as any).cost_per_item || 0).toFixed(2)
                : parseFloat((cost.total_cost as any) || 0).toFixed(2);
              return (
                <Card
                  key={cost.cost_id}
                  isPressable
                  isHoverable
                  shadow="sm"
                  className="bg-content1"
                  onPress={() => navigate(`/costs/${cost.cost_id}`)}
                >
                  <CardHeader className="flex items-center justify-between pb-0">
                    <span className="text-tiny text-default-500">{formatDate(cost.cost_date as string)}</span>
                    <span className="flex items-center gap-1">
                      {isPack && (
                        <Chip size="sm" color="secondary" variant="flat">
                          PACK
                        </Chip>
                      )}
                      {hasReceipt && <span title="Receipt on file">📄</span>}
                    </span>
                  </CardHeader>
                  <CardBody className="gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{COST_TYPE_LABELS[cost.cost_type as string] || cost.cost_type}</span>
                      <span className="font-semibold text-foreground">${displayAmount}</span>
                    </div>
                    {cost.description && <p className="text-small text-default-500">{cost.description}</p>}
                    <div className="text-tiny text-default-500">
                      {cost.vendor}
                      {cost.category && ` • ${CATEGORY_LABELS[cost.category as string] || cost.category}`}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
