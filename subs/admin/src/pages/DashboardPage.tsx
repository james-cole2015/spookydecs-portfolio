/**
 * Dashboard — the admin landing page. Action Center + Iris panel side by side,
 * System Map full-width below. Ported from pages/dashboard.js (same layout; the
 * components now own their own data loading instead of the page orchestrating it).
 */
import { Button } from '@heroui/react';
import { Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@spookydecs/ui';
import { ActionCenter } from '../components/ActionCenter';
import { IrisPanel } from '../components/IrisPanel';
import { SystemMap } from '../components/SystemMap';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="SpookyDecs Admin"
        subtitle="Operational overview across every subdomain."
        actions={
          <Button color="primary" variant="flat" startContent={<Camera size={16} />} onPress={() => navigate('/place-photo')}>
            Place photo
          </Button>
        }
      />
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
