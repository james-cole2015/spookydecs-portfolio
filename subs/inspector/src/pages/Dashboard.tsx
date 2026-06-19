/**
 * Dashboard — inspector landing. Stats strip + tabbed views (By Rule / By Item /
 * Orphaned-soon). Tab state lives in the URL (`?tab=`) via useSearchParams,
 * preserving the vanilla deep-link behaviour.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, Tab, Button } from '@heroui/react';
import { PageHeader, LoadingState, ErrorState, useToast } from '@spookydecs/ui';
import { Search } from 'lucide-react';
import { InspectorAPI } from '../api/inspectorApi';
import type { Rule, Violation } from '../config/inspectorConfig';
import { StatsBar } from '../components/StatsBar';
import { RulesList } from '../components/RulesList';
import { ItemViolationsView } from '../components/ItemViolationsView';

interface StatsShape {
  total_open?: number;
  by_resolution_mode?: Record<string, number>;
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const tab = searchParams.get('tab') || 'by-rule';

  const [stats, setStats] = useState<StatsShape | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, rulesData, violationsData] = await Promise.all([
        InspectorAPI.getStats().catch(() => null),
        InspectorAPI.getRules(),
        InspectorAPI.getAllViolations(),
      ]);
      setStats(statsData);
      setRules(rulesData.rules || []);
      setViolations(violationsData || []);
    } catch (e) {
      setError((e as Error).message);
      toast.showError('Failed to load inspector data');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  function setTab(key: string) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (key === 'by-rule') next.delete('tab');
        else next.set('tab', key);
        return next;
      },
      { replace: true },
    );
  }

  return (
    <div>
      <PageHeader
        title="System Inspector"
        icon={<Search size={24} />}
        subtitle="Data-quality violations surfaced by the Inspector Gadget pipeline."
        actions={
          <Button isDisabled title="Coming soon" color="primary">
            Run Scan
          </Button>
        }
      />

      {loading ? (
        <LoadingState label="Loading Inspector…" />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : (
        <>
          <StatsBar stats={stats} />

          <Tabs
            aria-label="Inspector views"
            selectedKey={tab}
            onSelectionChange={(key) => setTab(String(key))}
            className="mb-4"
          >
            <Tab key="by-rule" title="By Rule">
              <RulesList rules={rules} violations={violations} onReload={load} />
            </Tab>
            <Tab key="by-item" title="By Item">
              <ItemViolationsView violations={violations} />
            </Tab>
            <Tab key="orphaned" title="Orphaned Resources" isDisabled>
              <div className="py-16 text-center text-default-500">
                <h2 className="text-lg font-semibold text-foreground">Orphaned Resources</h2>
                <p>This feature is coming soon!</p>
              </div>
            </Tab>
          </Tabs>
        </>
      )}
    </div>
  );
}
