import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@spookydecs/ui';
import { Button } from '@heroui/react';

export default function GraphsPlaceholderPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState icon="📊" title="Deployment Graphs" message="Coming soon…" />
      <Button variant="flat" onPress={() => navigate('/deployments')}>
        ← Back to Deployments
      </Button>
    </div>
  );
}
