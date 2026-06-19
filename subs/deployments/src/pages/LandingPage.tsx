import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardFooter, CardHeader, Chip } from '@heroui/react';
import { Hammer, History, BarChart3, TrendingUp } from 'lucide-react';
import { PageHeader } from '@spookydecs/ui';
import type { ReactNode } from 'react';

interface OptionCard {
  id: string;
  Icon: typeof Hammer;
  title: string;
  description: string;
  active: boolean;
  route: string;
}

const CARDS: OptionCard[] = [
  {
    id: 'builder',
    Icon: Hammer,
    title: 'Deployment Builder',
    description:
      'Create and manage seasonal deployments by selecting items and organizing them into zones. Track deployment sessions and manage item placement throughout your display.',
    active: true,
    route: '/deployments/builder',
  },
  {
    id: 'historical',
    Icon: History,
    title: 'Historical Deployments',
    description:
      'Browse past deployments and review how your displays have evolved over time. Filter by season and year to find specific deployment records.',
    active: true,
    route: '/deployments/historical',
  },
  {
    id: 'graphs',
    Icon: BarChart3,
    title: 'Deployment Graphs',
    description:
      'Visualize deployment trends and patterns with interactive charts. Analyze item usage, deployment timelines, and seasonal comparisons.',
    active: false,
    route: '/deployments/graphs',
  },
  {
    id: 'stats',
    Icon: TrendingUp,
    title: 'Deployment Stats',
    description:
      'View comprehensive statistics about your deployments including average times, item counts, and performance metrics across all seasons.',
    active: true,
    route: '/deployments/stats',
  },
];

function OptionCardView({ card }: { card: OptionCard }): ReactNode {
  const navigate = useNavigate();
  const { Icon } = card;
  return (
    <Card
      isPressable={card.active}
      isHoverable={card.active}
      onPress={card.active ? () => navigate(card.route) : undefined}
      className={`h-full ${card.active ? '' : 'opacity-60'}`}
    >
      <CardHeader className="flex items-start justify-between gap-2">
        <span className="text-secondary">
          <Icon size={32} />
        </span>
        <Chip size="sm" variant="flat" color={card.active ? 'success' : 'default'}>
          {card.active ? 'Available' : 'Coming Soon'}
        </Chip>
      </CardHeader>
      <CardBody className="pt-0">
        <h3 className="text-lg font-semibold text-foreground">{card.title}</h3>
      </CardBody>
      <CardFooter className="pt-0">
        <p className="text-sm text-default-500">{card.description}</p>
      </CardFooter>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <>
      <PageHeader
        title="Deployment Management"
        subtitle="Manage your seasonal deployments, track historical data, and analyze performance metrics."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <OptionCardView key={card.id} card={card} />
        ))}
      </div>
    </>
  );
}
