import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '@heroui/react';
import { Package, Plus, BarChart3, Luggage, Ruler, Search, type LucideIcon } from 'lucide-react';
import { PageHeader, Typography } from '@spookydecs/ui';

interface HubCard {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
}

const CARDS: HubCard[] = [
  { id: 'totes', icon: Package, title: 'Totes', description: 'Browse and manage all storage units. Filter by season, location, and packing status.', route: '/storage' },
  { id: 'create', icon: Plus, title: 'Create Storage', description: 'Add a new storage unit to the inventory with photos and location details.', route: '/new' },
  { id: 'statistics', icon: BarChart3, title: 'Statistics', description: 'Overview of storage units and items by season. Track unpacked inventory at a glance.', route: '/statistics' },
  { id: 'pack', icon: Luggage, title: 'Packing Wizard', description: 'Step through the packing workflow to assign items to storage units efficiently.', route: '/storage/pack' },
  { id: 'non-packable', icon: Ruler, title: 'Large & Oversized', description: 'Track oversized items stored directly by location — not packed in totes or boxes.', route: '/storage/non-packable' },
  { id: 'unpacked', icon: Search, title: 'Unpacked Items', description: 'Post-pack audit — see which items are not yet in storage, scoped by season.', route: '/storage/unpacked' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader
        title="Storage"
        subtitle="Manage storage units, pack items, and track inventory across all seasons."
      />
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
