/**
 * Dashboard — the admin landing page. Action Center + Iris panel side by side,
 * System Map full-width below. Ported from pages/dashboard.js (same layout; the
 * components now own their own data loading instead of the page orchestrating it).
 */
import { PageHeader } from '@spookydecs/ui';
import { ActionCenter } from '../components/ActionCenter';
import { IrisPanel } from '../components/IrisPanel';
import { SystemMap } from '../components/SystemMap';

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="SpookyDecs Admin" subtitle="Operational overview across every subdomain." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActionCenter />
        </div>
        <div>
          <IrisPanel />
        </div>
      </div>
      <SystemMap />
    </div>
  );
}
