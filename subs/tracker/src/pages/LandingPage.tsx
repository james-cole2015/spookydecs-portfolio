import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { List, Diamond, Plus, GanttChartSquare, type LucideIcon } from 'lucide-react';
import { PageHeader, Typography } from '@spookydecs/ui';

interface HubCard {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
}

// The 3 hub cards, ported from the vanilla landing.js (Issues / Epics / Create).
const CARDS: HubCard[] = [
  { id: 'issues', icon: List, title: 'Issues', description: 'Browse all issues across epics.', route: '/priority' },
  { id: 'epics', icon: Diamond, title: 'Epics', description: 'Browse and manage epics with progress tracking.', route: '/epics' },
  { id: 'timeline', icon: GanttChartSquare, title: 'Timeline', description: 'See epics in sequence and drill into their issues.', route: '/timeline' },
  { id: 'create', icon: Plus, title: 'Create Issue', description: 'Log a new issue and assign it to an epic.', route: '/new-issue' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Tracker" subtitle="Issue and epic management" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Card
            key={card.id}
            isPressable
            isHoverable
            shadow="md"
            onPress={() => navigate(card.route)}
            className="bg-content1"
          >
            <CardHeader className="flex items-center gap-3 pb-0">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
                <card.icon size={22} />
              </span>
              <Typography type="h5" className="text-foreground">{card.title}</Typography>
            </CardHeader>
            <CardBody>
              <Typography type="body-sm" className="text-default-500">{card.description}</Typography>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
