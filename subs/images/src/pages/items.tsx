/**
 * Items — placeholder "coming soon" page. Route preserved verbatim
 * (/images/items) so existing deep links don't break (#336).
 */
import { Button } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, EmptyState } from '@spookydecs/ui';

export default function Items() {
  const navigate = useNavigate();
  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Images', to: '/images' }, { label: 'Items' }]} />
      <EmptyState icon="📦" title="Items" message="Items page coming soon." />
      <div className="flex justify-center">
        <Button variant="flat" onPress={() => navigate('/images')}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}
