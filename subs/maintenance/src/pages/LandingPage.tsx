import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { PageHeader, Typography, Breadcrumbs } from '@spookydecs/ui';

const CARDS = [
  {
    id: 'records',
    icon: '🔧',
    title: 'Maintenance Records',
    description:
      'View, filter, and manage all maintenance records. Track repairs, inspections, and routine maintenance across items.',
    route: '/records',
  },
  {
    id: 'schedules',
    icon: '📅',
    title: 'Schedules',
    description:
      'Browse and manage maintenance schedules. Create reusable templates and apply them to items.',
    route: '/schedules',
  },
  {
    id: 'items',
    icon: '🏷️',
    title: 'Items',
    description: 'Browse all items with associated maintenance history and record summaries.',
    route: '/items',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Breadcrumbs crumbs={[{ label: 'Maintenance' }]} />
      <PageHeader title="Maintenance" subtitle="Track maintenance records, manage schedules, and browse items." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Card
            key={card.id}
            isPressable
            isHoverable
            onPress={() => navigate(card.route)}
            className="h-full"
          >
            <CardHeader className="flex items-center gap-3">
              <span className="text-3xl">{card.icon}</span>
              <Typography type="h4">{card.title}</Typography>
            </CardHeader>
            <CardBody>
              <Typography type="body-sm" className="text-default-500">
                {card.description}
              </Typography>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
