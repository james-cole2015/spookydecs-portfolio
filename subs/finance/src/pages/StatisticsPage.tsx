import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader, Progress, Spinner } from '@heroui/react';
import { PageHeader, Typography, useToast } from '@spookydecs/ui';
import { getCostStats, getItems, type CostStats } from '../api/financeApi';
import { formatCurrency } from '../config/financeConfig';

interface ValueStats {
  totalValue: number;
  bySeason: Record<string, number>;
  byCategory: Record<string, number>;
  itemCount: number;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card shadow="sm" className="bg-content1">
      <CardBody className="gap-1">
        <span className="text-tiny uppercase tracking-wide text-default-500">{label}</span>
        <span className="text-2xl font-semibold text-foreground">{value}</span>
      </CardBody>
    </Card>
  );
}

function BarList({ title, rows }: { title: string; rows: { label: string; amount: number }[] }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <Card shadow="sm" className="bg-content1">
      <CardHeader>
        <Typography type="h6" className="text-foreground">
          {title}
        </Typography>
      </CardHeader>
      <CardBody className="gap-4">
        {rows.length === 0 && <p className="text-default-500">No data available</p>}
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-small">
              <span className="capitalize text-foreground">{r.label}</span>
              <span className="font-medium text-default-600">{formatCurrency(r.amount)}</span>
            </div>
            <Progress aria-label={r.label} value={(r.amount / max) * 100} size="sm" color="secondary" />
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

export default function StatisticsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [stats, setStats] = useState<CostStats | null>(null);
  const [valueStats, setValueStats] = useState<ValueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const s = await getCostStats();
        setStats(s);
        try {
          const response = await getItems({});
          const allItems = Array.isArray(response) ? response : response.items || [];
          const items = allItems.filter((it: any) => it.status !== 'Retired');
          const vs: ValueStats = { totalValue: 0, bySeason: {}, byCategory: {}, itemCount: items.length };
          items.forEach((item: any) => {
            const value = parseFloat(item.vendor_metadata?.value || 0);
            vs.totalValue += value;
            const season = item.season || 'Unknown';
            vs.bySeason[season] = (vs.bySeason[season] || 0) + value;
            const cat = item.class_type || 'Unknown';
            vs.byCategory[cat] = (vs.byCategory[cat] || 0) + value;
          });
          setValueStats(vs);
        } catch (e) {
          console.error('Failed to load value stats:', e);
          setValueStats(null);
        }
      } catch (err) {
        console.error('Failed to load statistics:', err);
        toast.showError('Failed to load statistics');
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner label="Loading statistics…" />
      </div>
    );
  }
  if (error || !stats) {
    return <p className="p-5 text-default-500">Failed to load statistics.</p>;
  }

  const totalAmount = stats.total_amount || 0;
  const totalRecords = stats.total_records || 0;
  const avgCost = totalRecords > 0 ? totalAmount / totalRecords : 0;
  const thisYear = String(new Date().getFullYear());
  const thisYearAmount = Object.entries(stats.by_month || {})
    .filter(([month]) => month.startsWith(thisYear))
    .reduce((sum, [, d]) => sum + d.amount, 0);

  const categories = Object.entries(stats.by_category || {}).sort((a, b) => b[1].amount - a[1].amount);
  const types = Object.entries(stats.by_type || {})
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([type, d]) => ({ label: type.replace('_', ' '), amount: d.amount }));
  const topVendors = Object.entries(stats.by_vendor || {})
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 5)
    .map(([vendor, d]) => ({ label: vendor, amount: d.amount }));

  const mostExpensiveCategory = categories[0];
  const topVendor = Object.entries(stats.by_vendor || {}).sort((a, b) => b[1].amount - a[1].amount)[0];
  const giftValue = stats.by_type['gift']?.amount || 0;
  const giftPct = totalAmount > 0 ? ((giftValue / totalAmount) * 100).toFixed(0) : '0';
  const overheadCats = ['materials', 'consumables', 'labor', 'other'];
  const overheadCost = Object.entries(stats.by_category || {})
    .filter(([cat]) => overheadCats.includes(cat))
    .reduce((sum, [, d]) => sum + d.amount, 0);
  const overheadPct = totalAmount > 0 ? ((overheadCost / totalAmount) * 100).toFixed(0) : '0';

  const insights: { icon: string; text: React.ReactNode }[] = [];
  if (mostExpensiveCategory)
    insights.push({
      icon: '📊',
      text: (
        <>
          Most spending in <strong className="capitalize">{mostExpensiveCategory[0]}</strong> (
          {formatCurrency(mostExpensiveCategory[1].amount)})
        </>
      ),
    });
  if (topVendor)
    insights.push({
      icon: '🪀',
      text: (
        <>
          Top vendor: <strong>{topVendor[0]}</strong> ({formatCurrency(topVendor[1].amount)} across{' '}
          {topVendor[1].count} purchases)
        </>
      ),
    });
  if (giftValue > 0)
    insights.push({ icon: '🎁', text: <>Gifts received: {formatCurrency(giftValue)} value ({giftPct}% of total)</> });
  if (overheadCost > 0)
    insights.push({ icon: '📦', text: <>Overhead costs: {formatCurrency(overheadCost)} ({overheadPct}% of total)</> });
  if (valueStats)
    insights.push({
      icon: '💎',
      text: (
        <>
          Total value vs cost: {formatCurrency(valueStats.totalValue)} value from {formatCurrency(totalAmount)} spent
        </>
      ),
    });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Statistics" subtitle="Spending patterns, category breakdowns, and cost trends." />

      <section>
        <Typography type="h6" className="mb-3 text-foreground">
          💰 Spending Summary
        </Typography>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Spend" value={formatCurrency(totalAmount)} />
          <StatCard label="This Year" value={formatCurrency(thisYearAmount)} />
          <StatCard label="Total Records" value={String(totalRecords)} />
          <StatCard label="Avg per Record" value={formatCurrency(avgCost)} />
        </div>
      </section>

      <section>
        <Typography type="h6" className="mb-3 text-foreground">
          💎 Value Summary
        </Typography>
        {valueStats ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Value" value={formatCurrency(valueStats.totalValue)} />
            <StatCard label="Halloween" value={formatCurrency(valueStats.bySeason['Halloween'] || 0)} />
            <StatCard label="Christmas" value={formatCurrency(valueStats.bySeason['Christmas'] || 0)} />
            <StatCard label="Shared" value={formatCurrency(valueStats.bySeason['Shared'] || 0)} />
          </div>
        ) : (
          <p className="text-default-500">Value data unavailable</p>
        )}
      </section>

      <section>
        <Typography type="h6" className="mb-1 text-foreground">
          💸 Spending by Category
        </Typography>
        <p className="mb-3 text-small text-default-500">Click a category to filter records</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map(([category, d]) => (
            <Card
              key={category}
              isPressable
              isHoverable
              shadow="sm"
              className="bg-content1"
              onPress={() => navigate(`/records?category=${encodeURIComponent(category)}`)}
            >
              <CardBody className="gap-1">
                <span className="capitalize text-foreground">{category}</span>
                <span className="text-xl font-semibold text-foreground">{formatCurrency(d.amount)}</span>
                <span className="text-tiny text-default-500">
                  {d.count} record{d.count !== 1 ? 's' : ''}
                </span>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {insights.length > 0 && (
        <section>
          <Typography type="h6" className="mb-3 text-foreground">
            🏆 Insights
          </Typography>
          <Card shadow="sm" className="bg-content1">
            <CardBody className="gap-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-center gap-3 text-small text-foreground">
                  <span>{ins.icon}</span>
                  <span>{ins.text}</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarList title="By Cost Type" rows={types} />
        <BarList title="Top 5 Vendors" rows={topVendors} />
      </section>
    </div>
  );
}
