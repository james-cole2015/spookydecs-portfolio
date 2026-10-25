/**
 * Dashboard — the admin landing page. Action Center + Iris panel side by side,
 * System Map full-width below. Ported from pages/dashboard.js (same layout; the
 * components now own their own data loading instead of the page orchestrating it).
 */
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { Camera, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, isDemoEnv } from '@spookydecs/ui';
import { ActionCenter } from '../components/ActionCenter';
import { IrisPanel } from '../components/IrisPanel';
import { SystemMap } from '../components/SystemMap';
import { overallStatus } from '../config/validationRegistry';

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
      {!isDemoEnv() && <ValidationCard onOpen={() => navigate('/validation')} />}
      <SystemMap />
    </div>
  );
}

function ValidationCard({ onOpen }: { onOpen: () => void }) {
  const { passing, total, latest } = overallStatus();
  return (
    <Card isPressable onPress={onOpen} shadow="sm" className="mt-4 w-full bg-content1">
      <CardBody className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <ClipboardCheck size={22} className="mt-0.5 text-primary" aria-hidden />
          <div className="text-left">
            <p className="font-semibold text-foreground">Run Validation</p>
            <p className="text-small text-default-500">Check that each sub still works end to end before the season.</p>
          </div>
        </div>
        <Chip color={passing === total ? 'success' : 'warning'} variant="flat">
          {passing} of {total} passing · last run {latest}
        </Chip>
      </CardBody>
    </Card>
  );
}
