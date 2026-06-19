import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '@spookydecs/ui';
import { Button } from '@heroui/react';

export default function DetailPlaceholderPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  return (
    <div className="flex flex-col items-center gap-4">
      <EmptyState icon="📦" title="Deployment Detail" message={`Viewing: ${id}`} />
      <Button variant="flat" onPress={() => navigate('/deployments')}>
        ← Back to Deployments
      </Button>
    </div>
  );
}
